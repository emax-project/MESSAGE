const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const png2icons = require('png2icons');

const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'assets', 'emax-icon.svg');
const pngSourcePath = path.join(root, 'assets', 'icon', 'emax-logo.png');
const outDir = path.join(root, 'assets', 'icon');
const buildDir = path.join(root, 'packages', 'client', 'build', 'icons');

/** macOS 스타일 둥근 모서리 적용 (radius ≈ 22%) */
function roundedRectMask(size) {
  const radius = Math.max(2, Math.round(size * 0.22));
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/>
</svg>`;
  return Buffer.from(svg);
}

async function applyRoundedCorners(inputBuffer, size) {
  const maskSvg = roundedRectMask(size);
  return sharp(inputBuffer)
    .resize(size, size)
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function main() {
  const usePng = fs.existsSync(pngSourcePath);
  const inputPath = usePng ? pngSourcePath : svgPath;
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Missing source: ${inputPath}`);
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(buildDir, { recursive: true });

  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
  const inputBuffer = fs.readFileSync(inputPath);

  for (const size of sizes) {
    const outPng = path.join(outDir, `icon-${size}.png`);
    const rounded = await applyRoundedCorners(inputBuffer, size);
    await fs.promises.writeFile(outPng, rounded);
  }

  // base png (512, 둥근 모서리 적용)
  const icon512 = await applyRoundedCorners(inputBuffer, 512);
  await fs.promises.writeFile(path.join(outDir, 'icon.png'), icon512);

  const base1024 = fs.readFileSync(path.join(outDir, 'icon-1024.png'));
  const ico = png2icons.createICO(base1024, png2icons.BICUBIC, false, true);
  if (!ico) throw new Error('ICO generation failed');
  fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);

  const icns = png2icons.createICNS(base1024, png2icons.BICUBIC, false, true);
  if (!icns) throw new Error('ICNS generation failed');
  fs.writeFileSync(path.join(outDir, 'icon.icns'), icns);

  // copy to build/icons
  fs.copyFileSync(path.join(outDir, 'icon.icns'), path.join(buildDir, 'icon.icns'));
  fs.copyFileSync(path.join(outDir, 'icon.ico'), path.join(buildDir, 'icon.ico'));
  fs.copyFileSync(path.join(outDir, 'icon.png'), path.join(buildDir, 'icon.png'));

  console.log('Icons generated:', buildDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
