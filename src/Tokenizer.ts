import { ViterbiBuilder } from './viterbi/ViterbiBuilder.js';
import { ViterbiSearcher } from './viterbi/ViterbiSearcher.js';
import { ViterbiLattice } from './viterbi/ViterbiLattice.js';
import { KoreanFormatter } from './KoreanFormatter.js';
import { KoreanToken } from './KoreanToken.js';
import { DynamicDictionaries } from './dict/DynamicDictionaries.js';
import { TokenInfoDictionary } from './dict/TokenInfoDictionary.js';
import { UnknownDictionary } from './dict/UnknownDictionary.js';

// Korean sentence-ending punctuation
const PUNCTUATION = /[.?!。？！]/;

/**
 * Tokenizer - Korean morphological analyzer
 */
export class Tokenizer {
  private tokenInfoDictionary: TokenInfoDictionary;
  private unknownDictionary: UnknownDictionary;
  private viterbiBuilder: ViterbiBuilder;
  private viterbiSearcher: ViterbiSearcher;
  private formatter: KoreanFormatter;

  constructor(dic: DynamicDictionaries) {
    this.tokenInfoDictionary = dic.tokenInfoDictionary;
    this.unknownDictionary = dic.unknownDictionary;
    this.viterbiBuilder = new ViterbiBuilder(dic);
    this.viterbiSearcher = new ViterbiSearcher(dic.connectionCosts);
    this.formatter = new KoreanFormatter();
  }

  /**
   * Split text by sentence-ending punctuation
   */
  static splitByPunctuation(input: string): string[] {
    const sentences: string[] = [];
    let tail = input;

    while (true) {
      if (tail === '') {
        break;
      }
      const index = tail.search(PUNCTUATION);
      if (index < 0) {
        sentences.push(tail);
        break;
      }
      sentences.push(tail.substring(0, index + 1));
      tail = tail.substring(index + 1);
    }

    return sentences;
  }

  /**
   * Tokenize text into morphemes
   */
  tokenize(text: string): KoreanToken[] {
    const sentences = Tokenizer.splitByPunctuation(text);
    const tokens: KoreanToken[] = [];

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      this.tokenizeForSentence(sentence, tokens);
    }

    return tokens;
  }

  /**
   * Tokenize a single sentence
   */
  tokenizeForSentence(sentence: string, tokens: KoreanToken[] = []): KoreanToken[] {
    const lattice = this.getLattice(sentence);
    const bestPath = this.viterbiSearcher.search(lattice);

    let lastPos = 0;
    if (tokens.length > 0) {
      lastPos = tokens[tokens.length - 1].word_position;
    }

    for (let j = 0; j < bestPath.length; j++) {
      const node = bestPath[j];
      let token: KoreanToken;
      let features: string[];
      let featuresLine: string;

      if (node.type === 'KNOWN') {
        featuresLine = this.tokenInfoDictionary.getFeatures(node.name);
        features = featuresLine ? featuresLine.split(',') : [];
        token = this.formatter.formatEntry(
          node.name,
          lastPos + node.start_pos,
          'KNOWN',
          features
        );
      } else if (node.type === 'UNKNOWN') {
        featuresLine = this.unknownDictionary.getFeatures(node.name);
        features = featuresLine ? featuresLine.split(',') : [];
        token = this.formatter.formatUnknownEntry(
          node.name,
          lastPos + node.start_pos,
          'UNKNOWN',
          features,
          node.surface_form
        );
      } else {
        token = this.formatter.formatEntry(node.name, lastPos + node.start_pos, 'KNOWN', []);
      }

      tokens.push(token);
    }

    return tokens;
  }

  /**
   * Get just the surface forms as an array (wakachi-gaki)
   */
  wakati(text: string): string[] {
    const tokens = this.tokenize(text);
    return tokens.map((token) => token.surface_form);
  }

  /**
   * Get space-separated surface forms
   */
  wakatiString(text: string): string {
    return this.wakati(text).join(' ');
  }

  /**
   * Build word lattice for analysis
   */
  getLattice(text: string): ViterbiLattice {
    return this.viterbiBuilder.build(text);
  }
}
