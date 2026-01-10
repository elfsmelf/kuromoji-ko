import { TokenInfoDictionary } from './TokenInfoDictionary.js';
import { ConnectionCosts } from './ConnectionCosts.js';
import { UnknownDictionary } from './UnknownDictionary.js';

// Type for the doublearray TRIE
export interface DoubleArrayTrie {
  commonPrefixSearch(key: string): Array<{ k: string; v: number }>;
}

/**
 * DynamicDictionaries - container for all dictionaries used by Tokenizer
 */
export class DynamicDictionaries {
  trie: DoubleArrayTrie;
  tokenInfoDictionary: TokenInfoDictionary;
  connectionCosts: ConnectionCosts;
  unknownDictionary: UnknownDictionary;

  constructor(
    trie?: DoubleArrayTrie | null,
    tokenInfoDictionary?: TokenInfoDictionary | null,
    connectionCosts?: ConnectionCosts | null,
    unknownDictionary?: UnknownDictionary | null
  ) {
    // Default empty trie
    this.trie = trie ?? {
      commonPrefixSearch: () => [],
    };

    this.tokenInfoDictionary = tokenInfoDictionary ?? new TokenInfoDictionary();
    this.connectionCosts = connectionCosts ?? new ConnectionCosts(0, 0);
    this.unknownDictionary = unknownDictionary ?? new UnknownDictionary();
  }

  // Load from base.dat & check.dat
  async loadTrie(baseBuffer: Int32Array, checkBuffer: Int32Array): Promise<this> {
    // Dynamic import doublearray (ESM compatible)
    const doublearrayModule = await import('doublearray');
    const doublearray = doublearrayModule.default || doublearrayModule;
    this.trie = doublearray.load(baseBuffer, checkBuffer);
    return this;
  }

  loadTokenInfoDictionaries(
    tokenInfoBuffer: Uint8Array,
    posBuffer: Uint8Array,
    targetMapBuffer: Uint8Array
  ): this {
    this.tokenInfoDictionary.loadDictionary(tokenInfoBuffer);
    this.tokenInfoDictionary.loadPosVector(posBuffer);
    this.tokenInfoDictionary.loadTargetMap(targetMapBuffer);
    return this;
  }

  loadConnectionCosts(ccBuffer: Int16Array): this {
    this.connectionCosts.loadConnectionCosts(ccBuffer);
    return this;
  }

  loadUnknownDictionaries(
    unkBuffer: Uint8Array,
    unkPosBuffer: Uint8Array,
    unkMapBuffer: Uint8Array,
    catMapBuffer: Uint8Array,
    compatCatMapBuffer: Uint32Array,
    invokeDefBuffer: Uint8Array
  ): this {
    this.unknownDictionary.loadUnknownDictionaries(
      unkBuffer,
      unkPosBuffer,
      unkMapBuffer,
      catMapBuffer,
      compatCatMapBuffer,
      invokeDefBuffer
    );
    return this;
  }
}
