import type { Mode } from '../shared/types.js';
import type { AtlasCopy } from '../shared/i18n/atlas.js';
import { GEOLOGY_SOURCE } from '../shared/flood-history.js';
import { ATLAS_URL } from '../shared/site.js';

export function downloadImage(png: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = png;
  link.click();
}

/** A shareable 9:16 composition. Preview the central crop and wrap every credit. */
export async function createAtlasStory(
  png: string,
  mode: Mode,
  copy: AtlasCopy,
  context: { title: string; attribution: string; note: string; height: string },
  format: 'portrait' | 'landscape' = 'portrait',
): Promise<string> {
  await document.fonts.ready;
  const img = new Image();
  img.src = png;
  await img.decode();
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  if (format === 'landscape') return createLandscapeCard(img, mode, copy, context, token);
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const accent = token(mode === 'flow' ? '--water' : '--seismic-amber');
  const font = token('--font-ui');
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color: string,
    width = 936,
    lineHeight = size * 1.4,
    face = font,
  ) => {
    ctx.font = `${size}px ${face}`;
    ctx.fillStyle = color;
    let line = '';
    for (const word of value.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > width) {
        ctx.fillText(line, x, y);
        y += lineHeight;
        line = word;
      } else line = next;
    }
    if (line) ctx.fillText(line, x, y);
    return y + lineHeight;
  };
  ctx.fillStyle = token('--bg');
  ctx.fillRect(0, 0, 1080, 1920);
  ctx.fillStyle = accent;
  ctx.fillRect(72, 64, 64, 8);
  text('Fault & Flow', 72, 136, 40, token('--text'), 936, 56, token('--font-display'));
  text(copy.storyKicker, 72, 208, 22, accent);
  text(
    mode === 'plates' ? copy.platesTitle : context.title,
    72,
    298,
    72,
    token('--text'),
    936,
    88,
    token('--font-display'),
  );
  text(copy[mode], 72, 432, 28, accent);
  // A labelled central detail fills the portrait. The share sheet previews the
  // exact crop; the separate map export retains the whole original viewport.
  const scale = Math.max(1080 / img.width, 688 / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 480, 1080, 688);
  ctx.clip();
  ctx.drawImage(img, (1080 - w) / 2, 480 + (688 - h) / 2, w, h);
  ctx.restore();
  text(`${copy.storyCrop} · ${context.height}`, 72, 1216, 20, token('--text-muted'));
  let y = text(
    copy.storyExplore,
    72,
    1296,
    40,
    token('--text'),
    936,
    52,
    token('--font-display'),
  );
  y = text(context.note, 72, y + 16, 24, token('--text-muted'), 936, 34);
  y = text(copy.disclaimer, 72, y + 16, 24, accent, 936, 34);
  const limit =
    mode === 'flow'
      ? copy.scenarioNote
      : mode === 'fault'
        ? `${copy.noPrediction} ${copy.quakeNote} ${copy.motionNote}`
        : copy.platesNote;
  y = text(limit, 72, y + 8, 20, token('--text-muted'), 936, 28);
  const credits = [
    ...(mode === 'plates'
      ? [`${copy.geologySource} · ${GEOLOGY_SOURCE}`]
      : [context.attribution, copy.riverCredit]),
    ...(mode === 'fault' ? [copy.usgsCredit] : []),
    ...(mode === 'plates'
      ? []
      : [
          '© OpenStreetMap contributors · ODbL · https://www.openstreetmap.org/copyright',
        ]),
  ]
    .filter(Boolean)
    .join(' ');
  text(credits, 72, Math.max(y + 16, 1672), 18, token('--text-muted'), 936, 25);
  text(ATLAS_URL.replace('https://', ''), 72, 1880, 20, accent);
  return canvas.toDataURL('image/png');
}

/** The entire captured viewport, fitted rather than cropped; credits are baked into the PNG. */
function createLandscapeCard(
  image: HTMLImageElement,
  mode: Mode,
  copy: AtlasCopy,
  context: { title: string; attribution: string; note: string; height: string },
  token: (name: string) => string,
) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const accent = token(mode === 'flow' ? '--water' : '--seismic-amber');
  const write = (
    value: string,
    x: number,
    y: number,
    width: number,
    size: number,
    color: string,
    display = false,
    bottom = Infinity,
  ) => {
    ctx.fillStyle = color;
    let lines: string[] = [];
    // Fit dense bilingual context into its reserved column, preserving all words.
    do {
      ctx.font = `${size}px ${token(display ? '--font-display' : '--font-ui')}`;
      lines = [];
      let line = '';
      for (const word of value.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(next).width > width) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      if (line) lines.push(line);
      if (y + lines.length * size * 1.4 <= bottom || size <= 12) break;
      size -= 1;
    } while (size >= 12);
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * size * 1.4));
    return y + lines.length * size * 1.4;
  };
  ctx.fillStyle = token('--bg');
  ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = accent;
  ctx.fillRect(32, 24, 48, 4);
  write('Fault & Flow', 32, 76, 720, 40, token('--text'), true);
  write(`${copy.flow} · ${copy.fault}`, 32, 104, 720, 16, accent);
  ctx.fillStyle = token('--sky-low');
  ctx.fillRect(32, 128, 720, 312);
  const scale = Math.min(720 / image.width, 312 / image.height);
  ctx.drawImage(
    image,
    32 + (720 - image.width * scale) / 2,
    128 + (312 - image.height * scale) / 2,
    image.width * scale,
    image.height * scale,
  );
  let y = write(context.title, 800, 160, 368, 32, token('--text'), true, 240);
  y = write(copy[mode], 800, y + 16, 368, 18, accent);
  y = write(context.note, 800, y + 16, 368, 16, token('--text-muted'), false, 368);
  write(context.height, 32, 466, 720, 14, token('--text-muted'));
  write(copy.disclaimer, 32, 494, 1136, 14, accent);
  const credits =
    mode === 'plates'
      ? `${copy.geologySource} · ${GEOLOGY_SOURCE}`
      : `${context.attribution} ${copy.riverCredit} ${mode === 'fault' ? copy.usgsCredit : ''} © OpenStreetMap contributors · ODbL · openstreetmap.org/copyright`;
  write(credits, 32, 526, 1136, 12, token('--text-muted'));
  write(ATLAS_URL.replace('https://', ''), 800, 76, 368, 16, accent);
  // The same permanent honesty framing as the portrait, kept near the selected context.
  const limit =
    mode === 'fault'
      ? copy.noPrediction
      : mode === 'flow'
        ? copy.scenarioNote
        : copy.platesNote;
  write(limit, 800, Math.max(y + 8, 392), 368, 13, token('--text-muted'), false, 446);
  return canvas.toDataURL('image/png');
}

/** Local download only. Include the notice and mandatory adapted-DEM credit. */
export async function saveAtlasImage(
  png: string,
  mode: Mode,
  copy: AtlasCopy,
  context: { attribution: string; note: string },
) {
  const img = new Image();
  img.src = png;
  await img.decode();
  const style = getComputedStyle(document.documentElement);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(img.width, 1000);
  const footerHeight = 260;
  canvas.height = Math.round((img.height * canvas.width) / img.width) + footerHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = style.getPropertyValue('--bg').trim();
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const mapHeight = canvas.height - footerHeight;
  ctx.drawImage(img, 0, 0, canvas.width, mapHeight);
  ctx.fillStyle = style.getPropertyValue('--text').trim();
  ctx.font = `${style.getPropertyValue('--step-0').trim()} ${style.getPropertyValue('--font-ui').trim()}`;
  const lines = [
    `Fault & Flow · ${copy[mode]}`,
    copy.disclaimer,
    mode === 'fault'
      ? `${copy.noPrediction} ${copy.quakeNote} ${copy.motionNote}`
      : mode === 'plates'
        ? copy.platesNote
        : copy.scenarioNote,
    context.note,
    context.attribution,
    `${copy.riverCredit} ${copy.usgsCredit}`,
    ...(mode === 'plates'
      ? []
      : [
          '© OpenStreetMap contributors · ODbL · https://www.openstreetmap.org/copyright',
        ]),
    mode === 'fault' ? copy.catalogueNote : copy.riverNote,
  ];
  lines.forEach((line, i) =>
    ctx.fillText(line, 24, mapHeight + 30 + i * 28, canvas.width - 48),
  );
  const link = document.createElement('a');
  link.download = `fault-and-flow-${mode}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
