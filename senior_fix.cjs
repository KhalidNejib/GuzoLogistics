const fs = require('fs');
const path = require('path');

const projects = [
  'package.json',
  'apps/web-dashboard/package.json',
  'apps/mobile-rider/package.json',
  'services/api/package.json',
  'packages/env/package.json',
  'packages/types/package.json'
];

function patch(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;

  const deps = [content.dependencies, content.devDependencies];
  deps.forEach(d => {
    if (!d) return;
    Object.keys(d).forEach(k => {
      if (d[k] === 'workspace:*') {
        // Calculate relative path
        let relPath = '';
        if (k === '@ethio-logistics/env') relPath = 'packages/env';
        if (k === '@ethio-logistics/types') relPath = 'packages/types';
        
        // Adjust for current file deepness
        const deepness = filePath.split('/').length - 1;
        const prefix = deepness === 0 ? './' : '../'.repeat(deepness);
        d[k] = `file:${prefix}${relPath}`;
        changed = true;
      }
    });
  });

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    console.log(`✅ Patched: ${filePath}`);
  }
}

projects.forEach(patch);
