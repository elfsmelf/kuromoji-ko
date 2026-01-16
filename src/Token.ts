/**
 * Token - napi-mecab compatible token wrapper
 *
 * Provides getters that match the napi-mecab API for Korean tokens.
 */

import { KoreanToken } from './KoreanToken.js';
import { ExpressionToken } from './ExpressionToken.js';

const VERB_TAGS = ['VV', 'VA', 'VX', 'VCP', 'VCN'];

function nullIfStar(value: string): string | null {
  return value === '*' ? null : value;
}

export class Token {
  private _token: KoreanToken;

  constructor(token: KoreanToken) {
    this._token = token;
  }

  /**
   * How the token looks in the input text
   */
  get surface(): string {
    return this._token.surface_form;
  }

  /**
   * The raw features string (comma-separated)
   */
  get features(): string {
    return [
      this._token.pos,
      this._token.semantic_class,
      this._token.has_final_consonant,
      this._token.reading,
      this._token.type,
      this._token.first_pos,
      this._token.last_pos,
      this._token.expression,
    ].join(',');
  }

  /**
   * The raw string in MeCab format (surface\tfeatures)
   */
  get raw(): string {
    return `${this.surface}\t${this.features}`;
  }

  /**
   * Parts of speech as an array (split by "+")
   */
  get pos(): string[] {
    return this._token.pos.split('+');
  }

  /**
   * The dictionary headword (adds 다 for verbs)
   */
  get lemma(): string | null {
    // For inflected tokens with expressions, use the base morpheme's lemma
    const expr = this.expression;
    if (expr && expr.length > 0) {
      const baseMorpheme = expr[0];
      if (VERB_TAGS.includes(baseMorpheme.pos)) {
        return baseMorpheme.lemma;
      }
    }

    // For simple verb tokens, add 다 to surface
    const basePos = this.pos[0];
    if (VERB_TAGS.includes(basePos)) {
      return this.surface + '다';
    }
    return this.surface;
  }

  /**
   * How the token is pronounced
   */
  get pronunciation(): string | null {
    return nullIfStar(this._token.reading);
  }

  /**
   * Whether the token has a final consonant (받침/batchim)
   */
  get hasBatchim(): boolean | null {
    const val = this._token.has_final_consonant;
    if (val === 'T') return true;
    if (val === 'F') return false;
    return null;
  }

  /**
   * Alias for hasBatchim (종성/jongseong)
   */
  get hasJongseong(): boolean | null {
    return this.hasBatchim;
  }

  /**
   * The semantic word class or category
   */
  get semanticClass(): string | null {
    return nullIfStar(this._token.semantic_class);
  }

  /**
   * The type of token (Inflect/Compound/Preanalysis)
   */
  get type(): string | null {
    return nullIfStar(this._token.type);
  }

  /**
   * The broken-down expression tokens for compound/inflected words
   */
  get expression(): ExpressionToken[] | null {
    if (this._token.expression === '*') return null;
    return this._token.expression
      .split('+')
      .map((part) => new ExpressionToken(part));
  }

  /**
   * Get the underlying KoreanToken
   */
  get koreanToken(): KoreanToken {
    return this._token;
  }
}
