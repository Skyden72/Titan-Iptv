import type { TitonBridge } from './ipc';

declare global {
  interface Window {
    titon: TitonBridge;
  }
}

export {};
