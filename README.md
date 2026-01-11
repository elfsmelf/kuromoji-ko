# kuromoji-ko

**Pure JavaScript Korean Morphological Analyzer**

A port of [kuromoji.js](https://github.com/takuyaa/kuromoji.js) adapted for Korean language processing using [mecab-ko-dic](https://bitbucket.org/eunjeon/mecab-ko-dic).

## Features

- 🚀 Pure JavaScript - runs in Node.js, browsers, and serverless (Vercel, Cloudflare Workers)
- 📦 No native dependencies - no compilation required
- 🇰🇷 Korean-optimized - uses mecab-ko-dic with Sejong tagset
- ⚡ Viterbi algorithm - accurate morphological analysis
- 🔧 Simple API - tokenize Korean text in a few lines

## Installation

```bash
npm install kuromoji-ko
```

## Quick Start

### napi-mecab Compatible API (Recommended)

```javascript
import { MeCab } from 'kuromoji-ko';

const mecab = await MeCab.create({ engine: 'ko', dictPath: './dict' });
const tokens = mecab.parse('안녕하세요');

for (const token of tokens) {
  console.log(token.surface, token.pos, token.lemma);
}
// 안녕 ['NNG'] 안녕
// 하 ['XSV'] 하다
// 세요 ['EF'] 세요
```

### Classic API

```javascript
import kuromoji from 'kuromoji-ko';

const tokenizer = await kuromoji.builder({
  dicPath: './dict'
}).build();

const tokens = tokenizer.tokenize('안녕하세요');

for (const token of tokens) {
  console.log(token.surface_form, token.pos, token.posDescription);
}
// 안녕 NNG 일반 명사
// 하 XSV 동사 파생 접미사
// 세요 EF 종결 어미
```

## Building the Dictionary

Before using kuromoji-ko, you need to build the dictionary files from mecab-ko-dic:

```bash
# Download mecab-ko-dic
git clone https://bitbucket.org/eunjeon/mecab-ko-dic.git

# Build dictionary
npm run build:dict -- ./mecab-ko-dic ./dict
```

This creates binary dictionary files in the `./dict` directory.

## API

### MeCab API (napi-mecab compatible)

#### `MeCab.create(options)`

Create a MeCab instance asynchronously.

```javascript
import { MeCab } from 'kuromoji-ko';

const mecab = await MeCab.create({
  engine: 'ko',      // Only 'ko' is supported
  dictPath: './dict' // Path to dictionary directory
});
```

#### `mecab.parse(text)`

Parse text into an array of Token objects.

```javascript
const tokens = mecab.parse('아버지가방에들어가신다');
tokens.forEach(t => console.log(t.surface, t.pos));
```

### Token Object (napi-mecab compatible)

| Property | Type | Description |
|----------|------|-------------|
| `surface` | `string` | How the token looks in the input text |
| `pos` | `string[]` | Parts of speech as array (split by "+") |
| `lemma` | `string` | Dictionary headword (adds "다" for verbs) |
| `pronunciation` | `string \| null` | How the token is pronounced |
| `hasBatchim` | `boolean \| null` | Whether token has final consonant (받침) |
| `hasJongseong` | `boolean \| null` | Alias for hasBatchim |
| `semanticClass` | `string \| null` | Semantic word class or category |
| `type` | `string \| null` | Token type (Inflect/Compound/Preanalysis) |
| `expression` | `ExpressionToken[] \| null` | Breakdown of compound/inflected tokens |
| `features` | `string` | Raw features string (comma-separated) |
| `raw` | `string` | Raw MeCab output format (surface\tfeatures) |

### ExpressionToken Object

For compound or inflected words, `expression` returns an array of ExpressionToken:

| Property | Type | Description |
|----------|------|-------------|
| `morpheme` | `string` | The normalized token |
| `pos` | `string` | Part of speech |
| `lemma` | `string` | Dictionary form (adds "다" for verbs) |
| `semanticClass` | `string \| null` | Semantic category |

---

### Classic API

#### `kuromoji.builder(options)`

Create a tokenizer builder.

```javascript
const builder = kuromoji.builder({
  dicPath: './dict',      // Path to dictionary directory
  loader: customLoader    // Optional custom file loader
});
```

### `builder.build()`

Build and return the tokenizer (async).

```javascript
const tokenizer = await builder.build();
```

### `tokenizer.tokenize(text)`

Tokenize Korean text into morphemes.

```javascript
const tokens = tokenizer.tokenize('한국어 형태소 분석');
```

### `tokenizer.wakati(text)`

Get just the surface forms as an array.

```javascript
const words = tokenizer.wakati('한국어 형태소 분석');
// ['한국어', '형태소', '분석']
```

### `tokenizer.wakatiString(text)`

Get space-separated surface forms.

```javascript
const str = tokenizer.wakatiString('한국어 형태소 분석');
// '한국어 형태소 분석'
```

## KoreanToken Object (Classic API)

Each token from `tokenizer.tokenize()` has the following properties:

| Property | Description | Example |
|----------|-------------|---------|
| `surface_form` | Surface text | `'한국어'` |
| `word_position` | Position in text (1-indexed) | `1` |
| `word_id` | Dictionary word ID | `12345` |
| `word_type` | KNOWN or UNKNOWN | `'KNOWN'` |
| `pos` | POS tag (Sejong tagset) | `'NNG'` |
| `posDescription` | POS description | `'일반 명사'` |
| `semantic_class` | Semantic category | `'*'` |
| `has_final_consonant` | Ends with 받침? (T/F/*) | `'F'` |
| `reading` | Pronunciation | `'한국어'` |
| `type` | Inflect/Compound/Preanalysis | `'Compound'` |
| `first_pos` | First POS (compounds) | `'NNG'` |
| `last_pos` | Last POS (compounds) | `'NNG'` |
| `expression` | Decomposition | `'한국/NNG/*+어/NNG/*'` |

## Korean POS Tags (Sejong Tagset)

### 체언 (Substantives)
| Tag | Description |
|-----|-------------|
| NNG | 일반 명사 (General noun) |
| NNP | 고유 명사 (Proper noun) |
| NNB | 의존 명사 (Dependent noun) |
| NR | 수사 (Numeral) |
| NP | 대명사 (Pronoun) |

### 용언 (Predicates)
| Tag | Description |
|-----|-------------|
| VV | 동사 (Verb) |
| VA | 형용사 (Adjective) |
| VX | 보조 용언 (Auxiliary) |
| VCP | 긍정 지정사 (Copula 이다) |
| VCN | 부정 지정사 (Negative 아니다) |

### 조사 (Particles)
| Tag | Description |
|-----|-------------|
| JKS | 주격 조사 (Subject) |
| JKO | 목적격 조사 (Object) |
| JKB | 부사격 조사 (Adverbial) |
| JX | 보조사 (Auxiliary particle) |

### 어미 (Endings)
| Tag | Description |
|-----|-------------|
| EP | 선어말 어미 (Pre-final) |
| EF | 종결 어미 (Final) |
| EC | 연결 어미 (Connective) |
| ETN | 명사형 전성 어미 (Nominalizing) |
| ETM | 관형형 전성 어미 (Adnominalizing) |

### 기타 (Others)
| Tag | Description |
|-----|-------------|
| SL | 외국어 (Foreign) |
| SH | 한자 (Chinese characters) |
| SN | 숫자 (Numbers) |
| SW | 기타 기호 (Symbols) |

## Browser Usage

```html
<script type="module">
import kuromoji from 'https://cdn.jsdelivr.net/npm/kuromoji-ko/dist/index.mjs';

const tokenizer = await kuromoji.builder({
  dicPath: 'https://cdn.jsdelivr.net/npm/kuromoji-ko/dict/'
}).build();

console.log(tokenizer.tokenize('안녕하세요'));
</script>
```

## Serverless (Vercel) Usage

kuromoji-ko runs without native dependencies, making it perfect for serverless:

```javascript
// api/tokenize.js
import kuromoji from 'kuromoji-ko';

let tokenizerPromise = null;

function getTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = kuromoji.builder({
      dicPath: './dict'
    }).build();
  }
  return tokenizerPromise;
}

export default async function handler(req, res) {
  const tokenizer = await getTokenizer();
  const tokens = tokenizer.tokenize(req.body.text);
  res.json(tokens);
}
```

## How It Works

kuromoji-ko implements morphological analysis using:

1. **Double-Array TRIE** - Efficient dictionary lookup for surface forms
2. **Viterbi Algorithm** - Dynamic programming to find the optimal segmentation
3. **Connection Costs** - Bigram model for morpheme transitions
4. **Unknown Word Handling** - Character-type based POS estimation

## Credits

- [kuromoji.js](https://github.com/takuyaa/kuromoji.js) - Original Japanese implementation
- [mecab-ko-dic](https://bitbucket.org/eunjeon/mecab-ko-dic) - Korean dictionary
- [MeCab](https://taku910.github.io/mecab/) - Original C++ morphological analyzer

## License

Apache-2.0

Dictionary files (mecab-ko-dic) are also Apache-2.0 licensed.
