const fs = require('fs');
const path = require('path');
const baseUrl = process.env.ELECTRON_UPDATER_BASE_URL || '';
const outPath = path.join(__dirname, '../electron/updater-config.generated.js');
fs.writeFileSync(outPath, `// Generated at build time. Set ELECTRON_UPDATER_BASE_URL to use generic update server.\nmodule.exports = { baseUrl: ${JSON.stringify(baseUrl)} };\n`);
console.log('Updater config:', baseUrl ? `generic ${baseUrl}` : 'GitHub (default)');
