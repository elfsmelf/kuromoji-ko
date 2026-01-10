import { ByteBuffer } from '../util/ByteBuffer.js';
import { CharacterClass } from './CharacterClass.js';
import { CharacterDefinition } from './CharacterDefinition.js';
import { TokenInfoDictionary } from './TokenInfoDictionary.js';

/**
 * UnknownDictionary - dictionary for unknown words
 */
export class UnknownDictionary extends TokenInfoDictionary {
  characterDefinition: CharacterDefinition | null;

  constructor() {
    super();
    this.characterDefinition = null;
  }

  setCharacterDefinition(characterDefinition: CharacterDefinition): this {
    this.characterDefinition = characterDefinition;
    return this;
  }

  lookup(ch: string): CharacterClass | undefined {
    return this.characterDefinition?.lookup(ch);
  }

  lookupCompatibleCategory(ch: string): CharacterClass[] {
    return this.characterDefinition?.lookupCompatibleCategory(ch) ?? [];
  }

  loadUnknownDictionaries(
    unkBuffer: Uint8Array,
    unkPosBuffer: Uint8Array,
    unkMapBuffer: Uint8Array,
    catMapBuffer: Uint8Array,
    compatCatMapBuffer: Uint32Array,
    invokeDefBuffer: Uint8Array
  ): void {
    this.loadDictionary(unkBuffer);
    this.loadPosVector(unkPosBuffer);
    this.loadTargetMap(unkMapBuffer);
    this.characterDefinition = CharacterDefinition.load(
      catMapBuffer,
      compatCatMapBuffer,
      invokeDefBuffer
    );
  }
}
