import { createRequire } from 'module';
const require = createRequire('/opt/npm-tools/node_modules/');
const esbuild = require('esbuild');
import fs from 'fs';

const result = await esbuild.build({
  entryPoints: ['src/entry.tsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2019',
  charset: 'utf8',
  write: false,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: { 'lucide-react': './src/lucide-shim.tsx' },
  nodePaths: ['/home/claude/.npm-global/lib/node_modules'],
  logLevel: 'warning'
});
let js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = `<title>NewXen Fashion</title>
<style>
  html { scroll-behavior: smooth; }
  body { background: #f8fafc; color: #0f172a; font-family: 'Inter', 'Hind Siliguri', system-ui, sans-serif; margin: 0; }
  .overflow-x-auto { scrollbar-width: none; }
  .overflow-x-auto::-webkit-scrollbar { display: none; }
</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800;900&display=swap">
<script src="https://cdn.tailwindcss.com/3.4.17"></script>
<script>tailwind.config = { theme: { extend: { fontFamily: { sans: ['Inter', 'Hind Siliguri', 'system-ui', 'sans-serif'] } } } }</script>
<div id="root"></div>
<script>${js}</script>
`;
fs.writeFileSync('dist/index.html', html);
console.log('bytes', html.length);

// ---- GitHub Pages build: same page, plus config.js (Supabase keys) loaded before the app
fs.mkdirSync('dist-github', { recursive: true });
const gh = html
  .replace('<title>NewXen Fashion</title>', '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>NewXen (নিউজেন) – Women\'s Fashion</title>')
  .replace('<div id="root"></div>', '<div id="root"></div>\n<script src="config.js"></script>');
fs.writeFileSync('dist-github/index.html', gh);
fs.copyFileSync('github/config.js', 'dist-github/config.js');
console.log('github build ok');
