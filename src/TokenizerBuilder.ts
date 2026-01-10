import { Tokenizer } from './Tokenizer.js';
import { DictionaryLoader } from './loader/DictionaryLoader.js';

export interface TokenizerBuilderOptions {
  dicPath?: string;
}

/**
 * TokenizerBuilder - builds a Tokenizer with loaded dictionaries
 */
export class TokenizerBuilder {
  private dicPath: string;

  constructor(options: TokenizerBuilderOptions = {}) {
    this.dicPath = options.dicPath ?? 'dict/';
  }

  /**
   * Build and return the tokenizer (async)
   */
  async build(): Promise<Tokenizer> {
    const loader = new DictionaryLoader(this.dicPath);
    const dic = await loader.load();
    return new Tokenizer(dic);
  }
}
