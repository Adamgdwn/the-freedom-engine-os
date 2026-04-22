type BufferSourceLike = ArrayBuffer | ArrayBufferView;
type TextEncoderLike = {
  readonly encoding: string;
  encode(input?: string): Uint8Array;
};
type TextDecoderLike = {
  readonly encoding: string;
  readonly fatal: boolean;
  readonly ignoreBOM: boolean;
  decode(input?: BufferSourceLike): string;
};
type TextEncoderConstructor = new () => TextEncoderLike;
type TextDecoderConstructor = new () => TextDecoderLike;
type TextEncodingRuntime = typeof globalThis & {
  TextDecoder?: TextDecoderConstructor;
  TextEncoder?: TextEncoderConstructor;
};

function encodeUtf8(value: string): Uint8Array {
  const bytes: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index);
    if (typeof codePoint === "undefined") {
      continue;
    }

    if (codePoint > 0xffff) {
      index += 1;
    }

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
      continue;
    }

    if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6));
      bytes.push(0x80 | (codePoint & 0x3f));
      continue;
    }

    if (codePoint <= 0xffff) {
      bytes.push(0xe0 | (codePoint >> 12));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
      continue;
    }

    bytes.push(0xf0 | (codePoint >> 18));
    bytes.push(0x80 | ((codePoint >> 12) & 0x3f));
    bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
    bytes.push(0x80 | (codePoint & 0x3f));
  }

  return new Uint8Array(bytes);
}

function decodeUtf8(bytes: Uint8Array): string {
  let output = "";
  let index = 0;

  while (index < bytes.length) {
    const byte1 = bytes[index++] ?? 0;

    if ((byte1 & 0x80) === 0) {
      output += String.fromCodePoint(byte1);
      continue;
    }

    if ((byte1 & 0xe0) === 0xc0) {
      const byte2 = bytes[index++] ?? 0;
      output += String.fromCodePoint(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
      continue;
    }

    if ((byte1 & 0xf0) === 0xe0) {
      const byte2 = bytes[index++] ?? 0;
      const byte3 = bytes[index++] ?? 0;
      output += String.fromCodePoint(((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f));
      continue;
    }

    const byte2 = bytes[index++] ?? 0;
    const byte3 = bytes[index++] ?? 0;
    const byte4 = bytes[index++] ?? 0;
    output += String.fromCodePoint(
      ((byte1 & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f)
    );
  }

  return output;
}

function normalizeBufferSource(input?: BufferSourceLike): Uint8Array {
  if (typeof input === "undefined") {
    return new Uint8Array(0);
  }

  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }

  return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
}

export function encodeTextUtf8(value: string): Uint8Array {
  return encodeUtf8(String(value));
}

export function decodeTextUtf8(input?: BufferSourceLike): string {
  return decodeUtf8(normalizeBufferSource(input));
}

function installTextEncodingPolyfill(): void {
  const runtime = globalThis as TextEncodingRuntime;

  if (typeof runtime.TextEncoder === "undefined") {
    class TextEncoderPolyfill {
      readonly encoding = "utf-8";

      encode(input = ""): Uint8Array {
        return encodeUtf8(String(input));
      }
    }

    Object.defineProperty(runtime, "TextEncoder", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: TextEncoderPolyfill
    });
  }

  if (typeof runtime.TextDecoder === "undefined") {
    class TextDecoderPolyfill {
      readonly encoding = "utf-8";
      readonly fatal = false;
      readonly ignoreBOM = false;

      decode(input?: BufferSourceLike): string {
        return decodeTextUtf8(input);
      }
    }

    Object.defineProperty(runtime, "TextDecoder", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: TextDecoderPolyfill
    });
  }
}

installTextEncodingPolyfill();
