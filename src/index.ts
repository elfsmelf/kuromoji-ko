/**
 * mecab-ko - Pure TypeScript Korean Morphological Analyzer
 *
 * A port of kuromoji.js adapted for Korean language processing using mecab-ko-dic.
 */

import { TokenizerBuilder, TokenizerBuilderOptions } from './TokenizerBuilder.js';
import { Tokenizer } from './Tokenizer.js';
import { KoreanToken, POS_TAGS } from './KoreanToken.js';

/**
 * Create a tokenizer builder
 */
function builder(options: TokenizerBuilderOptions = {}): TokenizerBuilder {
  return new TokenizerBuilder(options);
}

// Named exports
export { builder, TokenizerBuilder, Tokenizer, KoreanToken, POS_TAGS };
export type { TokenizerBuilderOptions };

// Default export
export default { builder, TokenizerBuilder, Tokenizer, KoreanToken, POS_TAGS };
