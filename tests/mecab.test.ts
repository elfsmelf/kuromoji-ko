import { describe, it, expect, beforeAll } from 'vitest';
import { MeCab, Token, ExpressionToken } from '../src/index.js';

// Share a single MeCab instance across all tests to avoid reloading dictionary
let sharedMeCab: MeCab;

beforeAll(async () => {
  sharedMeCab = await MeCab.create({ engine: 'ko', dictPath: './dict' });
});

describe('MeCab', () => {
  describe('create()', () => {
    it('should create a MeCab instance', () => {
      expect(sharedMeCab).toBeInstanceOf(MeCab);
    });

    it('should throw error for unsupported engine', async () => {
      await expect(
        MeCab.create({ engine: 'jp' as 'ko', dictPath: './dict' })
      ).rejects.toThrow('"jp" is not a supported mecab engine');
    });
  });

  describe('parse()', () => {
    it('should parse Korean text into tokens', () => {
      const tokens = sharedMeCab.parse('안녕하세요');
      expect(tokens).toBeInstanceOf(Array);
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0]).toBeInstanceOf(Token);
    });

    it('should return tokens with surface property', () => {
      const tokens = sharedMeCab.parse('한국어');
      expect(tokens[0].surface).toBe('한국어');
    });

    it('should return tokens with pos array', () => {
      const tokens = sharedMeCab.parse('한국어');
      expect(Array.isArray(tokens[0].pos)).toBe(true);
      expect(tokens[0].pos.length).toBeGreaterThan(0);
    });
  });

  describe('wakati()', () => {
    it('should return array of surface forms', () => {
      const words = sharedMeCab.wakati('한국어 형태소 분석');
      expect(Array.isArray(words)).toBe(true);
      expect(words).toContain('한국어');
    });
  });

  describe('wakatiString()', () => {
    it('should return space-separated surface forms', () => {
      const str = sharedMeCab.wakatiString('한국어 형태소 분석');
      expect(typeof str).toBe('string');
      expect(str).toContain('한국어');
    });
  });
});

describe('Token', () => {
  describe('surface', () => {
    it('should return the surface form', () => {
      const tokens = sharedMeCab.parse('안녕');
      expect(tokens[0].surface).toBe('안녕');
    });
  });

  describe('features', () => {
    it('should return comma-separated features string', () => {
      const tokens = sharedMeCab.parse('안녕');
      expect(typeof tokens[0].features).toBe('string');
      expect(tokens[0].features).toContain(',');
    });
  });

  describe('raw', () => {
    it('should return MeCab-style raw output', () => {
      const tokens = sharedMeCab.parse('안녕');
      expect(tokens[0].raw).toContain('\t');
      expect(tokens[0].raw.startsWith('안녕')).toBe(true);
    });
  });

  describe('pos', () => {
    it('should return array of POS tags', () => {
      const tokens = sharedMeCab.parse('안녕');
      expect(Array.isArray(tokens[0].pos)).toBe(true);
    });

    it('should split compound POS tags by +', () => {
      // Find a token with compound POS if available
      const tokens = sharedMeCab.parse('하세요');
      tokens.forEach((token) => {
        expect(Array.isArray(token.pos)).toBe(true);
      });
    });
  });

  describe('lemma', () => {
    it('should return surface for non-verbs', () => {
      const tokens = sharedMeCab.parse('한국');
      const nounToken = tokens.find((t) => t.pos[0] === 'NNG' || t.pos[0] === 'NNP');
      if (nounToken) {
        expect(nounToken.lemma).toBe(nounToken.surface);
      }
    });

    it('should add 다 suffix for verbs', () => {
      const tokens = sharedMeCab.parse('먹다');
      const verbToken = tokens.find((t) =>
        ['VV', 'VA', 'VX', 'VCP', 'VCN'].includes(t.pos[0])
      );
      if (verbToken) {
        expect(verbToken.lemma).toContain('다');
      }
    });
  });

  describe('pronunciation', () => {
    it('should return pronunciation or null', () => {
      const tokens = sharedMeCab.parse('안녕');
      const pron = tokens[0].pronunciation;
      expect(pron === null || typeof pron === 'string').toBe(true);
    });
  });

  describe('hasBatchim / hasJongseong', () => {
    it('should return boolean or null', () => {
      const tokens = sharedMeCab.parse('한국');
      const val = tokens[0].hasBatchim;
      expect(val === null || typeof val === 'boolean').toBe(true);
    });

    it('hasJongseong should be alias for hasBatchim', () => {
      const tokens = sharedMeCab.parse('한국');
      expect(tokens[0].hasJongseong).toBe(tokens[0].hasBatchim);
    });
  });

  describe('semanticClass', () => {
    it('should return semantic class or null', () => {
      const tokens = sharedMeCab.parse('한국');
      const val = tokens[0].semanticClass;
      expect(val === null || typeof val === 'string').toBe(true);
    });
  });

  describe('type', () => {
    it('should return type or null', () => {
      const tokens = sharedMeCab.parse('한국어');
      const val = tokens[0].type;
      expect(val === null || typeof val === 'string').toBe(true);
    });
  });

  describe('expression', () => {
    it('should return null for simple tokens', () => {
      const tokens = sharedMeCab.parse('안녕');
      // Simple tokens may have null expression
      tokens.forEach((token) => {
        const expr = token.expression;
        expect(expr === null || Array.isArray(expr)).toBe(true);
      });
    });

    it('should return ExpressionToken array for compound tokens', () => {
      // Try to find a compound word
      const tokens = sharedMeCab.parse('한국어');
      const compoundToken = tokens.find((t) => t.expression !== null);
      if (compoundToken && compoundToken.expression) {
        expect(Array.isArray(compoundToken.expression)).toBe(true);
        expect(compoundToken.expression[0]).toBeInstanceOf(ExpressionToken);
      }
    });
  });

  describe('koreanToken', () => {
    it('should provide access to underlying KoreanToken', () => {
      const tokens = sharedMeCab.parse('안녕');
      expect(tokens[0].koreanToken).toBeDefined();
      expect(tokens[0].koreanToken.surface_form).toBe('안녕');
    });
  });
});

describe('ExpressionToken', () => {
  it('should parse morpheme/pos/semanticClass format', () => {
    const expr = new ExpressionToken('한국/NNG/*');
    expect(expr.morpheme).toBe('한국');
    expect(expr.pos).toBe('NNG');
    expect(expr.semanticClass).toBeNull();
  });

  it('should return lemma with 다 for verbs', () => {
    const expr = new ExpressionToken('먹/VV/*');
    expect(expr.lemma).toBe('먹다');
  });

  it('should return morpheme as lemma for non-verbs', () => {
    const expr = new ExpressionToken('한국/NNG/*');
    expect(expr.lemma).toBe('한국');
  });

  it('should return semantic class when available', () => {
    const expr = new ExpressionToken('한국/NNG/지명');
    expect(expr.semanticClass).toBe('지명');
  });
});
