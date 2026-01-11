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
   * Check if we're in an edge/serverless runtime that doesn't support Node.js fs
   */
  private isEdgeRuntime(): boolean {
    // Vercel Edge Runtime
    if (typeof globalThis !== 'undefined' && 'EdgeRuntime' in globalThis) {
      return true;
    }
    // Cloudflare Workers
    if (typeof globalThis !== 'undefined' && 'caches' in globalThis && 'default' in (globalThis as any).caches) {
      return true;
    }
    // Deno
    if (typeof globalThis !== 'undefined' && 'Deno' in globalThis) {
      return true;
    }
    // Next.js edge runtime indicator
    if (typeof process !== 'undefined' && process.env?.NEXT_RUNTIME === 'edge') {
      return true;
    }
    return false;
  }

  /**
   * Load a file as ArrayBuffer, handling both compressed and uncompressed
   */
  private async loadArrayBuffer(filename: string): Promise<ArrayBuffer> {
    const path = this.dicPath + filename;
    let buffer: ArrayBuffer;

    // Use Node.js fs only if:
    // 1. It's a local path (not http/https)
    // 2. We're in Node.js (not browser)
    // 3. We're NOT in an edge/serverless runtime
    const shouldUseNodeFs =
      this.isLocalPath &&
      typeof process !== 'undefined' &&
      process.versions?.node &&
      !this.isEdgeRuntime();

    if (shouldUseNodeFs) {
      try {
        // Dynamic import of Node.js modules - wrapped in try-catch for bundler compatibility
        const fs = await import(/* webpackIgnore: true */ 'fs/promises');
        const nodePath = await import(/* webpackIgnore: true */ 'path');
        const resolvedPath = nodePath.resolve(path);
        const fileBuffer = await fs.readFile(resolvedPath);
        buffer = fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength
        );
      } catch {
        // If fs import fails (e.g., bundled for browser), fall back to fetch
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
        }
        buffer = await response.arrayBuffer();
      }
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
