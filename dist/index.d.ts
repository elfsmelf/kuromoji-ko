type ViterbiNodeType = 'KNOWN' | 'UNKNOWN' | 'BOS' | 'EOS';
/**
 * ViterbiNode - a node in the Viterbi lattice
 */
declare class ViterbiNode {
    name: number;
    cost: number;
    start_pos: number;
    length: number;
    left_id: number;
    right_id: number;
    prev: ViterbiNode | null;
    surface_form: string;
    shortest_cost: number;
    type: ViterbiNodeType;
    constructor(nodeName: number, nodeCost: number, startPos: number, length: number, type: ViterbiNodeType, leftId: number, rightId: number, surfaceForm: string);
}

/**
 * ViterbiLattice - a word lattice for Viterbi algorithm
 */
declare class ViterbiLattice {
    nodesEndAt: (ViterbiNode[] | null)[];
    eosPos: number;
    constructor();
    /**
     * Append node to the lattice
     */
    append(node: ViterbiNode): void;
    /**
     * Append EOS (End of Sentence) node
     */
    appendEos(): void;
}

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
declare const POS_TAGS: Record<string, string>;
interface KoreanTokenOptions {
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
interface TokenPart {
    surface: string;
    pos: string;
}
declare class KoreanToken {
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
    constructor(options?: KoreanTokenOptions);
    /**
     * Get human-readable POS description
     */
    get posDescription(): string;
    /**
     * Check if token ends with a consonant (받침)
     */
    get hasBatchim(): boolean;
    /**
     * Check if this is a compound word
     */
    get isCompound(): boolean;
    /**
     * Check if this is an inflected form
     */
    get isInflected(): boolean;
    /**
     * Get the decomposed parts for compound/inflected words
     */
    get parts(): TokenPart[];
    /**
     * Create token from features array
     */
    static fromFeatures(surface: string, features: string[], wordId?: number, position?: number, wordType?: 'KNOWN' | 'UNKNOWN'): KoreanToken;
    /**
     * Convert to plain object
     */
    toJSON(): Record<string, unknown>;
}

/**
 * ByteBuffer - Utilities to manipulate byte sequences
 */
declare class ByteBuffer {
    buffer: Uint8Array;
    position: number;
    constructor(arg?: number | Uint8Array | ArrayBuffer);
    size(): number;
    reallocate(): void;
    shrink(): Uint8Array;
    put(b: number): void;
    get(index?: number): number;
    putShort(num: number): void;
    getShort(index?: number): number;
    putInt(num: number): void;
    getInt(index?: number): number;
    readInt(): number;
    putString(str: string): void;
    getString(index?: number): string;
}

/**
 * TokenInfoDictionary - dictionary for known tokens
 */
declare class TokenInfoDictionary {
    dictionary: ByteBuffer;
    targetMap: Record<number, number[]>;
    posBuffer: ByteBuffer;
    constructor();
    /**
     * Build dictionary from entries
     * Entry format: [surface, left_id, right_id, word_cost, ...features]
     */
    buildDictionary(entries: (string | number)[][]): Record<number, string>;
    put(leftId: number, rightId: number, wordCost: number, surfaceForm: string, feature: string): number;
    addMapping(source: number, target: number): void;
    targetMapToBuffer(): Uint8Array;
    loadDictionary(arrayBuffer: Uint8Array | ArrayBuffer): this;
    loadPosVector(arrayBuffer: Uint8Array | ArrayBuffer): this;
    loadTargetMap(arrayBuffer: Uint8Array | ArrayBuffer): this;
    /**
     * Look up features in the dictionary
     */
    getFeatures(tokenInfoIdStr: string | number): string;
}

/**
 * ConnectionCosts - connection costs matrix from cc.dat file
 * 2 dimension matrix [forward_id][backward_id] -> cost
 */
declare class ConnectionCosts {
    forwardDimension: number;
    backwardDimension: number;
    buffer: Int16Array;
    constructor(forwardDimension: number, backwardDimension: number);
    put(forwardId: number, backwardId: number, cost: number): void;
    get(forwardId: number, backwardId: number): number;
    loadConnectionCosts(connectionCostsBuffer: Int16Array): void;
}

/**
 * CharacterClass - represents a character category for unknown word processing
 */
declare class CharacterClass {
    class_id: number;
    class_name: string;
    is_always_invoke: boolean | number;
    is_grouping: boolean | number;
    max_length: number;
    constructor(classId: number, className: string, isAlwaysInvoke: boolean | number, isGrouping: boolean | number, maxLength: number);
}

/**
 * InvokeDefinitionMap - represents invoke definition part of char.def
 */
declare class InvokeDefinitionMap {
    map: CharacterClass[];
    lookupTable: Record<string, number>;
    constructor();
    /**
     * Load InvokeDefinitionMap from buffer
     */
    static load(invokeDefBuffer: Uint8Array): InvokeDefinitionMap;
    /**
     * Initialize with character category definitions
     */
    init(characterCategoryDefinition: CharacterClass[] | null): void;
    /**
     * Get class information by class ID
     */
    getCharacterClass(classId: number): CharacterClass | undefined;
    /**
     * Lookup class ID by class name
     */
    lookup(className: string): number | null;
    /**
     * Transform from map to binary buffer
     */
    toBuffer(): Uint8Array;
}

interface CategoryMapping {
    start: number;
    end?: number;
    default: string;
    compatible: string[];
}
/**
 * CharacterDefinition - represents char.def file and
 * defines behavior of unknown word processing
 */
declare class CharacterDefinition {
    characterCategoryMap: Uint8Array;
    compatibleCategoryMap: Uint32Array;
    invokeDefinitionMap: InvokeDefinitionMap | null;
    constructor();
    /**
     * Load CharacterDefinition from buffers
     */
    static load(catMapBuffer: Uint8Array, compatCatMapBuffer: Uint32Array, invokeDefBuffer: Uint8Array): CharacterDefinition;
    static parseCharCategory(classId: number, parsedCategoryDef: string[]): CharacterClass | null;
    static parseCategoryMapping(parsedCategoryMapping: string[]): CategoryMapping;
    static parseRangeCategoryMapping(parsedCategoryMapping: string[]): CategoryMapping;
    /**
     * Initialize category mappings
     */
    initCategoryMappings(categoryMapping: CategoryMapping[] | null): void;
    /**
     * Lookup compatible categories for a character (not included 1st category)
     */
    lookupCompatibleCategory(ch: string): CharacterClass[];
    /**
     * Lookup category for a character
     */
    lookup(ch: string): CharacterClass | undefined;
}

/**
 * UnknownDictionary - dictionary for unknown words
 */
declare class UnknownDictionary extends TokenInfoDictionary {
    characterDefinition: CharacterDefinition | null;
    constructor();
    setCharacterDefinition(characterDefinition: CharacterDefinition): this;
    lookup(ch: string): CharacterClass | undefined;
    lookupCompatibleCategory(ch: string): CharacterClass[];
    loadUnknownDictionaries(unkBuffer: Uint8Array, unkPosBuffer: Uint8Array, unkMapBuffer: Uint8Array, catMapBuffer: Uint8Array, compatCatMapBuffer: Uint32Array, invokeDefBuffer: Uint8Array): void;
}

interface DoubleArrayTrie {
    commonPrefixSearch(key: string): Array<{
        k: string;
        v: number;
    }>;
}
/**
 * DynamicDictionaries - container for all dictionaries used by Tokenizer
 */
declare class DynamicDictionaries {
    trie: DoubleArrayTrie;
    tokenInfoDictionary: TokenInfoDictionary;
    connectionCosts: ConnectionCosts;
    unknownDictionary: UnknownDictionary;
    constructor(trie?: DoubleArrayTrie | null, tokenInfoDictionary?: TokenInfoDictionary | null, connectionCosts?: ConnectionCosts | null, unknownDictionary?: UnknownDictionary | null);
    loadTrie(baseBuffer: Int32Array, checkBuffer: Int32Array): Promise<this>;
    loadTokenInfoDictionaries(tokenInfoBuffer: Uint8Array, posBuffer: Uint8Array, targetMapBuffer: Uint8Array): this;
    loadConnectionCosts(ccBuffer: Int16Array): this;
    loadUnknownDictionaries(unkBuffer: Uint8Array, unkPosBuffer: Uint8Array, unkMapBuffer: Uint8Array, catMapBuffer: Uint8Array, compatCatMapBuffer: Uint32Array, invokeDefBuffer: Uint8Array): this;
}

/**
 * Tokenizer - Korean morphological analyzer
 */
declare class Tokenizer {
    private tokenInfoDictionary;
    private unknownDictionary;
    private viterbiBuilder;
    private viterbiSearcher;
    private formatter;
    constructor(dic: DynamicDictionaries);
    /**
     * Split text by sentence-ending punctuation
     */
    static splitByPunctuation(input: string): string[];
    /**
     * Tokenize text into morphemes
     */
    tokenize(text: string): KoreanToken[];
    /**
     * Tokenize a single sentence
     */
    tokenizeForSentence(sentence: string, tokens?: KoreanToken[]): KoreanToken[];
    /**
     * Get just the surface forms as an array (wakachi-gaki)
     */
    wakati(text: string): string[];
    /**
     * Get space-separated surface forms
     */
    wakatiString(text: string): string;
    /**
     * Build word lattice for analysis
     */
    getLattice(text: string): ViterbiLattice;
}

interface TokenizerBuilderOptions {
    dicPath?: string;
}
/**
 * TokenizerBuilder - builds a Tokenizer with loaded dictionaries
 */
declare class TokenizerBuilder {
    private dicPath;
    constructor(options?: TokenizerBuilderOptions);
    /**
     * Build and return the tokenizer (async)
     */
    build(): Promise<Tokenizer>;
}

/**
 * ExpressionToken - represents a component of an agglutinated Korean token
 *
 * Korean compound/inflected words have an expression field in the format:
 * "morpheme/pos/semanticClass+morpheme/pos/semanticClass+..."
 *
 * This class represents a single component of that expression.
 */
declare class ExpressionToken {
    private _morpheme;
    private _pos;
    private _semanticClass;
    constructor(raw: string);
    /**
     * The normalized token/morpheme
     */
    get morpheme(): string;
    /**
     * The part of speech tag
     */
    get pos(): string;
    /**
     * The dictionary form (adds 다 for verbs)
     */
    get lemma(): string;
    /**
     * The semantic word class or category
     */
    get semanticClass(): string | null;
}

/**
 * Token - napi-mecab compatible token wrapper
 *
 * Provides getters that match the napi-mecab API for Korean tokens.
 */

declare class Token {
    private _token;
    constructor(token: KoreanToken);
    /**
     * How the token looks in the input text
     */
    get surface(): string;
    /**
     * The raw features string (comma-separated)
     */
    get features(): string;
    /**
     * The raw string in MeCab format (surface\tfeatures)
     */
    get raw(): string;
    /**
     * Parts of speech as an array (split by "+")
     */
    get pos(): string[];
    /**
     * The dictionary headword (adds 다 for verbs)
     */
    get lemma(): string | null;
    /**
     * How the token is pronounced
     */
    get pronunciation(): string | null;
    /**
     * Whether the token has a final consonant (받침/batchim)
     */
    get hasBatchim(): boolean | null;
    /**
     * Alias for hasBatchim (종성/jongseong)
     */
    get hasJongseong(): boolean | null;
    /**
     * The semantic word class or category
     */
    get semanticClass(): string | null;
    /**
     * The type of token (Inflect/Compound/Preanalysis)
     */
    get type(): string | null;
    /**
     * The broken-down expression tokens for compound/inflected words
     */
    get expression(): ExpressionToken[] | null;
    /**
     * Get the underlying KoreanToken
     */
    get koreanToken(): KoreanToken;
}

/**
 * MeCab - napi-mecab compatible API wrapper
 *
 * Provides a familiar API for users coming from napi-mecab.
 * Uses async initialization since this is a pure JavaScript implementation.
 */

interface MeCabOptions {
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
declare class MeCab {
    private tokenizer;
    private constructor();
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
    static create(opts?: MeCabOptions): Promise<MeCab>;
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
    parse(text: string): Token[];
    /**
     * Get just the surface forms as an array.
     * Convenience method equivalent to napi-mecab parse + map surface.
     */
    wakati(text: string): string[];
    /**
     * Get space-separated surface forms.
     */
    wakatiString(text: string): string;
    /**
     * Access the underlying Tokenizer for advanced usage.
     */
    get underlyingTokenizer(): Tokenizer;
}

/**
 * mecab-ko - Pure TypeScript Korean Morphological Analyzer
 *
 * A port of kuromoji.js adapted for Korean language processing using mecab-ko-dic.
 */

/**
 * Create a tokenizer builder
 */
declare function builder(options?: TokenizerBuilderOptions): TokenizerBuilder;

declare const _default: {
    builder: typeof builder;
    TokenizerBuilder: typeof TokenizerBuilder;
    Tokenizer: typeof Tokenizer;
    KoreanToken: typeof KoreanToken;
    POS_TAGS: Record<string, string>;
    MeCab: typeof MeCab;
    Token: typeof Token;
    ExpressionToken: typeof ExpressionToken;
};

export { ExpressionToken, KoreanToken, MeCab, type MeCabOptions, POS_TAGS, Token, Tokenizer, TokenizerBuilder, type TokenizerBuilderOptions, builder, _default as default };
