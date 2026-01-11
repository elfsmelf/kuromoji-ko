/**
 * mecab-ko - Pure TypeScript Korean Morphological Analyzer
 *
 * A port of kuromoji.js adapted for Korean language processing using mecab-ko-dic.
 */

import { TokenizerBuilder, TokenizerBuilderOptions } from './TokenizerBuilder.js';
import { Tokenizer } from './Tokenizer.js';
import { KoreanToken, POS_TAGS } from './KoreanToken.js';
import { MeCab, MeCabOptions } from './MeCab.js';
import { Token } from './Token.js';
import { ExpressionToken } from './ExpressionToken.js';

/**
 * Create a tokenizer builder
 */
function builder(options: TokenizerBuilderOptions = {}): TokenizerBuilder {
  return new TokenizerBuilder(options);
}

// Named exports
export {
  // Original API
  builder,
  TokenizerBuilder,
  Tokenizer,
  KoreanToken,
  POS_TAGS,
  // napi-mecab compatible API
  MeCab,
  Token,
  ExpressionToken,
};
export type { TokenizerBuilderOptions, MeCabOptions };

// Default export
export default {
  // Original API
  builder,
  TokenizerBuilder,
  Tokenizer,
  KoreanToken,
  POS_TAGS,
  // napi-mecab compatible API
  MeCab,
  Token,
  ExpressionToken,
};
