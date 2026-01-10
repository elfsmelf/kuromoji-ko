/**
 * CharacterClass - represents a character category for unknown word processing
 */
export class CharacterClass {
  class_id: number;
  class_name: string;
  is_always_invoke: boolean | number;
  is_grouping: boolean | number;
  max_length: number;

  constructor(
    classId: number,
    className: string,
    isAlwaysInvoke: boolean | number,
    isGrouping: boolean | number,
    maxLength: number
  ) {
    this.class_id = classId;
    this.class_name = className;
    this.is_always_invoke = isAlwaysInvoke;
    this.is_grouping = isGrouping;
    this.max_length = maxLength;
  }
}
