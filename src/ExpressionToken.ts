/**
 * ExpressionToken - represents a component of an agglutinated Korean token
 *
 * Korean compound/inflected words have an expression field in the format:
 * "morpheme/pos/semanticClass+morpheme/pos/semanticClass+..."
 *
 * This class represents a single component of that expression.
 */

const VERB_TAGS = ['VV', 'VA', 'VX', 'VCP', 'VCN'];

function nullIfStar(value: string): string | null {
  return value === '*' ? null : value;
}

export class ExpressionToken {
  private _morpheme: string;
  private _pos: string;
  private _semanticClass: string;

  constructor(raw: string) {
    const parts = raw.split('/');
    this._morpheme = parts[0] ?? '';
    this._pos = parts[1] ?? '';
    this._semanticClass = parts[2] ?? '*';
  }

  /**
   * The normalized token/morpheme
   */
  get morpheme(): string {
    return this._morpheme;
  }

  /**
   * The part of speech tag
   */
  get pos(): string {
    return this._pos;
  }

  /**
   * The dictionary form (adds 다 for verbs)
   */
  get lemma(): string {
    if (VERB_TAGS.includes(this._pos)) {
      return this._morpheme + '다';
    }
    return this._morpheme;
  }

  /**
   * The semantic word class or category
   */
  get semanticClass(): string | null {
    return nullIfStar(this._semanticClass);
  }
}
