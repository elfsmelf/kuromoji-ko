/**
 * MeCab - napi-mecab compatible API wrapper
 *
 * Provides a familiar API for users coming from napi-mecab.
 * Uses async initialization since this is a pure JavaScript implementation.
 */

import { Tokenizer } from './Tokenizer.js';
import { TokenizerBuilder } from './TokenizerBuilder.js';
import { Token } from './Token.js';

export interface MeCabOptions {
  /**
   * The language engine to use. Only 'ko' (Korean) is supported.
   * @default 'ko'
   */
  engine?: 'ko';
  /**
   * Path to the dictionary directory.
   * @default 'dict/'
   */
  dictPath?: string;
}

export class MeCab {
  private tokenizer: Tokenizer;

  private constructor(tokenizer: Tokenizer) {
    this.tokenizer = tokenizer;
  }

  /**
   * Create a MeCab instance asynchronously.
   *
   * Unlike napi-mecab which uses a synchronous constructor,
   * this pure JavaScript implementation requires async initialization
   * to load the dictionary files without blocking.
   *
   * @example
   * ```typescript
   * const mecab = await MeCab.create({ engine: 'ko' });
   * const tokens = mecab.parse('안녕하세요');
   * ```
   */
  static async create(opts: MeCabOptions = {}): Promise<MeCab> {
    const engine = opts.engine ?? 'ko';

    if (engine !== 'ko') {
      throw new Error(
        `"${engine}" is not a supported mecab engine. Only "ko" (Korean) is supported.`
      );
    }

    const builder = new TokenizerBuilder({
      dicPath: opts.dictPath,
    });

    const tokenizer = await builder.build();
    return new MeCab(tokenizer);
  }

  /**
   * Parse text into an array of tokens.
   *
   * @param text - The text to parse
   * @returns Array of Token objects
   *
   * @example
   * ```typescript
   * const tokens = mecab.parse('아버지가방에들어가신다');
   * tokens.forEach(t => console.log(t.surface, t.pos));
   * ```
   */
  parse(text: string): Token[] {
    const koreanTokens = this.tokenizer.tokenize(text);
    return koreanTokens.map((token) => new Token(token));
  }

  /**
   * Get just the surface forms as an array.
   * Convenience method equivalent to napi-mecab parse + map surface.
   */
  wakati(text: string): string[] {
    return this.tokenizer.wakati(text);
  }

  /**
   * Get space-separated surface forms.
   */
  wakatiString(text: string): string {
    return this.tokenizer.wakatiString(text);
  }

  /**
   * Access the underlying Tokenizer for advanced usage.
   */
  get underlyingTokenizer(): Tokenizer {
    return this.tokenizer;
  }
}
