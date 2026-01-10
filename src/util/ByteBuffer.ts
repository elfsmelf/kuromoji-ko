/**
 * Convert String (UTF-16) to UTF-8 ArrayBuffer
 */
function stringToUtf8Bytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length * 4);
  let i = 0;
  let j = 0;

  while (i < str.length) {
    let unicodeCode: number;
    const utf16Code = str.charCodeAt(i++);

    if (utf16Code >= 0xd800 && utf16Code <= 0xdbff) {
      // surrogate pair
      const upper = utf16Code;
      const lower = str.charCodeAt(i++);

      if (lower >= 0xdc00 && lower <= 0xdfff) {
        unicodeCode = (upper - 0xd800) * (1 << 10) + (1 << 16) + (lower - 0xdc00);
      } else {
        throw new Error('Malformed surrogate pair');
      }
    } else {
      unicodeCode = utf16Code;
    }

    if (unicodeCode < 0x80) {
      bytes[j++] = unicodeCode;
    } else if (unicodeCode < 1 << 11) {
      bytes[j++] = (unicodeCode >>> 6) | 0xc0;
      bytes[j++] = (unicodeCode & 0x3f) | 0x80;
    } else if (unicodeCode < 1 << 16) {
      bytes[j++] = (unicodeCode >>> 12) | 0xe0;
      bytes[j++] = ((unicodeCode >> 6) & 0x3f) | 0x80;
      bytes[j++] = (unicodeCode & 0x3f) | 0x80;
    } else if (unicodeCode < 1 << 21) {
      bytes[j++] = (unicodeCode >>> 18) | 0xf0;
      bytes[j++] = ((unicodeCode >> 12) & 0x3f) | 0x80;
      bytes[j++] = ((unicodeCode >> 6) & 0x3f) | 0x80;
      bytes[j++] = (unicodeCode & 0x3f) | 0x80;
    }
  }

  return bytes.subarray(0, j);
}

/**
 * Convert UTF-8 ArrayBuffer to String (UTF-16)
 */
function utf8BytesToString(bytes: number[] | Uint8Array): string {
  let str = '';
  let i = 0;

  while (i < bytes.length) {
    const b1 = bytes[i++];
    let code: number;

    if (b1 < 0x80) {
      code = b1;
    } else if (b1 >> 5 === 0x06) {
      const b2 = bytes[i++];
      code = ((b1 & 0x1f) << 6) | (b2 & 0x3f);
    } else if (b1 >> 4 === 0x0e) {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      code = ((b1 & 0x0f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
    } else {
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      const b4 = bytes[i++];
      code = ((b1 & 0x07) << 18) | ((b2 & 0x3f) << 12) | ((b3 & 0x3f) << 6) | (b4 & 0x3f);
    }

    if (code < 0x10000) {
      str += String.fromCharCode(code);
    } else {
      // surrogate pair
      code -= 0x10000;
      const upper = 0xd800 | (code >> 10);
      const lower = 0xdc00 | (code & 0x3ff);
      str += String.fromCharCode(upper, lower);
    }
  }

  return str;
}

/**
 * ByteBuffer - Utilities to manipulate byte sequences
 */
export class ByteBuffer {
  buffer: Uint8Array;
  position: number;

  constructor(arg?: number | Uint8Array | ArrayBuffer) {
    if (arg == null) {
      this.buffer = new Uint8Array(1024 * 1024);
      this.position = 0;
    } else if (typeof arg === 'number') {
      this.buffer = new Uint8Array(arg);
      this.position = 0;
    } else if (arg instanceof Uint8Array) {
      this.buffer = arg;
      this.position = 0;
    } else if (arg instanceof ArrayBuffer) {
      this.buffer = new Uint8Array(arg);
      this.position = 0;
    } else {
      throw new Error('Invalid parameter type for ByteBuffer constructor');
    }
  }

  size(): number {
    return this.buffer.length;
  }

  reallocate(): void {
    const newArray = new Uint8Array(this.buffer.length * 2);
    newArray.set(this.buffer);
    this.buffer = newArray;
  }

  shrink(): Uint8Array {
    this.buffer = this.buffer.subarray(0, this.position);
    return this.buffer;
  }

  put(b: number): void {
    if (this.buffer.length < this.position + 1) {
      this.reallocate();
    }
    this.buffer[this.position++] = b;
  }

  get(index?: number): number {
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
  putShort(num: number): void {
    if (0xffff < num) {
      throw new Error(`${num} is over short value`);
    }
    const lower = 0x00ff & num;
    const upper = (0xff00 & num) >> 8;
    this.put(lower);
    this.put(upper);
  }

  // Read short from buffer (little endian)
  getShort(index?: number): number {
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
    if (value & 0x8000) {
      value = -((value - 1) ^ 0xffff);
    }
    return value;
  }

  // Write integer to buffer (little endian)
  putInt(num: number): void {
    if (0xffffffff < num) {
      throw new Error(`${num} is over integer value`);
    }
    const b0 = 0x000000ff & num;
    const b1 = (0x0000ff00 & num) >> 8;
    const b2 = (0x00ff0000 & num) >> 16;
    const b3 = (0xff000000 & num) >> 24;
    this.put(b0);
    this.put(b1);
    this.put(b2);
    this.put(b3);
  }

  // Read integer from buffer (little endian)
  getInt(index?: number): number {
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

    return ((b3 << 24) >>> 0) + (b2 << 16) + (b1 << 8) + b0;
  }

  readInt(): number {
    const pos = this.position;
    this.position += 4;
    return this.getInt(pos);
  }

  putString(str: string): void {
    const bytes = stringToUtf8Bytes(str);
    for (let i = 0; i < bytes.length; i++) {
      this.put(bytes[i]);
    }
    // put null character as terminal
    this.put(0);
  }

  getString(index?: number): string {
    const buf: number[] = [];
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
}
