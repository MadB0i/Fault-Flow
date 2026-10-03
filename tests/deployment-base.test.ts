import { describe, expect, it } from 'vitest';
import config from '../vite.config.js';

describe('deployment asset base', () => {
  it.each([
    ['development', { command: 'serve', mode: 'development' }, '/'],
    ['build', { command: 'build', mode: 'production' }, '/Fault-and-Flow/'],
    [
      'preview',
      { command: 'serve', mode: 'production', isPreview: true },
      '/Fault-and-Flow/',
    ],
  ] as const)('resolves assets for %s', (_name, environment, expected) => {
    expect(config(environment).base).toBe(expected);
  });
});
