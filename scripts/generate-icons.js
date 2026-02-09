const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const png2icons = require('png2icons');

const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'assets', 'emax-icon.svg');
const outDir = path.join(root, 'assets', 'icon');
const buildDir = path.join(root, 'packages', 'client', 'build', 'icons');

async function main() {
  if (!fs.existsSync(svgPath)) {
    throw new Error(`Missing SVG: ${svgPath}`);
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(buildDir, { recursive: true });

  const sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
  const svg = fs.readFileSync(svgPath);

  for (const size of sizes) {
    const outPng = path.join(outDir, `icon-${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(outPng);
  }

  // base png
  await sharp(svg).resize(512, 512).png().toFile(path.join(outDir, 'icon.png'));

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
