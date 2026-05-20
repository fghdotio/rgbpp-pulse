import { Buffer } from 'buffer';

if (typeof (globalThis as unknown as Record<string, unknown>).Buffer === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).Buffer = Buffer;
}

if (typeof (globalThis as unknown as Record<string, unknown>).process === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).process = { env: {} } as unknown as NodeJS.Process;
}
