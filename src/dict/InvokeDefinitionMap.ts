import { ByteBuffer } from '../util/ByteBuffer.js';
import { CharacterClass } from './CharacterClass.js';

/**
 * InvokeDefinitionMap - represents invoke definition part of char.def
 */
export class InvokeDefinitionMap {
  map: CharacterClass[];
  lookupTable: Record<string, number>;

  constructor() {
    this.map = [];
    this.lookupTable = {};
  }

  /**
   * Load InvokeDefinitionMap from buffer
   */
  static load(invokeDefBuffer: Uint8Array): InvokeDefinitionMap {
    const invokeDef = new InvokeDefinitionMap();
    const characterCategoryDefinition: CharacterClass[] = [];

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
  init(characterCategoryDefinition: CharacterClass[] | null): void {
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
  getCharacterClass(classId: number): CharacterClass | undefined {
    return this.map[classId];
  }

  /**
   * Lookup class ID by class name
   */
  lookup(className: string): number | null {
    const classId = this.lookupTable[className];
    if (classId == null) {
      return null;
    }
    return classId;
  }

  /**
   * Transform from map to binary buffer
   */
  toBuffer(): Uint8Array {
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
}
