import fs from 'fs';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const input = path.join(__dirname, '../public/justelligence-logo.png');
const temp = path.join(__dirname, '../public/justelligence-logo.tmp.png');

/** Pixels darker than this become fully transparent */
const HARD_CUTOFF = 55;
/** Smooth edge fade for near-black anti-aliasing */
const SOFT_CUTOFF = 95;

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const brightness = Math.max(r, g, b);

  if (brightness <= HARD_CUTOFF) {
    data[i + 3] = 0;
  } else if (brightness <= SOFT_CUTOFF) {
    const fade = (brightness - HARD_CUTOFF) / (SOFT_CUTOFF - HARD_CUTOFF);
    data[i + 3] = Math.round(Math.min(255, data[i + 3] * fade));
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toFile(temp);

fs.renameSync(temp, input);
console.log('Transparent logo saved:', input);
