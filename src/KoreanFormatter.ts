import { KoreanToken } from './KoreanToken.js';

/**
 * KoreanFormatter - formats tokens for mecab-ko-dic features
 *
 * mecab-ko-dic features format (8 fields):
 * surface_form,pos,semantic_class,has_final_consonant,reading,type,first_pos,last_pos,expression
 */
export class KoreanFormatter {
  /**
   * Format a known word entry
   */
  formatEntry(
    wordId: number,
    position: number,
    type: 'KNOWN' | 'UNKNOWN',
    features: string[]
  ): KoreanToken {
    // Features format: surface,pos,semantic,jongseong,reading,type,first_pos,last_pos,expression
    // But the surface is already in features[0] from the dictionary
    return new KoreanToken({
      word_id: wordId,
      word_type: type,
      word_position: position,
      surface_form: features[0] ?? '',
      pos: features[1] ?? '*',
      semantic_class: features[2] ?? '*',
      has_final_consonant: features[3] ?? '*',
      reading: features[4] ?? '*',
      type: features[5] ?? '*',
      first_pos: features[6] ?? '*',
      last_pos: features[7] ?? '*',
      expression: features[8] ?? '*',
    });
  }

  /**
   * Format an unknown word entry
   */
  formatUnknownEntry(
    wordId: number,
    position: number,
    type: 'KNOWN' | 'UNKNOWN',
    features: string[],
    surfaceForm: string
  ): KoreanToken {
    return new KoreanToken({
      word_id: wordId,
      word_type: type,
      word_position: position,
      surface_form: surfaceForm,
      pos: features[1] ?? '*',
      semantic_class: features[2] ?? '*',
      has_final_consonant: features[3] ?? '*',
      reading: features[4] ?? '*',
      type: features[5] ?? '*',
      first_pos: features[6] ?? '*',
      last_pos: features[7] ?? '*',
      expression: features[8] ?? '*',
    });
  }
}
