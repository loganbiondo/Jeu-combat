import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outJs = path.join(root, 'assets', 'game.bundle.js');
const outHtmlMod = path.join(root, 'src', 'gameHtml.ts');

await esbuild.build({
  entryPoints: [path.join(root, 'game', 'mobile-entry.js')],
  bundle: true,
  outfile: outJs,
  format: 'iife',
  platform: 'browser',
  target: ['es2018'],
  minify: false,
  sourcemap: false
});

const js = fs.readFileSync(outJs, 'utf8');
const css = `
  html,body{margin:0;height:100%;background:#07111f;overflow:hidden}
  #wrap{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
  canvas{background:#0b1d3a;max-width:100%;max-height:100%}
`;

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>${css}</style>
</head>
<body>
<div id="wrap"><canvas id="game" width="1280" height="720"></canvas></div>
<script>
${js}
</script>
</body>
</html>`;

const escaped = JSON.stringify(html);
fs.writeFileSync(
  outHtmlMod,
  `/** Auto-généré par scripts/build-game.mjs — ne pas éditer à la main */\nexport const GAME_HTML = ${escaped};\n`
);
console.log('Built', outJs, '→', outHtmlMod, `(${Math.round(html.length / 1024)} KB html)`);
