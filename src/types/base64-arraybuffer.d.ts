declare module 'base64-arraybuffer' {
  export function decode(base64: string): ArrayBuffer;
  export function encode(buffer: ArrayBuffer): string;
} 