import { CharacterClass } from './CharacterClass.js';
import { InvokeDefinitionMap } from './InvokeDefinitionMap.js';
import { SurrogateAwareString } from '../util/SurrogateAwareString.js';

const DEFAULT_CATEGORY = 'DEFAULT';

export interface CategoryMapping {
  start: number;
  end?: number;
  default: string;
  compatible: string[];
}

/**
 * CharacterDefinition - represents char.def file and
 * defines behavior of unknown word processing
 */
export class CharacterDefinition {
  characterCategoryMap: Uint8Array;
  compatibleCategoryMap: Uint32Array;
  invokeDefinitionMap: InvokeDefinitionMap | null;

  constructor() {
    this.characterCategoryMap = new Uint8Array(65536); // for all UCS2 code points
    this.compatibleCategoryMap = new Uint32Array(65536);
    this.invokeDefinitionMap = null;
  }

  /**
   * Load CharacterDefinition from buffers
   */
  static load(
    catMapBuffer: Uint8Array,
    compatCatMapBuffer: Uint32Array,
    invokeDefBuffer: Uint8Array
  ): CharacterDefinition {
    const charDef = new CharacterDefinition();
    charDef.characterCategoryMap = catMapBuffer;
    charDef.compatibleCategoryMap = compatCatMapBuffer;
    charDef.invokeDefinitionMap = InvokeDefinitionMap.load(invokeDefBuffer);
    return charDef;
  }

  static parseCharCategory(
    classId: number,
    parsedCategoryDef: string[]
  ): CharacterClass | null {
    const category = parsedCategoryDef[1];
    const invoke = parseInt(parsedCategoryDef[2], 10);
    const grouping = parseInt(parsedCategoryDef[3], 10);
    const maxLength = parseInt(parsedCategoryDef[4], 10);

    if (!isFinite(invoke) || (invoke !== 0 && invoke !== 1)) {
      console.log('char.def parse error. INVOKE is 0 or 1 in:' + invoke);
      return null;
    }
    if (!isFinite(grouping) || (grouping !== 0 && grouping !== 1)) {
      console.log('char.def parse error. GROUP is 0 or 1 in:' + grouping);
      return null;
    }
    if (!isFinite(maxLength) || maxLength < 0) {
      console.log('char.def parse error. LENGTH is 1 to n:' + maxLength);
      return null;
    }

    const isInvoke = invoke === 1;
    const isGrouping = grouping === 1;

    return new CharacterClass(classId, category, isInvoke, isGrouping, maxLength);
  }

  static parseCategoryMapping(parsedCategoryMapping: string[]): CategoryMapping {
    const start = parseInt(parsedCategoryMapping[1], 10);
    const defaultCategory = parsedCategoryMapping[2];
    const compatibleCategory =
      parsedCategoryMapping.length > 3 ? parsedCategoryMapping.slice(3) : [];

    if (!isFinite(start) || start < 0 || start > 0xffff) {
      console.log('char.def parse error. CODE is invalid:' + start);
    }

    return { start, default: defaultCategory, compatible: compatibleCategory };
  }

  static parseRangeCategoryMapping(parsedCategoryMapping: string[]): CategoryMapping {
    const start = parseInt(parsedCategoryMapping[1], 10);
    const end = parseInt(parsedCategoryMapping[2], 10);
    const defaultCategory = parsedCategoryMapping[3];
    const compatibleCategory =
      parsedCategoryMapping.length > 4 ? parsedCategoryMapping.slice(4) : [];

    if (!isFinite(start) || start < 0 || start > 0xffff) {
      console.log('char.def parse error. CODE is invalid:' + start);
    }
    if (!isFinite(end) || end < 0 || end > 0xffff) {
      console.log('char.def parse error. CODE is invalid:' + end);
    }

    return { start, end, default: defaultCategory, compatible: compatibleCategory };
  }

  /**
   * Initialize category mappings
   */
  initCategoryMappings(categoryMapping: CategoryMapping[] | null): void {
    if (categoryMapping != null && this.invokeDefinitionMap != null) {
      for (let i = 0; i < categoryMapping.length; i++) {
        const mapping = categoryMapping[i];
        const end = mapping.end ?? mapping.start;

        for (let codePoint = mapping.start; codePoint <= end; codePoint++) {
          // Default Category class ID
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
  lookupCompatibleCategory(ch: string): CharacterClass[] {
    const classes: CharacterClass[] = [];

    const code = ch.charCodeAt(0);
    let integer: number | undefined;
    if (code < this.compatibleCategoryMap.length) {
      integer = this.compatibleCategoryMap[code];
    }

    if (integer == null || integer === 0) {
      return classes;
    }

    for (let bit = 0; bit < 32; bit++) {
      if (((integer << (31 - bit)) >>> 31) === 1) {
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
  lookup(ch: string): CharacterClass | undefined {
    let classId: number | null = null;

    const code = ch.charCodeAt(0);
    if (SurrogateAwareString.isSurrogatePair(ch)) {
      // Surrogate pair character codes can not be defined by char.def
      classId = this.invokeDefinitionMap?.lookup(DEFAULT_CATEGORY) ?? null;
    } else if (code < this.characterCategoryMap.length) {
      classId = this.characterCategoryMap[code];
    }

    if (classId == null) {
      classId = this.invokeDefinitionMap?.lookup(DEFAULT_CATEGORY) ?? null;
    }

    if (classId == null) {
      return undefined;
    }

    return this.invokeDefinitionMap?.getCharacterClass(classId);
  }
}
