const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '../../..');
const svgPath = path.join(projectRoot, 'assets/emax-icon.svg');
const outDir = path.join(__dirname, '../build/icons');
const pngPath = path.join(outDir, 'icon.png');

if (!fs.existsSync(svgPath)) {
  console.error('SVG not found:', svgPath);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

sharp(svgPath)
  .resize(1024, 1024)
  .png()
  .toFile(pngPath)
  .then(() => console.log('Icon built:', pngPath))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
