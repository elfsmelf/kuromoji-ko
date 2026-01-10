import { ViterbiNode } from './ViterbiNode.js';
import { ViterbiLattice } from './ViterbiLattice.js';
import { SurrogateAwareString } from '../util/SurrogateAwareString.js';
import { DynamicDictionaries, DoubleArrayTrie } from '../dict/DynamicDictionaries.js';
import { TokenInfoDictionary } from '../dict/TokenInfoDictionary.js';
import { UnknownDictionary } from '../dict/UnknownDictionary.js';

/**
 * ViterbiBuilder - builds word lattice (ViterbiLattice)
 */
export class ViterbiBuilder {
  trie: DoubleArrayTrie;
  tokenInfoDictionary: TokenInfoDictionary;
  unknownDictionary: UnknownDictionary;

  constructor(dic: DynamicDictionaries) {
    this.trie = dic.trie;
    this.tokenInfoDictionary = dic.tokenInfoDictionary;
    this.unknownDictionary = dic.unknownDictionary;
  }

  /**
   * Build word lattice from input text
   */
  build(sentenceStr: string): ViterbiLattice {
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
              'KNOWN',
              leftId,
              rightId,
              key
            )
          );
        }
      }

      // Unknown word processing
      const surrogateAwareTail = new SurrogateAwareString(tail);
      const headChar = new SurrogateAwareString(surrogateAwareTail.charAt(0));
      const headCharClass = this.unknownDictionary.lookup(headChar.toString());

      if (
        vocabulary == null ||
        vocabulary.length === 0 ||
        (headCharClass && headCharClass.is_always_invoke === 1)
      ) {
        // Process unknown word
        let key: string | SurrogateAwareString = headChar;

        if (
          headCharClass &&
          headCharClass.is_grouping === 1 &&
          surrogateAwareTail.length > 1
        ) {
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
                  'UNKNOWN',
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
}
