import { ByteBuffer } from '../util/ByteBuffer.js';

/**
 * TokenInfoDictionary - dictionary for known tokens
 */
export class TokenInfoDictionary {
  dictionary: ByteBuffer;
  targetMap: Record<number, number[]>;
  posBuffer: ByteBuffer;

  constructor() {
    this.dictionary = new ByteBuffer(10 * 1024 * 1024);
    this.targetMap = {}; // trie_id (of surface form) -> token_info_id (of token)
    this.posBuffer = new ByteBuffer(10 * 1024 * 1024);
  }

  /**
   * Build dictionary from entries
   * Entry format: [surface, left_id, right_id, word_cost, ...features]
   */
  buildDictionary(
    entries: (string | number)[][]
  ): Record<number, string> {
    const dictionaryEntries: Record<number, string> = {};

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if (entry.length < 4) {
        continue;
      }

      const surfaceForm = entry[0] as string;
      const leftId = entry[1] as number;
      const rightId = entry[2] as number;
      const wordCost = entry[3] as number;
      const feature = entry.slice(4).join(',');

      if (!isFinite(leftId) || !isFinite(rightId) || !isFinite(wordCost)) {
        console.log(entry);
        continue;
      }

      const tokenInfoId = this.put(leftId, rightId, wordCost, surfaceForm, feature);
      dictionaryEntries[tokenInfoId] = surfaceForm;
    }

    this.dictionary.shrink();
    this.posBuffer.shrink();

    return dictionaryEntries;
  }

  put(
    leftId: number,
    rightId: number,
    wordCost: number,
    surfaceForm: string,
    feature: string
  ): number {
    const tokenInfoId = this.dictionary.position;
    const posId = this.posBuffer.position;

    this.dictionary.putShort(leftId);
    this.dictionary.putShort(rightId);
    this.dictionary.putShort(wordCost);
    this.dictionary.putInt(posId);
    this.posBuffer.putString(surfaceForm + ',' + feature);

    return tokenInfoId;
  }

  addMapping(source: number, target: number): void {
    let mapping = this.targetMap[source];
    if (mapping == null) {
      mapping = [];
    }
    mapping.push(target);
    this.targetMap[source] = mapping;
  }

  targetMapToBuffer(): Uint8Array {
    const buffer = new ByteBuffer();
    const mapKeysSize = Object.keys(this.targetMap).length;
    buffer.putInt(mapKeysSize);

    for (const key in this.targetMap) {
      const values = this.targetMap[parseInt(key, 10)];
      const mapValuesSize = values.length;
      buffer.putInt(parseInt(key, 10));
      buffer.putInt(mapValuesSize);
      for (let i = 0; i < values.length; i++) {
        buffer.putInt(values[i]);
      }
    }

    return buffer.shrink();
  }

  // Load from tid.dat
  loadDictionary(arrayBuffer: Uint8Array | ArrayBuffer): this {
    this.dictionary = new ByteBuffer(
      arrayBuffer instanceof ArrayBuffer ? new Uint8Array(arrayBuffer) : arrayBuffer
    );
    return this;
  }

  // Load from tid_pos.dat
  loadPosVector(arrayBuffer: Uint8Array | ArrayBuffer): this {
    this.posBuffer = new ByteBuffer(
      arrayBuffer instanceof ArrayBuffer ? new Uint8Array(arrayBuffer) : arrayBuffer
    );
    return this;
  }

  // Load from tid_map.dat
  loadTargetMap(arrayBuffer: Uint8Array | ArrayBuffer): this {
    const buffer = new ByteBuffer(
      arrayBuffer instanceof ArrayBuffer ? new Uint8Array(arrayBuffer) : arrayBuffer
    );
    buffer.position = 0;
    this.targetMap = {};
    buffer.readInt(); // map_keys_size

    while (true) {
      if (buffer.buffer.length < buffer.position + 1) {
        break;
      }
      const key = buffer.readInt();
      const mapValuesSize = buffer.readInt();
      for (let i = 0; i < mapValuesSize; i++) {
        const value = buffer.readInt();
        this.addMapping(key, value);
      }
    }
    return this;
  }

  /**
   * Look up features in the dictionary
   */
  getFeatures(tokenInfoIdStr: string | number): string {
    const tokenInfoId =
      typeof tokenInfoIdStr === 'string' ? parseInt(tokenInfoIdStr, 10) : tokenInfoIdStr;

    if (isNaN(tokenInfoId)) {
      return '';
    }

    const posId = this.dictionary.getInt(tokenInfoId + 6);
    return this.posBuffer.getString(posId);
  }
}
