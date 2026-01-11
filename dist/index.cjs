"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ExpressionToken: () => ExpressionToken,
  KoreanToken: () => KoreanToken,
  MeCab: () => MeCab,
  POS_TAGS: () => POS_TAGS,
  Token: () => Token,
  Tokenizer: () => Tokenizer,
  TokenizerBuilder: () => TokenizerBuilder,
  builder: () => builder,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// src/viterbi/ViterbiNode.ts
var ViterbiNode = class {
  constructor(nodeName, nodeCost, startPos, length, type, leftId, rightId, surfaceForm) {
    this.name = nodeName;
    this.cost = nodeCost;
    this.start_pos = startPos;
    this.length = length;
    this.left_id = leftId;
    this.right_id = rightId;
    this.prev = null;
    this.surface_form = surfaceForm;
    this.shortest_cost = type === "BOS" ? 0 : Number.MAX_VALUE;
    this.type = type;
  }
};

// src/viterbi/ViterbiLattice.ts
var ViterbiLattice = class {
  constructor() {
    this.nodesEndAt = [];
    this.nodesEndAt[0] = [new ViterbiNode(-1, 0, 0, 0, "BOS", 0, 0, "")];
    this.eosPos = 1;
  }
  /**
   * Append node to the lattice
   */
  append(node) {
    const lastPos = node.start_pos + node.length - 1;
    if (this.eosPos < lastPos) {
      this.eosPos = lastPos;
    }
    let prevNodes = this.nodesEndAt[lastPos];
    if (prevNodes == null) {
      prevNodes = [];
    }
    prevNodes.push(node);
    this.nodesEndAt[lastPos] = prevNodes;
  }
  /**
   * Append EOS (End of Sentence) node
   */
  appendEos() {
    const lastIndex = this.nodesEndAt.length;
    this.eosPos++;
    this.nodesEndAt[lastIndex] = [new ViterbiNode(-1, 0, this.eosPos, 0, "EOS", 0, 0, "")];
  }
};

// src/util/SurrogateAwareString.ts
var SurrogateAwareString = class _SurrogateAwareString {
  constructor(str) {
    this.str = str;
    this.indexMapping = [];
    for (let pos = 0; pos < str.length; pos++) {
      const ch = str.charAt(pos);
      this.indexMapping.push(pos);
      if (_SurrogateAwareString.isSurrogatePair(ch)) {
        pos++;
      }
    }
    this.length = this.indexMapping.length;
  }
  slice(index) {
    if (this.indexMapping.length <= index) {
      return "";
    }
    const surrogateAwareIndex = this.indexMapping[index];
    return this.str.slice(surrogateAwareIndex);
  }
  charAt(index) {
    if (this.str.length <= index) {
      return "";
    }
    const surrogateAwareStartIndex = this.indexMapping[index];
    const surrogateAwareEndIndex = this.indexMapping[index + 1];
    if (surrogateAwareEndIndex == null) {
      return this.str.slice(surrogateAwareStartIndex);
    }
    return this.str.slice(surrogateAwareStartIndex, surrogateAwareEndIndex);
  }
  charCodeAt(index) {
    if (this.indexMapping.length <= index) {
      return NaN;
    }
    const surrogateAwareIndex = this.indexMapping[index];
    const upper = this.str.charCodeAt(surrogateAwareIndex);
    if (upper >= 55296 && upper <= 56319 && surrogateAwareIndex < this.str.length) {
      const lower = this.str.charCodeAt(surrogateAwareIndex + 1);
      if (lower >= 56320 && lower <= 57343) {
        return (upper - 55296) * 1024 + lower - 56320 + 65536;
      }
    }
    return upper;
  }
  toString() {
    return this.str;
  }
  static isSurrogatePair(ch) {
    const utf16Code = ch.charCodeAt(0);
    return utf16Code >= 55296 && utf16Code <= 56319;
  }
};

// src/viterbi/ViterbiBuilder.ts
var ViterbiBuilder = class {
  constructor(dic) {
    this.trie = dic.trie;
    this.tokenInfoDictionary = dic.tokenInfoDictionary;
    this.unknownDictionary = dic.unknownDictionary;
  }
  /**
   * Build word lattice from input text
   */
  build(sentenceStr) {
    const lattice = new ViterbiLattice();
    const sentence = new SurrogateAwareString(sentenceStr);
    for (let pos = 0; pos < sentence.length; pos++) {
      const tail = sentence.slice(pos);
      const vocabulary = this.trie.commonPrefixSearch(tail);
      for (let n = 0; n < vocabulary.length; n++) {
        const trieId = vocabulary[n].v;
        const key = vocabulary[n].k;
        const tokenInfoIds = this.tokenInfoDictionary.targetMap[trieId];
        if (tokenInfoIds == null) continue;
        for (let i = 0; i < tokenInfoIds.length; i++) {
          const tokenInfoId = tokenInfoIds[i];
          const leftId = this.tokenInfoDictionary.dictionary.getShort(tokenInfoId);
          const rightId = this.tokenInfoDictionary.dictionary.getShort(tokenInfoId + 2);
          const wordCost = this.tokenInfoDictionary.dictionary.getShort(tokenInfoId + 4);
          lattice.append(
            new ViterbiNode(
              tokenInfoId,
              wordCost,
              pos + 1,
              key.length,
              "KNOWN",
              leftId,
              rightId,
              key
            )
          );
        }
      }
      const surrogateAwareTail = new SurrogateAwareString(tail);
      const headChar = new SurrogateAwareString(surrogateAwareTail.charAt(0));
      const headCharClass = this.unknownDictionary.lookup(headChar.toString());
      if (vocabulary == null || vocabulary.length === 0 || headCharClass && headCharClass.is_always_invoke === 1) {
        let key = headChar;
        if (headCharClass && headCharClass.is_grouping === 1 && surrogateAwareTail.length > 1) {
          for (let k = 1; k < surrogateAwareTail.length; k++) {
            const nextChar = surrogateAwareTail.charAt(k);
            const nextCharClass = this.unknownDictionary.lookup(nextChar);
            if (!nextCharClass || headCharClass.class_name !== nextCharClass.class_name) {
              break;
            }
            key = new SurrogateAwareString(key.toString() + nextChar);
          }
        }
        if (headCharClass) {
          const unkIds = this.unknownDictionary.targetMap[headCharClass.class_id];
          if (unkIds) {
            for (let j = 0; j < unkIds.length; j++) {
              const unkId = unkIds[j];
              const leftId = this.unknownDictionary.dictionary.getShort(unkId);
              const rightId = this.unknownDictionary.dictionary.getShort(unkId + 2);
              const wordCost = this.unknownDictionary.dictionary.getShort(unkId + 4);
              lattice.append(
                new ViterbiNode(
                  unkId,
                  wordCost,
                  pos + 1,
                  key.length,
                  "UNKNOWN",
                  leftId,
                  rightId,
                  key.toString()
                )
              );
            }
          }
        }
      }
    }
    lattice.appendEos();
    return lattice;
  }
};

// src/viterbi/ViterbiSearcher.ts
var ViterbiSearcher = class {
  constructor(connectionCosts) {
    this.connectionCosts = connectionCosts;
  }
  /**
   * Search best path using forward-backward algorithm
   */
  search(lattice) {
    lattice = this.forward(lattice);
    return this.backward(lattice);
  }
  /**
   * Forward pass - compute shortest costs
   */
  forward(lattice) {
    for (let i = 1; i <= lattice.eosPos; i++) {
      const nodes = lattice.nodesEndAt[i];
      if (nodes == null) {
        continue;
      }
      for (let j = 0; j < nodes.length; j++) {
        const node = nodes[j];
        let cost = Number.MAX_VALUE;
        let shortestPrevNode = null;
        const prevNodes = lattice.nodesEndAt[node.start_pos - 1];
        if (prevNodes == null) {
          continue;
        }
        for (let k = 0; k < prevNodes.length; k++) {
          const prevNode = prevNodes[k];
          let edgeCost;
          if (node.left_id == null || prevNode.right_id == null) {
            console.log("Left or right is null");
            edgeCost = 0;
          } else {
            edgeCost = this.connectionCosts.get(prevNode.right_id, node.left_id);
          }
          const totalCost = prevNode.shortest_cost + edgeCost + node.cost;
          if (totalCost < cost) {
            shortestPrevNode = prevNode;
            cost = totalCost;
          }
        }
        node.prev = shortestPrevNode;
        node.shortest_cost = cost;
      }
    }
    return lattice;
  }
  /**
   * Backward pass - trace back the best path
   */
  backward(lattice) {
    const shortestPath = [];
    const lastNodes = lattice.nodesEndAt[lattice.nodesEndAt.length - 1];
    if (!lastNodes || lastNodes.length === 0) {
      return [];
    }
    const eos = lastNodes[0];
    let nodeBack = eos.prev;
    if (nodeBack == null) {
      return [];
    }
    while (nodeBack.type !== "BOS") {
      shortestPath.push(nodeBack);
      if (nodeBack.prev == null) {
        return [];
      }
      nodeBack = nodeBack.prev;
    }
    return shortestPath.reverse();
  }
};

// src/KoreanToken.ts
var POS_TAGS = {
  // 체언 (Substantives)
  NNG: "\uC77C\uBC18 \uBA85\uC0AC",
  // General noun
  NNP: "\uACE0\uC720 \uBA85\uC0AC",
  // Proper noun
  NNB: "\uC758\uC874 \uBA85\uC0AC",
  // Dependent noun
  NR: "\uC218\uC0AC",
  // Numeral
  NP: "\uB300\uBA85\uC0AC",
  // Pronoun
  // 용언 (Predicates)
  VV: "\uB3D9\uC0AC",
  // Verb
  VA: "\uD615\uC6A9\uC0AC",
  // Adjective
  VX: "\uBCF4\uC870 \uC6A9\uC5B8",
  // Auxiliary predicate
  VCP: "\uAE0D\uC815 \uC9C0\uC815\uC0AC",
  // Positive copula (이다)
  VCN: "\uBD80\uC815 \uC9C0\uC815\uC0AC",
  // Negative copula (아니다)
  // 관형사 (Determiners)
  MM: "\uAD00\uD615\uC0AC",
  // Determiner
  // 부사 (Adverbs)
  MAG: "\uC77C\uBC18 \uBD80\uC0AC",
  // General adverb
  MAJ: "\uC811\uC18D \uBD80\uC0AC",
  // Conjunctive adverb
  // 감탄사 (Interjections)
  IC: "\uAC10\uD0C4\uC0AC",
  // Interjection
  // 조사 (Particles)
  JKS: "\uC8FC\uACA9 \uC870\uC0AC",
  // Subject case particle
  JKC: "\uBCF4\uACA9 \uC870\uC0AC",
  // Complement case particle
  JKG: "\uAD00\uD615\uACA9 \uC870\uC0AC",
  // Adnominal case particle
  JKO: "\uBAA9\uC801\uACA9 \uC870\uC0AC",
  // Object case particle
  JKB: "\uBD80\uC0AC\uACA9 \uC870\uC0AC",
  // Adverbial case particle
  JKV: "\uD638\uACA9 \uC870\uC0AC",
  // Vocative case particle
  JKQ: "\uC778\uC6A9\uACA9 \uC870\uC0AC",
  // Quotative case particle
  JX: "\uBCF4\uC870\uC0AC",
  // Auxiliary particle
  JC: "\uC811\uC18D \uC870\uC0AC",
  // Conjunctive particle
  // 어미 (Endings)
  EP: "\uC120\uC5B4\uB9D0 \uC5B4\uBBF8",
  // Pre-final ending
  EF: "\uC885\uACB0 \uC5B4\uBBF8",
  // Final ending
  EC: "\uC5F0\uACB0 \uC5B4\uBBF8",
  // Connective ending
  ETN: "\uBA85\uC0AC\uD615 \uC804\uC131 \uC5B4\uBBF8",
  // Nominalizing ending
  ETM: "\uAD00\uD615\uD615 \uC804\uC131 \uC5B4\uBBF8",
  // Adnominalizing ending
  // 접사 (Affixes)
  XPN: "\uCCB4\uC5B8 \uC811\uB450\uC0AC",
  // Noun prefix
  XSN: "\uBA85\uC0AC \uD30C\uC0DD \uC811\uBBF8\uC0AC",
  // Noun-deriving suffix
  XSV: "\uB3D9\uC0AC \uD30C\uC0DD \uC811\uBBF8\uC0AC",
  // Verb-deriving suffix
  XSA: "\uD615\uC6A9\uC0AC \uD30C\uC0DD \uC811\uBBF8\uC0AC",
  // Adjective-deriving suffix
  XR: "\uC5B4\uADFC",
  // Root
  // 부호 (Symbols)
  SF: "\uB9C8\uCE68\uD45C, \uBB3C\uC74C\uD45C, \uB290\uB08C\uD45C",
  // Period, question, exclamation
  SE: "\uC904\uC784\uD45C",
  // Ellipsis
  SS: "\uB530\uC634\uD45C, \uAD04\uD638\uD45C",
  // Quotes, brackets
  SP: "\uC27C\uD45C, \uAC00\uC6B4\uB383\uC810, \uCF5C\uB860, \uBE57\uAE08",
  // Comma, interpunct, colon, slash
  SO: "\uBD99\uC784\uD45C",
  // Hyphen
  SW: "\uAE30\uD0C0 \uAE30\uD638",
  // Other symbols
  // 한글 외 (Non-Hangul)
  SL: "\uC678\uAD6D\uC5B4",
  // Foreign language
  SH: "\uD55C\uC790",
  // Chinese characters
  SN: "\uC22B\uC790",
  // Numbers
  // 분석 불능 (Unknown)
  NA: "\uBD84\uC11D\uBD88\uB2A5",
  // Unable to analyze
  NF: "\uBA85\uC0AC\uCD94\uC815\uBC94\uC8FC",
  // Presumed noun
  NV: "\uC6A9\uC5B8\uCD94\uC815\uBC94\uC8FC"
  // Presumed predicate
};
var KoreanToken = class _KoreanToken {
  constructor(options = {}) {
    this.word_id = options.word_id ?? 0;
    this.word_type = options.word_type ?? "KNOWN";
    this.word_position = options.word_position ?? 1;
    this.surface_form = options.surface_form ?? "";
    this.pos = options.pos ?? "*";
    this.semantic_class = options.semantic_class ?? "*";
    this.has_final_consonant = options.has_final_consonant ?? "*";
    this.reading = options.reading ?? "*";
    this.type = options.type ?? "*";
    this.first_pos = options.first_pos ?? "*";
    this.last_pos = options.last_pos ?? "*";
    this.expression = options.expression ?? "*";
  }
  /**
   * Get human-readable POS description
   */
  get posDescription() {
    return POS_TAGS[this.pos] || this.pos;
  }
  /**
   * Check if token ends with a consonant (받침)
   */
  get hasBatchim() {
    return this.has_final_consonant === "T";
  }
  /**
   * Check if this is a compound word
   */
  get isCompound() {
    return this.type === "Compound";
  }
  /**
   * Check if this is an inflected form
   */
  get isInflected() {
    return this.type === "Inflect";
  }
  /**
   * Get the decomposed parts for compound/inflected words
   */
  get parts() {
    if (this.expression === "*") return [];
    return this.expression.split("+").map((part) => {
      const [surface, pos] = part.split("/");
      return { surface, pos };
    });
  }
  /**
   * Create token from features array
   */
  static fromFeatures(surface, features, wordId = 0, position = 1, wordType = "KNOWN") {
    return new _KoreanToken({
      word_id: wordId,
      word_type: wordType,
      word_position: position,
      surface_form: surface,
      pos: features[0] ?? "*",
      semantic_class: features[1] ?? "*",
      has_final_consonant: features[2] ?? "*",
      reading: features[3] ?? "*",
      type: features[4] ?? "*",
      first_pos: features[5] ?? "*",
      last_pos: features[6] ?? "*",
      expression: features[7] ?? "*"
    });
  }
  /**
   * Convert to plain object
   */
  toJSON() {
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
      expression: this.expression
    };
  }
};

// src/KoreanFormatter.ts
var KoreanFormatter = class {
  /**
   * Format a known word entry
   */
  formatEntry(wordId, position, type, features) {
    return new KoreanToken({
      word_id: wordId,
      word_type: type,
      word_position: position,
      surface_form: features[0] ?? "",
      pos: features[1] ?? "*",
      semantic_class: features[2] ?? "*",
      has_final_consonant: features[3] ?? "*",
      reading: features[4] ?? "*",
      type: features[5] ?? "*",
      first_pos: features[6] ?? "*",
      last_pos: features[7] ?? "*",
      expression: features[8] ?? "*"
    });
  }
  /**
   * Format an unknown word entry
   */
  formatUnknownEntry(wordId, position, type, features, surfaceForm) {
    return new KoreanToken({
      word_id: wordId,
      word_type: type,
      word_position: position,
      surface_form: surfaceForm,
      pos: features[1] ?? "*",
      semantic_class: features[2] ?? "*",
      has_final_consonant: features[3] ?? "*",
      reading: features[4] ?? "*",
      type: features[5] ?? "*",
      first_pos: features[6] ?? "*",
      last_pos: features[7] ?? "*",
      expression: features[8] ?? "*"
    });
  }
};

// src/Tokenizer.ts
var PUNCTUATION = /[.?!。？！]/;
var Tokenizer = class _Tokenizer {
  constructor(dic) {
    this.tokenInfoDictionary = dic.tokenInfoDictionary;
    this.unknownDictionary = dic.unknownDictionary;
    this.viterbiBuilder = new ViterbiBuilder(dic);
    this.viterbiSearcher = new ViterbiSearcher(dic.connectionCosts);
    this.formatter = new KoreanFormatter();
  }
  /**
   * Split text by sentence-ending punctuation
   */
  static splitByPunctuation(input) {
    const sentences = [];
    let tail = input;
    while (true) {
      if (tail === "") {
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
  tokenize(text) {
    const sentences = _Tokenizer.splitByPunctuation(text);
    const tokens = [];
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      this.tokenizeForSentence(sentence, tokens);
    }
    return tokens;
  }
  /**
   * Tokenize a single sentence
   */
  tokenizeForSentence(sentence, tokens = []) {
    const lattice = this.getLattice(sentence);
    const bestPath = this.viterbiSearcher.search(lattice);
    let lastPos = 0;
    if (tokens.length > 0) {
      lastPos = tokens[tokens.length - 1].word_position;
    }
    for (let j = 0; j < bestPath.length; j++) {
      const node = bestPath[j];
      let token;
      let features;
      let featuresLine;
      if (node.type === "KNOWN") {
        featuresLine = this.tokenInfoDictionary.getFeatures(node.name);
        features = featuresLine ? featuresLine.split(",") : [];
        token = this.formatter.formatEntry(
          node.name,
          lastPos + node.start_pos,
          "KNOWN",
          features
        );
      } else if (node.type === "UNKNOWN") {
        featuresLine = this.unknownDictionary.getFeatures(node.name);
        features = featuresLine ? featuresLine.split(",") : [];
        token = this.formatter.formatUnknownEntry(
          node.name,
          lastPos + node.start_pos,
          "UNKNOWN",
          features,
          node.surface_form
        );
      } else {
        token = this.formatter.formatEntry(node.name, lastPos + node.start_pos, "KNOWN", []);
      }
      tokens.push(token);
    }
    return tokens;
  }
  /**
   * Get just the surface forms as an array (wakachi-gaki)
   */
  wakati(text) {
    const tokens = this.tokenize(text);
    return tokens.map((token) => token.surface_form);
  }
  /**
   * Get space-separated surface forms
   */
  wakatiString(text) {
    return this.wakati(text).join(" ");
  }
  /**
   * Build word lattice for analysis
   */
  getLattice(text) {
    return this.viterbiBuilder.build(text);
  }
};

// src/util/ByteBuffer.ts
function stringToUtf8Bytes(str) {
  const bytes = new Uint8Array(str.length * 4);
  let i = 0;
  let j = 0;
  while (i < str.length) {
    let unicodeCode;
    const utf16Code = str.charCodeAt(i++);
    if (utf16Code >= 55296 && utf16Code <= 56319) {
      const upper = utf16Code;
      const lower = str.charCodeAt(i++);
      if (lower >= 56320 && lower <= 57343) {
        unicodeCode = (upper - 55296) * (1 << 10) + (1 << 16) + (lower - 56320);
      } else {
        throw new Error("Malformed surrogate pair");
      }
    } else {
      unicodeCode = utf16Code;
    }
    if (unicodeCode < 128) {
      bytes[j++] = unicodeCode;
    } else if (unicodeCode < 1 << 11) {
      bytes[j++] = unicodeCode >>> 6 | 192;
      bytes[j++] = unicodeCode & 63 | 128;
    } else if (unicodeCode < 1 << 16) {
      bytes[j++] = unicodeCode >>> 12 | 224;
      bytes[j++] = unicodeCode >> 6 & 63 | 128;
      bytes[j++] = unicodeCode & 63 | 128;
    } else if (unicodeCode < 1 << 21) {
      bytes[j++] = unicodeCode >>> 18 | 240;
      bytes[j++] = unicodeCode >> 12 & 63 | 128;
      bytes[j++] = unicodeCode >> 6 & 63 | 128;
      bytes[j++] = unicodeCode & 63 | 128;
    }
  }
  return bytes.subarray(0, j);
}
function utf8BytesToString(bytes) {
  let str = "";
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++];
    let code;
    if (b1 < 128) {
      code = b1;
    } else if (b1 >> 5 === 6) {
      const b2 = bytes[i++];
      code = (b1 & 31) << 6 | b2 & 63;
    } else if (b1 >> 4 === 14) {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      code = (b1 & 15) << 12 | (b2 & 63) << 6 | b3 & 63;
    } else {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      const b4 = bytes[i++];
      code = (b1 & 7) << 18 | (b2 & 63) << 12 | (b3 & 63) << 6 | b4 & 63;
    }
    if (code < 65536) {
      str += String.fromCharCode(code);
    } else {
      code -= 65536;
      const upper = 55296 | code >> 10;
      const lower = 56320 | code & 1023;
      str += String.fromCharCode(upper, lower);
    }
  }
  return str;
}
var ByteBuffer = class {
  constructor(arg) {
    if (arg == null) {
      this.buffer = new Uint8Array(1024 * 1024);
      this.position = 0;
    } else if (typeof arg === "number") {
      this.buffer = new Uint8Array(arg);
      this.position = 0;
    } else if (arg instanceof Uint8Array) {
      this.buffer = arg;
      this.position = 0;
    } else if (arg instanceof ArrayBuffer) {
      this.buffer = new Uint8Array(arg);
      this.position = 0;
    } else {
      throw new Error("Invalid parameter type for ByteBuffer constructor");
    }
  }
  size() {
    return this.buffer.length;
  }
  reallocate() {
    const newArray = new Uint8Array(this.buffer.length * 2);
    newArray.set(this.buffer);
    this.buffer = newArray;
  }
  shrink() {
    this.buffer = this.buffer.subarray(0, this.position);
    return this.buffer;
  }
  put(b) {
    if (this.buffer.length < this.position + 1) {
      this.reallocate();
    }
    this.buffer[this.position++] = b;
  }
  get(index) {
    if (index == null) {
      index = this.position;
      this.position += 1;
    }
    if (this.buffer.length < index + 1) {
      return 0;
    }
    return this.buffer[index];
  }
  // Write short to buffer (little endian)
  putShort(num) {
    if (65535 < num) {
      throw new Error(`${num} is over short value`);
    }
    const lower = 255 & num;
    const upper = (65280 & num) >> 8;
    this.put(lower);
    this.put(upper);
  }
  // Read short from buffer (little endian)
  getShort(index) {
    if (index == null) {
      index = this.position;
      this.position += 2;
    }
    if (this.buffer.length < index + 2) {
      return 0;
    }
    const lower = this.buffer[index];
    const upper = this.buffer[index + 1];
    let value = (upper << 8) + lower;
    if (value & 32768) {
      value = -(value - 1 ^ 65535);
    }
    return value;
  }
  // Write integer to buffer (little endian)
  putInt(num) {
    if (4294967295 < num) {
      throw new Error(`${num} is over integer value`);
    }
    const b0 = 255 & num;
    const b1 = (65280 & num) >> 8;
    const b2 = (16711680 & num) >> 16;
    const b3 = (4278190080 & num) >> 24;
    this.put(b0);
    this.put(b1);
    this.put(b2);
    this.put(b3);
  }
  // Read integer from buffer (little endian)
  getInt(index) {
    if (index == null) {
      index = this.position;
      this.position += 4;
    }
    if (this.buffer.length < index + 4) {
      return 0;
    }
    const b0 = this.buffer[index];
    const b1 = this.buffer[index + 1];
    const b2 = this.buffer[index + 2];
    const b3 = this.buffer[index + 3];
    return (b3 << 24 >>> 0) + (b2 << 16) + (b1 << 8) + b0;
  }
  readInt() {
    const pos = this.position;
    this.position += 4;
    return this.getInt(pos);
  }
  putString(str) {
    const bytes = stringToUtf8Bytes(str);
    for (let i = 0; i < bytes.length; i++) {
      this.put(bytes[i]);
    }
    this.put(0);
  }
  getString(index) {
    const buf = [];
    if (index == null) {
      index = this.position;
    }
    while (true) {
      if (this.buffer.length < index + 1) {
        break;
      }
      const ch = this.get(index++);
      if (ch === 0) {
        break;
      } else {
        buf.push(ch);
      }
    }
    this.position = index;
    return utf8BytesToString(buf);
  }
};

// src/dict/TokenInfoDictionary.ts
var TokenInfoDictionary = class {
  constructor() {
    this.dictionary = new ByteBuffer(10 * 1024 * 1024);
    this.targetMap = {};
    this.posBuffer = new ByteBuffer(10 * 1024 * 1024);
  }
  /**
   * Build dictionary from entries
   * Entry format: [surface, left_id, right_id, word_cost, ...features]
   */
  buildDictionary(entries) {
    const dictionaryEntries = {};
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.length < 4) {
        continue;
      }
      const surfaceForm = entry[0];
      const leftId = entry[1];
      const rightId = entry[2];
      const wordCost = entry[3];
      const feature = entry.slice(4).join(",");
      if (!isFinite(leftId) || !isFinite(rightId) || !isFinite(wordCost)) {
        console.log(entry);
        continue;
      }
      const tokenInfoId = this.put(leftId, rightId, wordCost, surfaceForm, feature);
      dictionaryEntries[tokenInfoId] = surfaceForm;
    }
    this.dictionary.shrink();
    this.posBuffer.shrink();
    return dictionaryEntries;
  }
  put(leftId, rightId, wordCost, surfaceForm, feature) {
    const tokenInfoId = this.dictionary.position;
    const posId = this.posBuffer.position;
    this.dictionary.putShort(leftId);
    this.dictionary.putShort(rightId);
    this.dictionary.putShort(wordCost);
    this.dictionary.putInt(posId);
    this.posBuffer.putString(surfaceForm + "," + feature);
    return tokenInfoId;
  }
  addMapping(source, target) {
    let mapping = this.targetMap[source];
    if (mapping == null) {
      mapping = [];
    }
    mapping.push(target);
    this.targetMap[source] = mapping;
  }
  targetMapToBuffer() {
    const buffer = new ByteBuffer();
    const mapKeysSize = Object.keys(this.targetMap).length;
    buffer.putInt(mapKeysSize);
    for (const key in this.targetMap) {
      const values = this.targetMap[parseInt(key, 10)];
      const mapValuesSize = values.length;
      buffer.putInt(parseInt(key, 10));
      buffer.putInt(mapValuesSize);
      for (let i = 0; i < values.length; i++) {
        buffer.putInt(values[i]);
      }
    }
    return buffer.shrink();
  }
  // Load from tid.dat
  loadDictionary(arrayBuffer) {
    this.dictionary = new ByteBuffer(
      arrayBuffer instanceof ArrayBuffer ? new Uint8Array(arrayBuffer) : arrayBuffer
    );
    return this;
  }
  // Load from tid_pos.dat
  loadPosVector(arrayBuffer) {
    this.posBuffer = new ByteBuffer(
      arrayBuffer instanceof ArrayBuffer ? new Uint8Array(arrayBuffer) : arrayBuffer
    );
    return this;
  }
  // Load from tid_map.dat
  loadTargetMap(arrayBuffer) {
    const buffer = new ByteBuffer(
      arrayBuffer instanceof ArrayBuffer ? new Uint8Array(arrayBuffer) : arrayBuffer
    );
    buffer.position = 0;
    this.targetMap = {};
    buffer.readInt();
    while (true) {
      if (buffer.buffer.length < buffer.position + 1) {
        break;
      }
      const key = buffer.readInt();
      const mapValuesSize = buffer.readInt();
      for (let i = 0; i < mapValuesSize; i++) {
        const value = buffer.readInt();
        this.addMapping(key, value);
      }
    }
    return this;
  }
  /**
   * Look up features in the dictionary
   */
  getFeatures(tokenInfoIdStr) {
    const tokenInfoId = typeof tokenInfoIdStr === "string" ? parseInt(tokenInfoIdStr, 10) : tokenInfoIdStr;
    if (isNaN(tokenInfoId)) {
      return "";
    }
    const posId = this.dictionary.getInt(tokenInfoId + 6);
    return this.posBuffer.getString(posId);
  }
};

// src/dict/ConnectionCosts.ts
var ConnectionCosts = class {
  constructor(forwardDimension, backwardDimension) {
    this.forwardDimension = forwardDimension;
    this.backwardDimension = backwardDimension;
    this.buffer = new Int16Array(forwardDimension * backwardDimension + 2);
    this.buffer[0] = forwardDimension;
    this.buffer[1] = backwardDimension;
  }
  put(forwardId, backwardId, cost) {
    const index = forwardId * this.backwardDimension + backwardId + 2;
    if (this.buffer.length < index + 1) {
      throw new Error("ConnectionCosts buffer overflow");
    }
    this.buffer[index] = cost;
  }
  get(forwardId, backwardId) {
    const index = forwardId * this.backwardDimension + backwardId + 2;
    if (this.buffer.length < index + 1) {
      throw new Error("ConnectionCosts buffer overflow");
    }
    return this.buffer[index];
  }
  loadConnectionCosts(connectionCostsBuffer) {
    this.forwardDimension = connectionCostsBuffer[0];
    this.backwardDimension = connectionCostsBuffer[1];
    this.buffer = connectionCostsBuffer;
  }
};

// src/dict/CharacterClass.ts
var CharacterClass = class {
  constructor(classId, className, isAlwaysInvoke, isGrouping, maxLength) {
    this.class_id = classId;
    this.class_name = className;
    this.is_always_invoke = isAlwaysInvoke;
    this.is_grouping = isGrouping;
    this.max_length = maxLength;
  }
};

// src/dict/InvokeDefinitionMap.ts
var InvokeDefinitionMap = class _InvokeDefinitionMap {
  constructor() {
    this.map = [];
    this.lookupTable = {};
  }
  /**
   * Load InvokeDefinitionMap from buffer
   */
  static load(invokeDefBuffer) {
    const invokeDef = new _InvokeDefinitionMap();
    const characterCategoryDefinition = [];
    const buffer = new ByteBuffer(invokeDefBuffer);
    while (buffer.position + 1 < buffer.size()) {
      const classId = characterCategoryDefinition.length;
      const isAlwaysInvoke = buffer.get();
      const isGrouping = buffer.get();
      const maxLength = buffer.getInt();
      const className = buffer.getString();
      characterCategoryDefinition.push(
        new CharacterClass(classId, className, isAlwaysInvoke, isGrouping, maxLength)
      );
    }
    invokeDef.init(characterCategoryDefinition);
    return invokeDef;
  }
  /**
   * Initialize with character category definitions
   */
  init(characterCategoryDefinition) {
    if (characterCategoryDefinition == null) {
      return;
    }
    for (let i = 0; i < characterCategoryDefinition.length; i++) {
      const characterClass = characterCategoryDefinition[i];
      this.map[i] = characterClass;
      this.lookupTable[characterClass.class_name] = i;
    }
  }
  /**
   * Get class information by class ID
   */
  getCharacterClass(classId) {
    return this.map[classId];
  }
  /**
   * Lookup class ID by class name
   */
  lookup(className) {
    const classId = this.lookupTable[className];
    if (classId == null) {
      return null;
    }
    return classId;
  }
  /**
   * Transform from map to binary buffer
   */
  toBuffer() {
    const buffer = new ByteBuffer();
    for (let i = 0; i < this.map.length; i++) {
      const charClass = this.map[i];
      buffer.put(charClass.is_always_invoke ? 1 : 0);
      buffer.put(charClass.is_grouping ? 1 : 0);
      buffer.putInt(charClass.max_length);
      buffer.putString(charClass.class_name);
    }
    buffer.shrink();
    return buffer.buffer;
  }
};

// src/dict/CharacterDefinition.ts
var DEFAULT_CATEGORY = "DEFAULT";
var CharacterDefinition = class _CharacterDefinition {
  constructor() {
    this.characterCategoryMap = new Uint8Array(65536);
    this.compatibleCategoryMap = new Uint32Array(65536);
    this.invokeDefinitionMap = null;
  }
  /**
   * Load CharacterDefinition from buffers
   */
  static load(catMapBuffer, compatCatMapBuffer, invokeDefBuffer) {
    const charDef = new _CharacterDefinition();
    charDef.characterCategoryMap = catMapBuffer;
    charDef.compatibleCategoryMap = compatCatMapBuffer;
    charDef.invokeDefinitionMap = InvokeDefinitionMap.load(invokeDefBuffer);
    return charDef;
  }
  static parseCharCategory(classId, parsedCategoryDef) {
    const category = parsedCategoryDef[1];
    const invoke = parseInt(parsedCategoryDef[2], 10);
    const grouping = parseInt(parsedCategoryDef[3], 10);
    const maxLength = parseInt(parsedCategoryDef[4], 10);
    if (!isFinite(invoke) || invoke !== 0 && invoke !== 1) {
      console.log("char.def parse error. INVOKE is 0 or 1 in:" + invoke);
      return null;
    }
    if (!isFinite(grouping) || grouping !== 0 && grouping !== 1) {
      console.log("char.def parse error. GROUP is 0 or 1 in:" + grouping);
      return null;
    }
    if (!isFinite(maxLength) || maxLength < 0) {
      console.log("char.def parse error. LENGTH is 1 to n:" + maxLength);
      return null;
    }
    const isInvoke = invoke === 1;
    const isGrouping = grouping === 1;
    return new CharacterClass(classId, category, isInvoke, isGrouping, maxLength);
  }
  static parseCategoryMapping(parsedCategoryMapping) {
    const start = parseInt(parsedCategoryMapping[1], 10);
    const defaultCategory = parsedCategoryMapping[2];
    const compatibleCategory = parsedCategoryMapping.length > 3 ? parsedCategoryMapping.slice(3) : [];
    if (!isFinite(start) || start < 0 || start > 65535) {
      console.log("char.def parse error. CODE is invalid:" + start);
    }
    return { start, default: defaultCategory, compatible: compatibleCategory };
  }
  static parseRangeCategoryMapping(parsedCategoryMapping) {
    const start = parseInt(parsedCategoryMapping[1], 10);
    const end = parseInt(parsedCategoryMapping[2], 10);
    const defaultCategory = parsedCategoryMapping[3];
    const compatibleCategory = parsedCategoryMapping.length > 4 ? parsedCategoryMapping.slice(4) : [];
    if (!isFinite(start) || start < 0 || start > 65535) {
      console.log("char.def parse error. CODE is invalid:" + start);
    }
    if (!isFinite(end) || end < 0 || end > 65535) {
      console.log("char.def parse error. CODE is invalid:" + end);
    }
    return { start, end, default: defaultCategory, compatible: compatibleCategory };
  }
  /**
   * Initialize category mappings
   */
  initCategoryMappings(categoryMapping) {
    if (categoryMapping != null && this.invokeDefinitionMap != null) {
      for (let i = 0; i < categoryMapping.length; i++) {
        const mapping = categoryMapping[i];
        const end = mapping.end ?? mapping.start;
        for (let codePoint = mapping.start; codePoint <= end; codePoint++) {
          const classId = this.invokeDefinitionMap.lookup(mapping.default);
          if (classId != null) {
            this.characterCategoryMap[codePoint] = classId;
          }
          for (let j = 0; j < mapping.compatible.length; j++) {
            let bitset = this.compatibleCategoryMap[codePoint];
            const compatibleCategory = mapping.compatible[j];
            if (compatibleCategory == null) {
              continue;
            }
            const compatClassId = this.invokeDefinitionMap.lookup(compatibleCategory);
            if (compatClassId == null) {
              continue;
            }
            const classIdBit = 1 << compatClassId;
            bitset = bitset | classIdBit;
            this.compatibleCategoryMap[codePoint] = bitset;
          }
        }
      }
    }
    if (this.invokeDefinitionMap == null) {
      return;
    }
    const defaultId = this.invokeDefinitionMap.lookup(DEFAULT_CATEGORY);
    if (defaultId == null) {
      return;
    }
    for (let codePoint = 0; codePoint < this.characterCategoryMap.length; codePoint++) {
      if (this.characterCategoryMap[codePoint] === 0) {
        this.characterCategoryMap[codePoint] = 1 << defaultId;
      }
    }
  }
  /**
   * Lookup compatible categories for a character (not included 1st category)
   */
  lookupCompatibleCategory(ch) {
    const classes = [];
    const code = ch.charCodeAt(0);
    let integer;
    if (code < this.compatibleCategoryMap.length) {
      integer = this.compatibleCategoryMap[code];
    }
    if (integer == null || integer === 0) {
      return classes;
    }
    for (let bit = 0; bit < 32; bit++) {
      if (integer << 31 - bit >>> 31 === 1) {
        const characterClass = this.invokeDefinitionMap?.getCharacterClass(bit);
        if (characterClass == null) {
          continue;
        }
        classes.push(characterClass);
      }
    }
    return classes;
  }
  /**
   * Lookup category for a character
   */
  lookup(ch) {
    let classId = null;
    const code = ch.charCodeAt(0);
    if (SurrogateAwareString.isSurrogatePair(ch)) {
      classId = this.invokeDefinitionMap?.lookup(DEFAULT_CATEGORY) ?? null;
    } else if (code < this.characterCategoryMap.length) {
      classId = this.characterCategoryMap[code];
    }
    if (classId == null) {
      classId = this.invokeDefinitionMap?.lookup(DEFAULT_CATEGORY) ?? null;
    }
    if (classId == null) {
      return void 0;
    }
    return this.invokeDefinitionMap?.getCharacterClass(classId);
  }
};

// src/dict/UnknownDictionary.ts
var UnknownDictionary = class extends TokenInfoDictionary {
  constructor() {
    super();
    this.characterDefinition = null;
  }
  setCharacterDefinition(characterDefinition) {
    this.characterDefinition = characterDefinition;
    return this;
  }
  lookup(ch) {
    return this.characterDefinition?.lookup(ch);
  }
  lookupCompatibleCategory(ch) {
    return this.characterDefinition?.lookupCompatibleCategory(ch) ?? [];
  }
  loadUnknownDictionaries(unkBuffer, unkPosBuffer, unkMapBuffer, catMapBuffer, compatCatMapBuffer, invokeDefBuffer) {
    this.loadDictionary(unkBuffer);
    this.loadPosVector(unkPosBuffer);
    this.loadTargetMap(unkMapBuffer);
    this.characterDefinition = CharacterDefinition.load(
      catMapBuffer,
      compatCatMapBuffer,
      invokeDefBuffer
    );
  }
};

// src/dict/DynamicDictionaries.ts
var DynamicDictionaries = class {
  constructor(trie, tokenInfoDictionary, connectionCosts, unknownDictionary) {
    this.trie = trie ?? {
      commonPrefixSearch: () => []
    };
    this.tokenInfoDictionary = tokenInfoDictionary ?? new TokenInfoDictionary();
    this.connectionCosts = connectionCosts ?? new ConnectionCosts(0, 0);
    this.unknownDictionary = unknownDictionary ?? new UnknownDictionary();
  }
  // Load from base.dat & check.dat
  async loadTrie(baseBuffer, checkBuffer) {
    const doublearrayModule = await import("doublearray");
    const doublearray = doublearrayModule.default || doublearrayModule;
    this.trie = doublearray.load(baseBuffer, checkBuffer);
    return this;
  }
  loadTokenInfoDictionaries(tokenInfoBuffer, posBuffer, targetMapBuffer) {
    this.tokenInfoDictionary.loadDictionary(tokenInfoBuffer);
    this.tokenInfoDictionary.loadPosVector(posBuffer);
    this.tokenInfoDictionary.loadTargetMap(targetMapBuffer);
    return this;
  }
  loadConnectionCosts(ccBuffer) {
    this.connectionCosts.loadConnectionCosts(ccBuffer);
    return this;
  }
  loadUnknownDictionaries(unkBuffer, unkPosBuffer, unkMapBuffer, catMapBuffer, compatCatMapBuffer, invokeDefBuffer) {
    this.unknownDictionary.loadUnknownDictionaries(
      unkBuffer,
      unkPosBuffer,
      unkMapBuffer,
      catMapBuffer,
      compatCatMapBuffer,
      invokeDefBuffer
    );
    return this;
  }
};

// src/loader/DictionaryLoader.ts
var DictionaryLoader = class {
  constructor(dicPath) {
    this.dic = new DynamicDictionaries();
    this.dicPath = dicPath.endsWith("/") ? dicPath : dicPath + "/";
    this.isLocalPath = !dicPath.startsWith("http://") && !dicPath.startsWith("https://");
  }
  /**
   * Check if we're in an edge/serverless runtime that doesn't support Node.js fs
   */
  isEdgeRuntime() {
    if (typeof globalThis !== "undefined" && "EdgeRuntime" in globalThis) {
      return true;
    }
    if (typeof globalThis !== "undefined" && "caches" in globalThis && "default" in globalThis.caches) {
      return true;
    }
    if (typeof globalThis !== "undefined" && "Deno" in globalThis) {
      return true;
    }
    if (typeof process !== "undefined" && process.env?.NEXT_RUNTIME === "edge") {
      return true;
    }
    return false;
  }
  /**
   * Load a file as ArrayBuffer, handling both compressed and uncompressed
   */
  async loadArrayBuffer(filename) {
    const path = this.dicPath + filename;
    let buffer;
    const shouldUseNodeFs = this.isLocalPath && typeof process !== "undefined" && process.versions?.node && !this.isEdgeRuntime();
    if (shouldUseNodeFs) {
      try {
        const fs = await import(
          /* webpackIgnore: true */
          "fs/promises"
        );
        const nodePath = await import(
          /* webpackIgnore: true */
          "path"
        );
        const resolvedPath = nodePath.resolve(path);
        const fileBuffer = await fs.readFile(resolvedPath);
        buffer = fileBuffer.buffer.slice(
          fileBuffer.byteOffset,
          fileBuffer.byteOffset + fileBuffer.byteLength
        );
      } catch {
        const response = await fetch(path);
        if (!response.ok) {
          throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
        }
        buffer = await response.arrayBuffer();
      }
    } else {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load ${path}: ${response.status} ${response.statusText}`);
      }
      buffer = await response.arrayBuffer();
    }
    const bytes = new Uint8Array(buffer);
    if (bytes[0] === 31 && bytes[1] === 139) {
      const pako = await import("pako");
      const decompressed = pako.inflate(bytes);
      return decompressed.buffer;
    }
    return buffer;
  }
  /**
   * Load all dictionary files
   */
  async load() {
    const [
      baseBuffer,
      checkBuffer,
      tidBuffer,
      tidPosBuffer,
      tidMapBuffer,
      ccBuffer,
      unkBuffer,
      unkPosBuffer,
      unkMapBuffer,
      unkCharBuffer,
      unkCompatBuffer,
      unkInvokeBuffer
    ] = await Promise.all([
      // TRIE
      this.loadArrayBuffer("base.dat.gz").catch(() => this.loadArrayBuffer("base.dat")),
      this.loadArrayBuffer("check.dat.gz").catch(() => this.loadArrayBuffer("check.dat")),
      // Token info
      this.loadArrayBuffer("tid.dat.gz").catch(() => this.loadArrayBuffer("tid.dat")),
      this.loadArrayBuffer("tid_pos.dat.gz").catch(() => this.loadArrayBuffer("tid_pos.dat")),
      this.loadArrayBuffer("tid_map.dat.gz").catch(() => this.loadArrayBuffer("tid_map.dat")),
      // Connection costs
      this.loadArrayBuffer("cc.dat.gz").catch(() => this.loadArrayBuffer("cc.dat")),
      // Unknown words
      this.loadArrayBuffer("unk.dat.gz").catch(() => this.loadArrayBuffer("unk.dat")),
      this.loadArrayBuffer("unk_pos.dat.gz").catch(() => this.loadArrayBuffer("unk_pos.dat")),
      this.loadArrayBuffer("unk_map.dat.gz").catch(() => this.loadArrayBuffer("unk_map.dat")),
      this.loadArrayBuffer("unk_char.dat.gz").catch(() => this.loadArrayBuffer("unk_char.dat")),
      this.loadArrayBuffer("unk_compat.dat.gz").catch(
        () => this.loadArrayBuffer("unk_compat.dat")
      ),
      this.loadArrayBuffer("unk_invoke.dat.gz").catch(
        () => this.loadArrayBuffer("unk_invoke.dat")
      )
    ]);
    await this.dic.loadTrie(new Int32Array(baseBuffer), new Int32Array(checkBuffer));
    this.dic.loadTokenInfoDictionaries(
      new Uint8Array(tidBuffer),
      new Uint8Array(tidPosBuffer),
      new Uint8Array(tidMapBuffer)
    );
    this.dic.loadConnectionCosts(new Int16Array(ccBuffer));
    this.dic.loadUnknownDictionaries(
      new Uint8Array(unkBuffer),
      new Uint8Array(unkPosBuffer),
      new Uint8Array(unkMapBuffer),
      new Uint8Array(unkCharBuffer),
      new Uint32Array(unkCompatBuffer),
      new Uint8Array(unkInvokeBuffer)
    );
    return this.dic;
  }
};

// src/TokenizerBuilder.ts
var TokenizerBuilder = class {
  constructor(options = {}) {
    this.dicPath = options.dicPath ?? "dict/";
  }
  /**
   * Build and return the tokenizer (async)
   */
  async build() {
    const loader = new DictionaryLoader(this.dicPath);
    const dic = await loader.load();
    return new Tokenizer(dic);
  }
};

// src/ExpressionToken.ts
var VERB_TAGS = ["VV", "VA", "VX", "VCP", "VCN"];
function nullIfStar(value) {
  return value === "*" ? null : value;
}
var ExpressionToken = class {
  constructor(raw) {
    const parts = raw.split("/");
    this._morpheme = parts[0] ?? "";
    this._pos = parts[1] ?? "";
    this._semanticClass = parts[2] ?? "*";
  }
  /**
   * The normalized token/morpheme
   */
  get morpheme() {
    return this._morpheme;
  }
  /**
   * The part of speech tag
   */
  get pos() {
    return this._pos;
  }
  /**
   * The dictionary form (adds 다 for verbs)
   */
  get lemma() {
    if (VERB_TAGS.includes(this._pos)) {
      return this._morpheme + "\uB2E4";
    }
    return this._morpheme;
  }
  /**
   * The semantic word class or category
   */
  get semanticClass() {
    return nullIfStar(this._semanticClass);
  }
};

// src/Token.ts
var VERB_TAGS2 = ["VV", "VA", "VX", "VCP", "VCN"];
function nullIfStar2(value) {
  return value === "*" ? null : value;
}
var Token = class {
  constructor(token) {
    this._token = token;
  }
  /**
   * How the token looks in the input text
   */
  get surface() {
    return this._token.surface_form;
  }
  /**
   * The raw features string (comma-separated)
   */
  get features() {
    return [
      this._token.pos,
      this._token.semantic_class,
      this._token.has_final_consonant,
      this._token.reading,
      this._token.type,
      this._token.first_pos,
      this._token.last_pos,
      this._token.expression
    ].join(",");
  }
  /**
   * The raw string in MeCab format (surface\tfeatures)
   */
  get raw() {
    return `${this.surface}	${this.features}`;
  }
  /**
   * Parts of speech as an array (split by "+")
   */
  get pos() {
    return this._token.pos.split("+");
  }
  /**
   * The dictionary headword (adds 다 for verbs)
   */
  get lemma() {
    const basePos = this.pos[0];
    if (VERB_TAGS2.includes(basePos)) {
      return this.surface + "\uB2E4";
    }
    return this.surface;
  }
  /**
   * How the token is pronounced
   */
  get pronunciation() {
    return nullIfStar2(this._token.reading);
  }
  /**
   * Whether the token has a final consonant (받침/batchim)
   */
  get hasBatchim() {
    const val = this._token.has_final_consonant;
    if (val === "T") return true;
    if (val === "F") return false;
    return null;
  }
  /**
   * Alias for hasBatchim (종성/jongseong)
   */
  get hasJongseong() {
    return this.hasBatchim;
  }
  /**
   * The semantic word class or category
   */
  get semanticClass() {
    return nullIfStar2(this._token.semantic_class);
  }
  /**
   * The type of token (Inflect/Compound/Preanalysis)
   */
  get type() {
    return nullIfStar2(this._token.type);
  }
  /**
   * The broken-down expression tokens for compound/inflected words
   */
  get expression() {
    if (this._token.expression === "*") return null;
    return this._token.expression.split("+").map((part) => new ExpressionToken(part));
  }
  /**
   * Get the underlying KoreanToken
   */
  get koreanToken() {
    return this._token;
  }
};

// src/MeCab.ts
var MeCab = class _MeCab {
  constructor(tokenizer) {
    this.tokenizer = tokenizer;
  }
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
  static async create(opts = {}) {
    const engine = opts.engine ?? "ko";
    if (engine !== "ko") {
      throw new Error(
        `"${engine}" is not a supported mecab engine. Only "ko" (Korean) is supported.`
      );
    }
    const builder2 = new TokenizerBuilder({
      dicPath: opts.dictPath
    });
    const tokenizer = await builder2.build();
    return new _MeCab(tokenizer);
  }
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
  parse(text) {
    const koreanTokens = this.tokenizer.tokenize(text);
    return koreanTokens.map((token) => new Token(token));
  }
  /**
   * Get just the surface forms as an array.
   * Convenience method equivalent to napi-mecab parse + map surface.
   */
  wakati(text) {
    return this.tokenizer.wakati(text);
  }
  /**
   * Get space-separated surface forms.
   */
  wakatiString(text) {
    return this.tokenizer.wakatiString(text);
  }
  /**
   * Access the underlying Tokenizer for advanced usage.
   */
  get underlyingTokenizer() {
    return this.tokenizer;
  }
};

// src/index.ts
function builder(options = {}) {
  return new TokenizerBuilder(options);
}
var index_default = {
  // Original API
  builder,
  TokenizerBuilder,
  Tokenizer,
  KoreanToken,
  POS_TAGS,
  // napi-mecab compatible API
  MeCab,
  Token,
  ExpressionToken
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ExpressionToken,
  KoreanToken,
  MeCab,
  POS_TAGS,
  Token,
  Tokenizer,
  TokenizerBuilder,
  builder
});
