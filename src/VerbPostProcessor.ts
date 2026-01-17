import { KoreanToken } from './KoreanToken.js';

/**
 * Common Korean verb stems that are often mistagged as nouns (NNP/NNG)
 * when they appear in conjugated forms.
 *
 * Format: stem -> dictionary form (for reference)
 */
const COMMON_VERB_STEMS: Set<string> = new Set([
  // Very common verbs often mistagged
  '주', // 주다 - to give
  '오', // 오다 - to come
  '가', // 가다 - to go
  '보', // 보다 - to see/look
  '사', // 사다 - to buy
  '자', // 자다 - to sleep
  '타', // 타다 - to ride
  '서', // 서다 - to stand
  '나', // 나다 - to occur
  '두', // 두다 - to put/place
  '쓰', // 쓰다 - to write/use
  '끄', // 끄다 - to turn off
  '트', // 트다 - to open
  '빠지', // 빠지다 - to fall into
  '드리', // 드리다 - to give (humble)
  '데리', // 데리다 - to bring (person)
  '들', // 들다 - to enter/hold
  '열', // 열다 - to open
  '닫', // 닫다 - to close
  '앉', // 앉다 - to sit
  '읽', // 읽다 - to read
  '찾', // 찾다 - to find
  '받', // 받다 - to receive
  '갖', // 갖다 - to have
  '잡', // 잡다 - to catch
  '넣', // 넣다 - to put in
  '놓', // 놓다 - to place
  '돌', // 돌다 - to turn
  '던지', // 던지다 - to throw
  '들어', // 들어가다/오다
  '올', // 올라가다/오다
  '내', // 내다, 내리다
  '시키', // 시키다 - to order
  '기다리', // 기다리다 - to wait
  '바꾸', // 바꾸다 - to change
  '고치', // 고치다 - to fix
  '지키', // 지키다 - to protect
  '마시', // 마시다 - to drink
  '부르', // 부르다 - to call
  '모르', // 모르다 - to not know
  '고르', // 고르다 - to choose
  '누르', // 누르다 - to press
  '배우', // 배우다 - to learn
  '도와주', // 도와주다 - to help
]);

/**
 * Verb ending patterns that indicate the surface form is a verb conjugation.
 * These patterns help identify mistagged verb forms.
 */
interface VerbEndingPattern {
  ending: string;
  epPart: string;      // Pre-final ending (EP) - e.g., 시
  efPart: string;      // Final ending (EF) - e.g., 어요
  description: string;
}

const VERB_ENDING_PATTERNS: VerbEndingPattern[] = [
  // Honorific request forms (-세요, -으세요)
  { ending: '세요', epPart: '시', efPart: '어요', description: 'honorific polite' },
  { ending: '으세요', epPart: '으시', efPart: '어요', description: 'honorific polite (with 으)' },

  // Honorific declarative forms (-셔요)
  { ending: '셔요', epPart: '시', efPart: '어요', description: 'honorific polite alt' },

  // Honorific formal forms (-십니다, -으십니다)
  { ending: '십니다', epPart: '시', efPart: 'ㅂ니다', description: 'honorific formal' },
  { ending: '으십니다', epPart: '으시', efPart: 'ㅂ니다', description: 'honorific formal (with 으)' },

  // Honorific past forms (-셨어요, -으셨어요)
  { ending: '셨어요', epPart: '시었', efPart: '어요', description: 'honorific past polite' },
  { ending: '으셨어요', epPart: '으시었', efPart: '어요', description: 'honorific past polite (with 으)' },
];

/**
 * Check if a character has jongseong (final consonant / 받침)
 */
function hasJongseong(char: string): boolean {
  if (!char || char.length === 0) return false;
  const code = char.charCodeAt(0);
  // Hangul syllable range: 0xAC00 to 0xD7A3
  if (code < 0xAC00 || code > 0xD7A3) return false;
  // Each syllable block: (initial * 21 + medial) * 28 + final
  // final = 0 means no jongseong
  return (code - 0xAC00) % 28 !== 0;
}

/**
 * VerbPostProcessor - fixes mistagged verb conjugations
 *
 * This processor detects verb forms that were incorrectly tagged as nouns
 * (typically NNP or NNG) and corrects them to proper verb tags with
 * appropriate morpheme decomposition.
 */
export class VerbPostProcessor {

  /**
   * Process tokens and fix mistagged verb forms
   */
  process(tokens: KoreanToken[]): KoreanToken[] {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Only process tokens that look like they might be mistagged
      if (this.shouldProcess(token)) {
        const corrected = this.tryCorrectVerbForm(token);
        if (corrected) {
          tokens[i] = corrected;
        }
      }
    }

    return tokens;
  }

  /**
   * Check if a token should be processed for potential correction
   */
  private shouldProcess(token: KoreanToken): boolean {
    // Process tokens tagged as proper nouns or general nouns
    // that might actually be verb conjugations
    if (token.pos !== 'NNP' && token.pos !== 'NNG') {
      return false;
    }

    // Must be at least 2 characters (stem + ending)
    if (token.surface_form.length < 2) {
      return false;
    }

    return true;
  }

  /**
   * Try to correct a potentially mistagged verb form
   */
  private tryCorrectVerbForm(token: KoreanToken): KoreanToken | null {
    const surface = token.surface_form;

    // Check each verb ending pattern
    for (const pattern of VERB_ENDING_PATTERNS) {
      if (surface.endsWith(pattern.ending)) {
        const stem = surface.slice(0, -pattern.ending.length);

        // Check if the stem is a known verb stem
        if (stem.length > 0 && COMMON_VERB_STEMS.has(stem)) {
          return this.createCorrectedToken(token, stem, pattern);
        }

        // For patterns requiring 으, check if stem ends without jongseong
        if (pattern.ending.startsWith('으')) {
          continue; // 으 patterns are for consonant-ending stems
        }

        // Additional heuristic: if stem is single char and looks like a verb stem
        // (ends with vowel-type patterns common in verb stems)
        if (stem.length === 1 && this.looksLikeVerbStem(stem)) {
          return this.createCorrectedToken(token, stem, pattern);
        }
      }
    }

    return null;
  }

  /**
   * Heuristic check if a character looks like it could be a verb stem
   */
  private looksLikeVerbStem(char: string): boolean {
    // Single-character verb stems typically don't have jongseong
    // or have specific patterns
    if (char.length !== 1) return false;

    const code = char.charCodeAt(0);
    // Must be Hangul syllable
    if (code < 0xAC00 || code > 0xD7A3) return false;

    // Common single-char verb stems often don't have jongseong
    // (가, 오, 주, 보, 사, 자, 서, 나, 두, etc.)
    // but some do (들, 잡, etc.)
    return !hasJongseong(char) || COMMON_VERB_STEMS.has(char);
  }

  /**
   * Create a corrected token with proper verb tagging
   */
  private createCorrectedToken(
    original: KoreanToken,
    stem: string,
    pattern: VerbEndingPattern
  ): KoreanToken {
    // Build the expression (morpheme decomposition)
    // Format: stem/VV/*+EP/EP/*+EF/EF/*
    const expression = `${stem}/VV/*+${pattern.epPart}/EP/*+${pattern.efPart}/EF/*`;

    // Determine if stem has final consonant
    const stemHasJongseong = hasJongseong(stem.charAt(stem.length - 1));

    return new KoreanToken({
      word_id: original.word_id,
      word_type: original.word_type,
      word_position: original.word_position,
      surface_form: original.surface_form,
      pos: 'VV+EP+EF', // Verb + Pre-final ending + Final ending
      semantic_class: '*',
      has_final_consonant: 'F', // The final form ends with 요 (no jongseong)
      reading: original.surface_form,
      type: 'Inflect',
      first_pos: 'VV',
      last_pos: 'EF',
      expression: expression,
    });
  }
}

/**
 * Singleton instance for convenience
 */
export const verbPostProcessor = new VerbPostProcessor();
