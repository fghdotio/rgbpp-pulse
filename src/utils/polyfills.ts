import { Buffer } from 'buffer';

if (typeof (globalThis as any).Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer;
}

if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = { env: {} } as unknown as NodeJS.Process;
}
