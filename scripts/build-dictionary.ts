#!/usr/bin/env tsx
/**
 * Dictionary Builder for mecab-ko
 *
 * Converts mecab-ko-dic source files to binary format for the tokenizer.
 *
 * mecab-ko-dic CSV format:
 * surface,left_id,right_id,cost,pos,semantic,jongseong,reading,type,first_pos,last_pos,expression
 *
 * Usage:
 *   npx tsx scripts/build-dictionary.ts ./mecab-ko-dic ./dict
 */

import fs from 'fs/promises';
import path from 'path';
import { gzip } from 'pako';

const MECAB_KO_DIC_PATH = process.argv[2] || './mecab-ko-dic';
const OUTPUT_PATH = process.argv[3] || './dict';
const FREQUENCY_LIST_PATH = process.argv[4] || './frequency-list.json';
const EXISTING_DICT_PATH = process.argv[5] || './dict-original'; // For files we can't regenerate

// Frequency data for cost adjustment
let frequencyMap: Map<string, number> = new Map();

const VERB_TAGS = ['VV', 'VA', 'VX', 'VCP', 'VCN'];

/**
 * Load frequency list and create lookup map
 */
async function loadFrequencyList(freqPath: string): Promise<void> {
  try {
    const content = await fs.readFile(freqPath, 'utf-8');
    const data: Array<{ rank: number; word: string }> = JSON.parse(content);

    for (const item of data) {
      frequencyMap.set(item.word, item.rank);
    }
    console.log(`Loaded ${frequencyMap.size} frequency entries`);
  } catch (err) {
    console.log('No frequency list found, using default costs');
  }
}

/**
 * Known ambiguous verb pairs where frequency should determine preference.
 * Key: common verb lemma, Value: rare verb lemma that shares conjugated forms
 */
const AMBIGUOUS_VERB_PAIRS: Map<string, string[]> = new Map([
  ['자다', ['잣다']], // sleep vs measure grain (자)
  ['가다', ['갈다']], // go vs grind (가)
  ['사다', ['살다']], // buy vs live (사) - though both common
  ['서다', ['섣다']], // stand vs be premature
  ['타다', ['탈다']], // ride vs burn off
  ['차다', ['찰다']], // kick vs be cold
  ['나다', ['날다']], // occur vs fly (나)
  ['보다', ['볻다']], // see vs (rare)
]);

// Build reverse lookup: rare verb -> common verb
const RARE_TO_COMMON: Map<string, string> = new Map();
for (const [common, rares] of AMBIGUOUS_VERB_PAIRS) {
  for (const rare of rares) {
    RARE_TO_COMMON.set(rare, common);
  }
}

/**
 * Calculate cost adjustment for ambiguous verb pairs only.
 * This is a targeted fix that only affects known problematic cases.
 */
function getCostAdjustment(word: string, pos: string): number {
  // Only apply to verbs
  const isVerb = VERB_TAGS.some((tag) => pos.startsWith(tag));
  if (!isVerb) {
    return 0;
  }

  // Check if this is a known common verb that has a rare homophone
  if (AMBIGUOUS_VERB_PAIRS.has(word)) {
    const rank = frequencyMap.get(word);
    if (rank !== undefined && rank < 500) {
      return -300; // Boost common verb
    }
  }

  // Check if this is a known rare verb that has a common homophone
  if (RARE_TO_COMMON.has(word)) {
    const commonVerb = RARE_TO_COMMON.get(word)!;
    const commonRank = frequencyMap.get(commonVerb);
    const rareRank = frequencyMap.get(word);

    // If common verb is much more frequent, penalize the rare one
    if (commonRank !== undefined && commonRank < 500) {
      if (rareRank === undefined || rareRank > 10000) {
        return 500; // Penalize rare verb
      }
    }
  }

  return 0; // No adjustment for most verbs
}

/**
 * Extract the lemma (dictionary form) from an entry
 * For verbs, this adds 다 to the stem
 */
function extractLemma(entry: DictionaryEntry): string | null {
  const pos = entry.features[0]; // First feature is POS
  const expression = entry.features[7]; // expression field

  // For inflected forms, extract the base morpheme from expression
  if (expression && expression !== '*') {
    // Expression format: "하/VV/*+아/EC/*" - extract first morpheme
    const firstPart = expression.split('+')[0];
    const [morpheme, morphPos] = firstPart.split('/');

    if (morphPos && VERB_TAGS.includes(morphPos)) {
      return morpheme + '다';
    }
  }

  // For simple verb entries
  const basePos = pos.split('+')[0];
  if (VERB_TAGS.includes(basePos)) {
    return entry.surface + '다';
  }

  // For non-verbs, just return the surface
  return entry.surface;
}

interface DictionaryEntry {
  surface: string;
  left_id: number;
  right_id: number;
  word_cost: number;
  features: string[];
}

interface MatrixDef {
  forwardSize: number;
  backwardSize: number;
  costs: Array<{ right_id: number; left_id: number; cost: number }>;
}

interface CharDef {
  categories: Map<string, { invoke: number; group: number; length: number }>;
  mappings: Array<{ start: number; end: number; categories: string[] }>;
}

/**
 * Parse a mecab-ko-dic CSV line
 */
function parseLine(line: string): DictionaryEntry | null {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  if (parts.length < 12) {
    return null;
  }

  return {
    surface: parts[0],
    left_id: parseInt(parts[1], 10),
    right_id: parseInt(parts[2], 10),
    word_cost: parseInt(parts[3], 10),
    features: [
      parts[4], // pos
      parts[5], // semantic_class
      parts[6], // has_final_consonant
      parts[7], // reading
      parts[8], // type
      parts[9], // first_pos
      parts[10], // last_pos
      parts[11], // expression
    ],
  };
}

/**
 * Read and parse all CSV files in the dictionary directory
 */
async function readDictionaryCSVs(dicPath: string): Promise<DictionaryEntry[]> {
  const entries: DictionaryEntry[] = [];
  const files = await fs.readdir(dicPath);

  for (const file of files) {
    if (!file.endsWith('.csv')) continue;

    console.log(`Reading ${file}...`);
    const content = await fs.readFile(path.join(dicPath, file), 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      if (!line.trim() || line.startsWith('#')) continue;

      const entry = parseLine(line);
      if (entry) {
        entries.push(entry);
      }
    }
  }

  console.log(`Total entries: ${entries.length}`);
  return entries;
}

/**
 * Parse matrix.def file for connection costs
 */
async function readMatrixDef(dicPath: string): Promise<MatrixDef> {
  const matrixPath = path.join(dicPath, 'matrix.def');
  const content = await fs.readFile(matrixPath, 'utf-8');
  const lines = content.split('\n');

  const [forwardSize, backwardSize] = lines[0].split(/\s+/).map(Number);
  const costs: Array<{ right_id: number; left_id: number; cost: number }> = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts.length >= 3) {
      costs.push({
        right_id: parseInt(parts[0], 10),
        left_id: parseInt(parts[1], 10),
        cost: parseInt(parts[2], 10),
      });
    }
  }

  return { forwardSize, backwardSize, costs };
}

/**
 * Parse char.def file for character definitions
 */
async function readCharDef(dicPath: string): Promise<CharDef> {
  const charPath = path.join(dicPath, 'char.def');
  const content = await fs.readFile(charPath, 'utf-8');
  const lines = content.split('\n');

  const categories = new Map<string, { invoke: number; group: number; length: number }>();
  const mappings: Array<{ start: number; end: number; categories: string[] }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Category definition: CATEGORY INVOKE GROUP LENGTH
    const catMatch = trimmed.match(/^(\w+)\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (catMatch) {
      categories.set(catMatch[1], {
        invoke: parseInt(catMatch[2], 10),
        group: parseInt(catMatch[3], 10),
        length: parseInt(catMatch[4], 10),
      });
      continue;
    }

    // Code point mapping: 0xXXXX CATEGORY [CATEGORY...]
    // or range: 0xXXXX..0xYYYY CATEGORY [CATEGORY...]
    const rangeMatch = trimmed.match(/^(0x[0-9A-Fa-f]+)\.\.(0x[0-9A-Fa-f]+)\s+(.+)/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 16);
      const end = parseInt(rangeMatch[2], 16);
      const cats = rangeMatch[3].trim().split(/\s+/);
      mappings.push({ start, end, categories: cats });
      continue;
    }

    const singleMatch = trimmed.match(/^(0x[0-9A-Fa-f]+)\s+(.+)/);
    if (singleMatch) {
      const code = parseInt(singleMatch[1], 16);
      const cats = singleMatch[2].trim().split(/\s+/);
      mappings.push({ start: code, end: code, categories: cats });
    }
  }

  return { categories, mappings };
}

/**
 * Parse unk.def file for unknown word handling
 */
async function readUnkDef(
  dicPath: string
): Promise<Array<{ category: string; left_id: number; right_id: number; cost: number; features: string[] }>> {
  const unkPath = path.join(dicPath, 'unk.def');
  const content = await fs.readFile(unkPath, 'utf-8');
  const lines = content.split('\n');
  const entries: Array<{
    category: string;
    left_id: number;
    right_id: number;
    cost: number;
    features: string[];
  }> = [];

  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const entry = parseLine(line);
    if (entry) {
      entries.push({
        category: entry.surface,
        left_id: entry.left_id,
        right_id: entry.right_id,
        cost: entry.word_cost,
        features: entry.features,
      });
    }
  }

  return entries;
}

/**
 * Build Double-Array TRIE from entries
 */
async function buildTrie(entries: DictionaryEntry[]): Promise<{
  base: Int32Array;
  check: Int32Array;
  targetMap: Map<number, number[]>;
}> {
  const doublearrayModule = await import('doublearray');
  const doublearray = doublearrayModule.default || doublearrayModule;

  // Group entries by surface form
  const surfaceMap = new Map<string, number[]>();

  for (let i = 0; i < entries.length; i++) {
    const surface = entries[i].surface;
    if (!surfaceMap.has(surface)) {
      surfaceMap.set(surface, []);
    }
    surfaceMap.get(surface)!.push(i);
  }

  // Build TRIE keys
  const trieData: Array<{ k: string; v: number }> = [];
  let trieId = 0;
  const targetMap = new Map<number, number[]>();

  for (const [surface, indices] of surfaceMap) {
    trieData.push({ k: surface, v: trieId });
    targetMap.set(trieId, indices);
    trieId++;
  }

  // Sort by key for TRIE construction
  trieData.sort((a, b) => {
    if (a.k < b.k) return -1;
    if (a.k > b.k) return 1;
    return 0;
  });

  console.log(`Building TRIE with ${trieData.length} unique surfaces...`);
  const trie = doublearray.builder(1024 * 1024).build(trieData);

  // Extract base and check arrays using the proper methods
  const baseBuffer = trie.bc.getBaseBuffer();
  const checkBuffer = trie.bc.getCheckBuffer();

  return {
    base: new Int32Array(baseBuffer),
    check: new Int32Array(checkBuffer),
    targetMap,
  };
}

/**
 * Build token info dictionary
 */
function buildTokenInfo(entries: DictionaryEntry[]): {
  tid: Buffer;
  tidPos: Buffer;
  tidMap: Buffer;
  targetMap: Map<number, number[]>;
} {
  // First pass: calculate pos offsets and build pos strings
  const posStrings: string[] = [];
  const posOffsets: number[] = [];
  let currentPosOffset = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    posOffsets.push(currentPosOffset);

    // Build pos string: surface,features...
    const posStr = entry.surface + ',' + entry.features.join(',');
    posStrings.push(posStr);
    currentPosOffset += Buffer.byteLength(posStr, 'utf-8') + 1; // +1 for null terminator
  }

  // Create tid buffer - 10 bytes per entry: left_id(2) + right_id(2) + cost(2) + pos_offset(4)
  const tidBuffer = Buffer.alloc(entries.length * 10);
  let tidOffset = 0;
  let adjustedCount = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    // left_id and right_id as signed int16 (values should be < 32768 but let's be safe)
    tidBuffer.writeInt16LE(entry.left_id > 32767 ? entry.left_id - 65536 : entry.left_id, tidOffset);
    tidOffset += 2;
    tidBuffer.writeInt16LE(entry.right_id > 32767 ? entry.right_id - 65536 : entry.right_id, tidOffset);
    tidOffset += 2;

    // Apply frequency-based cost adjustment
    let adjustedCost = entry.word_cost;
    if (frequencyMap.size > 0) {
      const lemma = extractLemma(entry);
      const pos = entry.features[0]; // POS tag
      if (lemma) {
        const adjustment = getCostAdjustment(lemma, pos);
        adjustedCost = entry.word_cost + adjustment;
        if (adjustment !== 0) adjustedCount++; // Count entries that were adjusted
      }
    }

    // Clamp to int16 range
    adjustedCost = Math.max(-32768, Math.min(32767, adjustedCost));

    // cost as signed int16
    const signedCost = adjustedCost > 32767 ? adjustedCost - 65536 : adjustedCost;
    tidBuffer.writeInt16LE(signedCost, tidOffset);
    tidOffset += 2;
    // pos offset as unsigned int32
    tidBuffer.writeUInt32LE(posOffsets[i], tidOffset);
    tidOffset += 4;
  }

  if (frequencyMap.size > 0) {
    console.log(`Applied frequency adjustments to ${adjustedCount} entries`);
  }

  // Create pos buffer
  const posBuffer = Buffer.alloc(currentPosOffset);
  let offset = 0;
  for (const posStr of posStrings) {
    offset += posBuffer.write(posStr + '\0', offset, 'utf-8');
  }

  // Create target map buffer (trie_id -> token_info_ids)
  // This will be created after TRIE is built
  const mapBuffer = Buffer.alloc(0);

  return {
    tid: tidBuffer,
    tidPos: posBuffer,
    tidMap: mapBuffer,
    targetMap: new Map(),
  };
}

/**
 * Build target map buffer from TRIE results
 */
function buildTargetMapBuffer(
  targetMap: Map<number, number[]>,
  tokenInfoOffsets: number[]
): Buffer {
  // Calculate size
  let size = 4; // map_keys_size
  for (const [, indices] of targetMap) {
    size += 4; // key
    size += 4; // values_size
    size += indices.length * 4; // values
  }

  const buffer = Buffer.alloc(size);
  let offset = 0;

  buffer.writeUInt32LE(targetMap.size, offset);
  offset += 4;

  for (const [trieId, entryIndices] of targetMap) {
    buffer.writeUInt32LE(trieId, offset);
    offset += 4;
    buffer.writeUInt32LE(entryIndices.length, offset);
    offset += 4;

    for (const entryIndex of entryIndices) {
      // Write the byte offset into tid buffer (entry index * 10 bytes)
      buffer.writeUInt32LE(entryIndex * 10, offset);
      offset += 4;
    }
  }

  return buffer;
}

/**
 * Build connection costs buffer
 */
function buildConnectionCosts(matrix: MatrixDef): Buffer {
  const { forwardSize, backwardSize, costs } = matrix;

  // Header: forward_size(2) + backward_size(2)
  // Data: forward_size * backward_size * 2 bytes
  const bufferSize = 4 + forwardSize * backwardSize * 2;
  const buffer = Buffer.alloc(bufferSize);

  buffer.writeInt16LE(forwardSize, 0);
  buffer.writeInt16LE(backwardSize, 2);

  // Fill with zeros first
  for (let i = 4; i < bufferSize; i += 2) {
    buffer.writeInt16LE(0, i);
  }

  // Then set actual costs
  for (const { right_id, left_id, cost } of costs) {
    const idx = right_id * backwardSize + left_id;
    buffer.writeInt16LE(cost, 4 + idx * 2);
  }

  return buffer;
}

/**
 * Build unknown word dictionaries
 */
function buildUnknownDictionaries(
  charDef: CharDef,
  unkEntries: Array<{ category: string; left_id: number; right_id: number; cost: number; features: string[] }>
): {
  unk: Buffer;
  unkPos: Buffer;
  unkMap: Buffer;
  unkChar: Buffer;
  unkCompat: Buffer;
  unkInvoke: Buffer;
} {
  // Build category ID lookup
  const categoryIds = new Map<string, number>();
  const categoryList = Array.from(charDef.categories.keys());
  for (let i = 0; i < categoryList.length; i++) {
    categoryIds.set(categoryList[i], i);
  }

  // Build unk.dat and unk_pos.dat (similar to tid)
  const unkData: number[] = [];
  const unkPosStrings: string[] = [];
  let posOffset = 0;

  // Build unk_map (category_id -> unk_ids)
  const unkMap = new Map<number, number[]>();

  for (let i = 0; i < unkEntries.length; i++) {
    const entry = unkEntries[i];
    const categoryId = categoryIds.get(entry.category);
    if (categoryId === undefined) continue;

    const unkId = unkData.length / 5;

    if (!unkMap.has(categoryId)) {
      unkMap.set(categoryId, []);
    }
    unkMap.get(categoryId)!.push(unkId * 10); // byte offset

    unkData.push(entry.left_id & 0xffff);
    unkData.push(entry.right_id & 0xffff);
    unkData.push(entry.cost & 0xffff);
    unkData.push(posOffset & 0xffff);
    unkData.push((posOffset >> 16) & 0xffff);

    const posStr = entry.category + ',' + entry.features.join(',');
    unkPosStrings.push(posStr);
    posOffset += Buffer.byteLength(posStr, 'utf-8') + 1;
  }

  // Create unk buffer - convert unsigned to signed for Int16
  const unkBuffer = Buffer.alloc(unkData.length * 2);
  for (let i = 0; i < unkData.length; i++) {
    const signedValue = unkData[i] > 32767 ? unkData[i] - 65536 : unkData[i];
    unkBuffer.writeInt16LE(signedValue, i * 2);
  }

  // Create unk_pos buffer
  const unkPosBuffer = Buffer.alloc(posOffset);
  let offset = 0;
  for (const posStr of unkPosStrings) {
    offset += unkPosBuffer.write(posStr + '\0', offset, 'utf-8');
  }

  // Create unk_map buffer
  let mapSize = 4;
  for (const [, ids] of unkMap) {
    mapSize += 4 + 4 + ids.length * 4;
  }
  const unkMapBuffer = Buffer.alloc(mapSize);
  offset = 0;
  unkMapBuffer.writeUInt32LE(unkMap.size, offset);
  offset += 4;
  for (const [catId, ids] of unkMap) {
    unkMapBuffer.writeUInt32LE(catId, offset);
    offset += 4;
    unkMapBuffer.writeUInt32LE(ids.length, offset);
    offset += 4;
    for (const id of ids) {
      unkMapBuffer.writeUInt32LE(id, offset);
      offset += 4;
    }
  }

  // Build unk_char.dat (character category map)
  const unkCharBuffer = Buffer.alloc(65536);
  for (const mapping of charDef.mappings) {
    const catId = categoryIds.get(mapping.categories[0]);
    if (catId === undefined) continue;
    for (let code = mapping.start; code <= mapping.end; code++) {
      if (code < 65536) {
        unkCharBuffer[code] = catId;
      }
    }
  }

  // Build unk_compat.dat (compatible category bitmap)
  const unkCompatBuffer = Buffer.alloc(65536 * 4);
  for (const mapping of charDef.mappings) {
    let bitset = 0;
    for (let i = 1; i < mapping.categories.length; i++) {
      const catId = categoryIds.get(mapping.categories[i]);
      if (catId !== undefined) {
        bitset |= 1 << catId;
      }
    }
    for (let code = mapping.start; code <= mapping.end; code++) {
      if (code < 65536) {
        unkCompatBuffer.writeUInt32LE(bitset, code * 4);
      }
    }
  }

  // Build unk_invoke.dat (invoke definition map)
  // Format: for each category: is_always_invoke(1) + is_grouping(1) + max_length(4) + class_name(null-terminated)
  let invokeSize = 0;
  for (const [name, def] of charDef.categories) {
    invokeSize += 1 + 1 + 4 + Buffer.byteLength(name, 'utf-8') + 1;
  }
  const unkInvokeBuffer = Buffer.alloc(invokeSize);
  offset = 0;
  for (const [name, def] of charDef.categories) {
    unkInvokeBuffer.writeUInt8(def.invoke, offset++);
    unkInvokeBuffer.writeUInt8(def.group, offset++);
    unkInvokeBuffer.writeUInt32LE(def.length, offset);
    offset += 4;
    offset += unkInvokeBuffer.write(name + '\0', offset, 'utf-8');
  }

  return {
    unk: unkBuffer,
    unkPos: unkPosBuffer,
    unkMap: unkMapBuffer,
    unkChar: unkCharBuffer,
    unkCompat: unkCompatBuffer,
    unkInvoke: unkInvokeBuffer,
  };
}

/**
 * Write buffer to file with gzip compression
 */
async function writeGzipped(filePath: string, buffer: Buffer | Uint8Array): Promise<void> {
  const compressed = gzip(buffer);
  await fs.writeFile(filePath, compressed);
}

/**
 * Main build process
 */
async function main(): Promise<void> {
  console.log('=== mecab-ko Dictionary Builder ===');
  console.log(`Input: ${MECAB_KO_DIC_PATH}`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(`Frequency list: ${FREQUENCY_LIST_PATH}`);

  // Create output directory
  await fs.mkdir(OUTPUT_PATH, { recursive: true });

  // Load frequency list for cost adjustments
  console.log('\n[0/6] Loading frequency list...');
  await loadFrequencyList(FREQUENCY_LIST_PATH);

  // Read dictionary
  console.log('\n[1/6] Reading dictionary CSVs...');
  const entries = await readDictionaryCSVs(MECAB_KO_DIC_PATH);

  // Read matrix (or copy existing cc.dat.gz if matrix.def not available)
  console.log('\n[2/6] Reading connection costs...');
  let matrix: MatrixDef | null = null;
  let useExistingCc = false;
  try {
    matrix = await readMatrixDef(MECAB_KO_DIC_PATH);
    console.log(`Matrix size: ${matrix.forwardSize} x ${matrix.backwardSize}`);
  } catch {
    console.log('matrix.def not found, will copy existing cc.dat.gz');
    useExistingCc = true;
  }

  // Read char.def
  console.log('\n[3/6] Reading character definitions...');
  const charDef = await readCharDef(MECAB_KO_DIC_PATH);
  console.log(`Character categories: ${charDef.categories.size}`);

  // Read unk.def
  console.log('\n[4/6] Reading unknown word definitions...');
  const unkEntries = await readUnkDef(MECAB_KO_DIC_PATH);
  console.log(`Unknown word entries: ${unkEntries.length}`);

  // Build TRIE
  console.log('\n[5/6] Building TRIE...');
  const { base, check, targetMap } = await buildTrie(entries);
  console.log(`TRIE size: ${base.length} nodes`);

  // Build token info
  console.log('\n[6/6] Building dictionaries...');
  const { tid, tidPos } = buildTokenInfo(entries);
  const tidMap = buildTargetMapBuffer(targetMap, []);
  const unknownDicts = buildUnknownDictionaries(charDef, unkEntries);

  // Write all files
  console.log('\nWriting dictionary files...');

  const writePromises: Promise<void>[] = [
    writeGzipped(path.join(OUTPUT_PATH, 'base.dat.gz'), Buffer.from(base.buffer)),
    writeGzipped(path.join(OUTPUT_PATH, 'check.dat.gz'), Buffer.from(check.buffer)),
    writeGzipped(path.join(OUTPUT_PATH, 'tid.dat.gz'), tid),
    writeGzipped(path.join(OUTPUT_PATH, 'tid_pos.dat.gz'), tidPos),
    writeGzipped(path.join(OUTPUT_PATH, 'tid_map.dat.gz'), tidMap),
    writeGzipped(path.join(OUTPUT_PATH, 'unk.dat.gz'), unknownDicts.unk),
    writeGzipped(path.join(OUTPUT_PATH, 'unk_pos.dat.gz'), unknownDicts.unkPos),
    writeGzipped(path.join(OUTPUT_PATH, 'unk_map.dat.gz'), unknownDicts.unkMap),
    writeGzipped(path.join(OUTPUT_PATH, 'unk_char.dat.gz'), unknownDicts.unkChar),
    writeGzipped(path.join(OUTPUT_PATH, 'unk_compat.dat.gz'), unknownDicts.unkCompat),
    writeGzipped(path.join(OUTPUT_PATH, 'unk_invoke.dat.gz'), unknownDicts.unkInvoke),
  ];

  // Handle connection costs
  if (useExistingCc) {
    // Copy existing cc.dat.gz
    const existingCcPath = path.join(EXISTING_DICT_PATH, 'cc.dat.gz');
    console.log(`Copying ${existingCcPath} to output...`);
    writePromises.push(
      fs.copyFile(existingCcPath, path.join(OUTPUT_PATH, 'cc.dat.gz'))
    );
  } else if (matrix) {
    const ccBuffer = buildConnectionCosts(matrix);
    writePromises.push(writeGzipped(path.join(OUTPUT_PATH, 'cc.dat.gz'), ccBuffer));
  }

  await Promise.all(writePromises);

  console.log('\n=== Build Complete ===');
  console.log(`Files written to ${OUTPUT_PATH}/`);
  console.log('  - base.dat.gz, check.dat.gz (TRIE)');
  console.log('  - tid.dat.gz, tid_pos.dat.gz, tid_map.dat.gz (Token Info)');
  console.log('  - cc.dat.gz (Connection Costs)');
  console.log('  - unk*.dat.gz (Unknown Word Handling)');
}

main().catch(console.error);
