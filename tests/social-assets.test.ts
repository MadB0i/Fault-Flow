import { describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { PNG } from 'pngjs';
import { ATLAS_URL } from '../src/shared/site.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
describe('static social and app assets', () => {
  it('uses the public canonical URL and a large-image social card', () => {
    expect(html).toContain(`rel="canonical" href="${ATLAS_URL}"`);
    expect(html).toMatch(
      new RegExp(
        `property="og:image"\\s+content="${ATLAS_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}social-preview.png"`,
      ),
    );
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="630"');
  });
  it('keeps icon paths relative to the deployment base', () => {
    for (const icon of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'])
      expect(html).toContain(`href="%BASE_URL%${icon}"`);
  });
  it.each([
    ['social-preview.png', 1200, 630],
    ['favicon-32.png', 32, 32],
    ['apple-touch-icon.png', 180, 180],
    ['app-icon-192.png', 192, 192],
    ['app-icon-512.png', 512, 512],
  ] as const)('ships a correctly sized, small %s', (name, width, height) => {
    const file = new URL(`../public/${name}`, import.meta.url);
    const image = PNG.sync.read(readFileSync(file));
    expect([image.width, image.height]).toEqual([width, height]);
    expect(statSync(file).size).toBeLessThan(5 * 1024 * 1024);
  });
});
