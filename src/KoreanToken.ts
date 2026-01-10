/**
 * Korean Token - represents a single morpheme from tokenization
 *
 * mecab-ko-dic format (8 features):
 * 0: 품사 태그 (POS tag) - e.g., NNG, VV, JKS
 * 1: 의미 부류 (semantic class) - e.g., 행위, 인물
 * 2: 종성 유무 (final consonant) - T/F/*
 * 3: 읽기 (reading) - pronunciation
 * 4: 타입 (type) - Inflect/Compound/Preanalysis/*
 * 5: 첫번째 품사 (first POS) - for compound words
 * 6: 마지막 품사 (last POS) - for compound words
 * 7: 표현 (expression) - decomposition of compounds
 */

// Korean POS tag descriptions (Sejong tagset)
export const POS_TAGS: Record<string, string> = {
  // 체언 (Substantives)
  NNG: '일반 명사', // General noun
  NNP: '고유 명사', // Proper noun
  NNB: '의존 명사', // Dependent noun
  NR: '수사', // Numeral
  NP: '대명사', // Pronoun

  // 용언 (Predicates)
  VV: '동사', // Verb
  VA: '형용사', // Adjective
  VX: '보조 용언', // Auxiliary predicate
  VCP: '긍정 지정사', // Positive copula (이다)
  VCN: '부정 지정사', // Negative copula (아니다)

  // 관형사 (Determiners)
  MM: '관형사', // Determiner

  // 부사 (Adverbs)
  MAG: '일반 부사', // General adverb
  MAJ: '접속 부사', // Conjunctive adverb

  // 감탄사 (Interjections)
  IC: '감탄사', // Interjection

  // 조사 (Particles)
  JKS: '주격 조사', // Subject case particle
  JKC: '보격 조사', // Complement case particle
  JKG: '관형격 조사', // Adnominal case particle
  JKO: '목적격 조사', // Object case particle
  JKB: '부사격 조사', // Adverbial case particle
  JKV: '호격 조사', // Vocative case particle
  JKQ: '인용격 조사', // Quotative case particle
  JX: '보조사', // Auxiliary particle
  JC: '접속 조사', // Conjunctive particle

  // 어미 (Endings)
  EP: '선어말 어미', // Pre-final ending
  EF: '종결 어미', // Final ending
  EC: '연결 어미', // Connective ending
  ETN: '명사형 전성 어미', // Nominalizing ending
  ETM: '관형형 전성 어미', // Adnominalizing ending

  // 접사 (Affixes)
  XPN: '체언 접두사', // Noun prefix
  XSN: '명사 파생 접미사', // Noun-deriving suffix
  XSV: '동사 파생 접미사', // Verb-deriving suffix
  XSA: '형용사 파생 접미사', // Adjective-deriving suffix
  XR: '어근', // Root

  // 부호 (Symbols)
  SF: '마침표, 물음표, 느낌표', // Period, question, exclamation
  SE: '줄임표', // Ellipsis
  SS: '따옴표, 괄호표', // Quotes, brackets
  SP: '쉼표, 가운뎃점, 콜론, 빗금', // Comma, interpunct, colon, slash
  SO: '붙임표', // Hyphen
  SW: '기타 기호', // Other symbols

  // 한글 외 (Non-Hangul)
  SL: '외국어', // Foreign language
  SH: '한자', // Chinese characters
  SN: '숫자', // Numbers

  // 분석 불능 (Unknown)
  NA: '분석불능', // Unable to analyze
  NF: '명사추정범주', // Presumed noun
  NV: '용언추정범주', // Presumed predicate
};

export interface KoreanTokenOptions {
  word_id?: number;
  word_type?: 'KNOWN' | 'UNKNOWN';
  word_position?: number;
  surface_form?: string;
  pos?: string;
  semantic_class?: string;
  has_final_consonant?: string;
  reading?: string;
  type?: string;
  first_pos?: string;
  last_pos?: string;
  expression?: string;
}

export interface TokenPart {
  surface: string;
  pos: string;
}

export class KoreanToken {
  word_id: number;
  word_type: 'KNOWN' | 'UNKNOWN';
  word_position: number;
  surface_form: string;
  pos: string;
  semantic_class: string;
  has_final_consonant: string;
  reading: string;
  type: string;
  first_pos: string;
  last_pos: string;
  expression: string;

  constructor(options: KoreanTokenOptions = {}) {
    this.word_id = options.word_id ?? 0;
    this.word_type = options.word_type ?? 'KNOWN';
    this.word_position = options.word_position ?? 1;
    this.surface_form = options.surface_form ?? '';

    // Korean-specific features (mecab-ko-dic format)
    this.pos = options.pos ?? '*';
    this.semantic_class = options.semantic_class ?? '*';
    this.has_final_consonant = options.has_final_consonant ?? '*';
    this.reading = options.reading ?? '*';
    this.type = options.type ?? '*';
    this.first_pos = options.first_pos ?? '*';
    this.last_pos = options.last_pos ?? '*';
    this.expression = options.expression ?? '*';
  }

  /**
   * Get human-readable POS description
   */
  get posDescription(): string {
    return POS_TAGS[this.pos] || this.pos;
  }

  /**
   * Check if token ends with a consonant (받침)
   */
  get hasBatchim(): boolean {
    return this.has_final_consonant === 'T';
  }

  /**
   * Check if this is a compound word
   */
  get isCompound(): boolean {
    return this.type === 'Compound';
  }

  /**
   * Check if this is an inflected form
   */
  get isInflected(): boolean {
    return this.type === 'Inflect';
  }

  /**
   * Get the decomposed parts for compound/inflected words
   */
  get parts(): TokenPart[] {
    if (this.expression === '*') return [];
    // Format: 한국/NNG/*+어/NNG/*
    return this.expression.split('+').map((part) => {
      const [surface, pos] = part.split('/');
      return { surface, pos };
    });
  }

  /**
   * Create token from features array
   */
  static fromFeatures(
    surface: string,
    features: string[],
    wordId = 0,
    position = 1,
    wordType: 'KNOWN' | 'UNKNOWN' = 'KNOWN'
  ): KoreanToken {
    return new KoreanToken({
      word_id: wordId,
      word_type: wordType,
      word_position: position,
      surface_form: surface,
      pos: features[0] ?? '*',
      semantic_class: features[1] ?? '*',
      has_final_consonant: features[2] ?? '*',
      reading: features[3] ?? '*',
      type: features[4] ?? '*',
      first_pos: features[5] ?? '*',
      last_pos: features[6] ?? '*',
      expression: features[7] ?? '*',
    });
  }

  /**
   * Convert to plain object
   */
  toJSON(): Record<string, unknown> {
    return {
      word_id: this.word_id,
      word_type: this.word_type,
      word_position: this.word_position,
      surface_form: this.surface_form,
      pos: this.pos,
      posDescription: this.posDescription,
      semantic_class: this.semantic_class,
      has_final_consonant: this.has_final_consonant,
      reading: this.reading,
      type: this.type,
      first_pos: this.first_pos,
      last_pos: this.last_pos,
      expression: this.expression,
    };
  }
}
