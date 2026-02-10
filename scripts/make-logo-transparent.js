const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const inputPath = process.argv[2] || path.join(root, 'assets', 'icon', 'emax-logo.png');
const outPublic = path.join(root, 'packages', 'client', 'public', 'emax-logo.png');
const outIcon = path.join(root, 'assets', 'icon', 'emax-logo.png');

// 흰색·밝은 회색(체커보드) → 투명 (낮을수록 더 많은 회색 제거)
const LIGHT_THRESHOLD = 180;

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error('Input not found:', inputPath);
    process.exit(1);
  }

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= LIGHT_THRESHOLD && g >= LIGHT_THRESHOLD && b >= LIGHT_THRESHOLD) {
      data[i + 3] = 0;
    }
  }

  const outImage = sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toBuffer();

  fs.mkdirSync(path.dirname(outPublic), { recursive: true });
  fs.mkdirSync(path.dirname(outIcon), { recursive: true });
  await fs.promises.writeFile(outPublic, await outImage);
  await fs.promises.writeFile(outIcon, await outImage);
  console.log('Saved:', outPublic, outIcon);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
