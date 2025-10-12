// Ambient module declarations to satisfy IDE/TypeScript language service for modules without types
// You can expand these with more precise types later.

declare module 'wav' {
  import { Writable } from 'stream';
  export class FileWriter extends Writable {
    constructor(filename: string, opts?: any);
    write(chunk: any, encoding?: string, cb?: (...args: any[]) => void): boolean;
    end(chunk?: any, encoding?: string, cb?: (...args: any[]) => void): void;
    destroy(): void;
    on(event: string, listener: (...args: any[]) => void): this;
  }
  const _default: any;
  export default _default;
}

declare module 'mic' {
  const mic: any;
  export default mic;
}

declare module 'onnxruntime-node' {
  const ort: any;
  export default ort;
}

declare module 'fft-js' {
  const fft: any;
  export default fft;
}

declare module '@jrg-voice/common' {
  // re-export whatever is used in the repo as `any` for now
  export function transcribeWithWhisper(...args: any[]): any;
  export function newDetectorState(...args: any[]): any;
  export function fillMelBufferWithZeros(...args: any[]): any;
  const _default: any;
  export default _default;
}

// Generic declaration for any other untyped packages to silence IDE noise
declare module '*';

