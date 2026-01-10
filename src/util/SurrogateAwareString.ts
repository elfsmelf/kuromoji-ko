/**
 * String wrapper for UTF-16 surrogate pairs (4 bytes)
 */
export class SurrogateAwareString {
  str: string;
  indexMapping: number[];
  length: number;

  constructor(str: string) {
    this.str = str;
    this.indexMapping = [];

    for (let pos = 0; pos < str.length; pos++) {
      const ch = str.charAt(pos);
      this.indexMapping.push(pos);
      if (SurrogateAwareString.isSurrogatePair(ch)) {
        pos++;
      }
    }
    this.length = this.indexMapping.length;
  }

  slice(index: number): string {
    if (this.indexMapping.length <= index) {
      return '';
    }
    const surrogateAwareIndex = this.indexMapping[index];
    return this.str.slice(surrogateAwareIndex);
  }

  charAt(index: number): string {
    if (this.str.length <= index) {
      return '';
    }
    const surrogateAwareStartIndex = this.indexMapping[index];
    const surrogateAwareEndIndex = this.indexMapping[index + 1];

    if (surrogateAwareEndIndex == null) {
      return this.str.slice(surrogateAwareStartIndex);
    }
    return this.str.slice(surrogateAwareStartIndex, surrogateAwareEndIndex);
  }

  charCodeAt(index: number): number {
    if (this.indexMapping.length <= index) {
      return NaN;
    }
    const surrogateAwareIndex = this.indexMapping[index];
    const upper = this.str.charCodeAt(surrogateAwareIndex);

    if (upper >= 0xd800 && upper <= 0xdbff && surrogateAwareIndex < this.str.length) {
      const lower = this.str.charCodeAt(surrogateAwareIndex + 1);
      if (lower >= 0xdc00 && lower <= 0xdfff) {
        return (upper - 0xd800) * 0x400 + lower - 0xdc00 + 0x10000;
      }
    }
    return upper;
  }

  toString(): string {
    return this.str;
  }

  static isSurrogatePair(ch: string): boolean {
    const utf16Code = ch.charCodeAt(0);
    return utf16Code >= 0xd800 && utf16Code <= 0xdbff;
  }
}
