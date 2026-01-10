import { DynamicDictionaries } from '../dict/DynamicDictionaries.js';

/**
 * DictionaryLoader - loads dictionary files using fetch (works in browser, Node, and serverless)
 * Also supports local file paths in Node.js
 */
export class DictionaryLoader {
  dic: DynamicDictionaries;
  dicPath: string;
  private isLocalPath: boolean;

  constructor(dicPath: string) {
    this.dic = new DynamicDictionaries();
    this.dicPath = dicPath.endsWith('/') ? dicPath : dicPath + '/';
    // Detect if this is a local file path (not a URL)
    this.isLocalPath = !dicPath.startsWith('http://') && !dicPath.startsWith('https://');
  }

  /**
   * Load a file as ArrayBuffer, handling both compressed and uncompressed
   */
  private async loadArrayBuffer(filename: string): Promise<ArrayBuffer> {
    const path = this.dicPath + filename;
    let buffer: ArrayBuffer;

    if (this.isLocalPath && typeof process !== 'undefined' && process.versions?.node) {
      // Node.js environment with local path - use fs
      const fs = await import('fs/promises');
      const nodePath = await import('path');
      const resolvedPath = nodePath.resolve(path);
      const fileBuffer = await fs.readFile(resolvedPath);
      buffer = fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      );
    } else {
      // Browser/serverless or remote URL - use fetch
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
      }
      buffer = await response.arrayBuffer();
    }

    // Check if gzipped (magic bytes 1f 8b)
    const bytes = new Uint8Array(buffer);
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      // Decompress using pako
      const pako = await import('pako');
      const decompressed = pako.inflate(bytes);
      return decompressed.buffer;
    }

    return buffer;
  }

  /**
   * Load all dictionary files
   */
  async load(): Promise<DynamicDictionaries> {
    // Load all files in parallel
    const [
      baseBuffer,
      checkBuffer,
      tidBuffer,
      tidPosBuffer,
      tidMapBuffer,
      ccBuffer,
      unkBuffer,
      unkPosBuffer,
      unkMapBuffer,
      unkCharBuffer,
      unkCompatBuffer,
      unkInvokeBuffer,
    ] = await Promise.all([
      // TRIE
      this.loadArrayBuffer('base.dat.gz').catch(() => this.loadArrayBuffer('base.dat')),
      this.loadArrayBuffer('check.dat.gz').catch(() => this.loadArrayBuffer('check.dat')),
      // Token info
      this.loadArrayBuffer('tid.dat.gz').catch(() => this.loadArrayBuffer('tid.dat')),
      this.loadArrayBuffer('tid_pos.dat.gz').catch(() => this.loadArrayBuffer('tid_pos.dat')),
      this.loadArrayBuffer('tid_map.dat.gz').catch(() => this.loadArrayBuffer('tid_map.dat')),
      // Connection costs
      this.loadArrayBuffer('cc.dat.gz').catch(() => this.loadArrayBuffer('cc.dat')),
      // Unknown words
      this.loadArrayBuffer('unk.dat.gz').catch(() => this.loadArrayBuffer('unk.dat')),
      this.loadArrayBuffer('unk_pos.dat.gz').catch(() => this.loadArrayBuffer('unk_pos.dat')),
      this.loadArrayBuffer('unk_map.dat.gz').catch(() => this.loadArrayBuffer('unk_map.dat')),
      this.loadArrayBuffer('unk_char.dat.gz').catch(() => this.loadArrayBuffer('unk_char.dat')),
      this.loadArrayBuffer('unk_compat.dat.gz').catch(() =>
        this.loadArrayBuffer('unk_compat.dat')
      ),
      this.loadArrayBuffer('unk_invoke.dat.gz').catch(() =>
        this.loadArrayBuffer('unk_invoke.dat')
      ),
    ]);

    // Load TRIE
    await this.dic.loadTrie(new Int32Array(baseBuffer), new Int32Array(checkBuffer));

    // Load token info dictionaries
    this.dic.loadTokenInfoDictionaries(
      new Uint8Array(tidBuffer),
      new Uint8Array(tidPosBuffer),
      new Uint8Array(tidMapBuffer)
    );

    // Load connection costs
    this.dic.loadConnectionCosts(new Int16Array(ccBuffer));

    // Load unknown word dictionaries
    this.dic.loadUnknownDictionaries(
      new Uint8Array(unkBuffer),
      new Uint8Array(unkPosBuffer),
      new Uint8Array(unkMapBuffer),
      new Uint8Array(unkCharBuffer),
      new Uint32Array(unkCompatBuffer),
      new Uint8Array(unkInvokeBuffer)
    );

    return this.dic;
  }
}
