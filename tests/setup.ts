import { afterEach, vi } from 'vitest';

process.on('warning', (warning) => {
  if (warning.name !== 'ExperimentalWarning' || !warning.message.includes('SQLite')) {
    console.warn(warning);
  }
});

afterEach(() => {
  vi.restoreAllMocks();
});
