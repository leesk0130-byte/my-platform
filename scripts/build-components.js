/**
 * Concatenate src/components/ui and layout into js/components.js for single script load.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const UI_DIR = path.join(ROOT, 'src', 'components', 'ui');
const LAYOUT_DIR = path.join(ROOT, 'src', 'components', 'layout');
const OUT = path.join(ROOT, 'js', 'components.js');

const uiOrder = ['Button.js', 'Card.js', 'Badge.js', 'ListItem.js', 'Tabs.js', 'Input.js', 'Skeleton.js', 'EmptyState.js', 'ErrorState.js', 'NotFoundState.js'];
const layoutOrder = ['Container.js', 'Sidebar.js'];

function read(dir, names) {
  return names.map(name => {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) return '';
    return fs.readFileSync(file, 'utf8');
  }).filter(Boolean).join('\n');
}

const ui = read(UI_DIR, uiOrder);
const layout = read(LAYOUT_DIR, layoutOrder);
const out = '/* Built from src/components/ui and layout - do not edit directly */\n\n' + ui + '\n' + layout + '\n';

fs.writeFileSync(OUT, out, 'utf8');
console.log('Wrote js/components.js');
