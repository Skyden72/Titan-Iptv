export * from './types/app';

declare global {
  interface Window {
    titon: import('./shared/ipc').TitonBridge;
  }
}

export {};
