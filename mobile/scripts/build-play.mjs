import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const repo = path.join(root, '..');
const outJs = path.join(root, 'assets', 'game.bundle.js');
const outHtmlMod = path.join(root, 'src', 'gameHtml.ts');

await esbuild.build({
  entryPoints: [path.join(root, 'game', 'mobile-entry.js')],
  bundle: true,
  outfile: outJs,
  format: 'iife',
  platform: 'browser',
  target: ['es2018'],
  minify: false
});

const js = fs.readFileSync(outJs, 'utf8');
const cssGame = `
  #wrap{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
  canvas#game{background:#0b1d3a;max-width:100%;max-height:100%}
`;

const gameHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${cssGame}</style></head><body><div id="wrap"><canvas id="game" width="1280" height="720"></canvas></div><script>${js}</script></body></html>`;
fs.writeFileSync(outHtmlMod, `export const GAME_HTML = ${JSON.stringify(gameHtml)};\n`);

const play = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"/>
<title>Arena Ki Fighters</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@600;800&family=Nunito:wght@600;800&display=swap" rel="stylesheet"/>
<style>
:root{--bg:#061018;--ink:#f3f7fb;--muted:#9eb6c9;--sun:#f5d657;--cyan:#3ec7f0;--hot:#ff6b8a;--ok:#5ee39a}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font-family:Nunito,system-ui,sans-serif;overflow:hidden;touch-action:manipulation}
#app{height:100%;display:flex;flex-direction:column;position:relative}
.bgfx{position:fixed;inset:0;pointer-events:none;background:
 radial-gradient(ellipse 80% 50% at 80% 10%,rgba(255,107,138,.22),transparent 55%),
 radial-gradient(ellipse 70% 45% at 10% 90%,rgba(62,199,240,.2),transparent 50%),
 linear-gradient(165deg,#061018 0%,#12314a 48%,#1a4a5e 100%);
 animation:hue 14s ease-in-out infinite alternate}
@keyframes hue{from{filter:hue-rotate(0deg)}to{filter:hue-rotate(14deg)}}
.screen{display:none;flex:1;flex-direction:column;padding:22px 18px calc(18px + env(safe-area-inset-bottom));overflow:auto;position:relative;z-index:1}
.screen.on{display:flex}
.brand{font-family:"Exo 2",sans-serif;color:var(--sun);font-weight:800;letter-spacing:.2em;font-size:.78rem;text-shadow:0 0 18px rgba(245,214,87,.35)}
h1{font-family:"Exo 2",sans-serif;font-weight:800;font-size:clamp(2.1rem,8vw,3.2rem);line-height:.98;margin:12px 0 10px;
background:linear-gradient(120deg,#fff 10%,#7dd3fc 45%,#f5d657 85%);-webkit-background-clip:text;background-clip:text;color:transparent}
.sub{color:var(--muted);font-size:1.02rem;line-height:1.4;max-width:28ch;margin:0 0 18px}
.btn{display:block;width:100%;margin:8px 0;padding:15px;border-radius:999px;border:1px solid rgba(125,211,252,.3);
background:rgba(10,20,34,.72);color:var(--ink);font-family:"Exo 2",sans-serif;font-weight:800;font-size:1rem}
.btn.primary{border:0;background:linear-gradient(120deg,#3ec7f0,#f5d657);color:#0b1220;box-shadow:0 10px 28px rgba(62,199,240,.28)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.card{border:2px solid transparent;border-radius:18px;padding:10px;background:rgba(10,20,34,.78);text-align:left;color:inherit;
box-shadow:0 8px 24px rgba(0,0,0,.25)}
.card.on{border-color:var(--sun);box-shadow:0 0 0 1px var(--sun),0 10px 28px rgba(245,214,87,.2)}
.card canvas{width:100%;height:auto;border-radius:12px;display:block;background:#0b1d3a}
.card strong{display:block;margin-top:8px;font-family:"Exo 2",sans-serif}
.card small{color:var(--muted);display:block;line-height:1.25}
#combat{padding:8px;gap:6px;overflow:hidden}
#frameWrap{flex:1;min-height:38vh;border-radius:16px;overflow:hidden;border:1px solid rgba(125,211,252,.35);background:#0b1d3a;position:relative}
${cssGame}
#stage{text-align:center;color:var(--muted);font-size:.8rem;font-weight:800;font-family:"Exo 2",sans-serif}
#log{font-size:.7rem;color:#94a3b8;white-space:nowrap;overflow:auto;min-height:1.2em}
.controls{display:flex;justify-content:space-between;gap:8px}
.pad,.acts{display:flex;flex-wrap:wrap;gap:8px}
.hold{min-width:64px;min-height:56px;border-radius:16px;border:2px solid rgba(125,211,252,.45);background:rgba(10,20,34,.92);color:#fff;font-weight:800;font-family:"Exo 2",sans-serif}
.hold:active{background:rgba(62,199,240,.35);transform:scale(.97)}
.reward{border:1px solid rgba(245,214,87,.45);border-radius:18px;padding:16px;background:
 radial-gradient(circle at 20% 20%,rgba(245,214,87,.16),transparent 50%),rgba(10,20,34,.75)}
.heroArt{height:160px;border-radius:20px;margin:8px 0 16px;overflow:hidden;border:1px solid rgba(125,211,252,.25);position:relative}
.heroArt canvas{width:100%;height:100%}
.fusionCard{margin:10px 0 14px;padding:14px;border-radius:16px;border:1px solid rgba(245,214,87,.5);
background:radial-gradient(circle at 15% 20%,rgba(245,214,87,.18),transparent 50%),rgba(10,20,34,.78)}
.fusionCard strong{display:block;font-family:"Exo 2",sans-serif;color:var(--sun);font-size:1.1rem}
.fusionCard span{color:var(--muted);font-size:.92rem;line-height:1.35}
.btn.fusion{border-color:rgba(245,214,87,.7);color:var(--sun);background:linear-gradient(120deg,rgba(17,24,39,.95),rgba(30,58,95,.9))}
.hold.fusionBtn{border-color:#f5d657;color:#f5d657;min-width:88px}
</style>
</head>
<body>
<div class="bgfx"></div>
<div id="app">
  <section id="home" class="screen on">
    <div class="brand">ARENA KI FIGHTERS</div>
    <h1>Smash doux.<br/>Ki explosif.</h1>
    <p class="sub">Combattants originaux + Fusion Grok visible en combat.</p>
    <div class="fusionCard"><strong>✦ Fusion Grok</strong><span>Jauge dorée sous le ki → bouton FUSION → bannière « FUSION GROK ! » et forme Héros × Grok.</span></div>
    <div class="heroArt"><canvas id="heroCanvas" width="640" height="280"></canvas></div>
    <button class="btn primary" id="goFusion">Jouer Fusion Grok</button>
    <button class="btn" id="goPlay">Jouer 1v1 vs IA</button>
    <button class="btn" id="goChars">Choisir mon héros</button>
  </section>
  <section id="chars" class="screen">
    <div class="brand">ROSTER</div>
    <h1 style="font-size:2rem">Choisis ton style</h1>
    <p class="sub">Chaque perso peut fusionner avec Grok en combat.</p>
    <div class="fusionCard"><strong>Partenaire : Grok</strong><span>En arène, remplis la jauge Fusion puis appuie sur FUSION.</span></div>
    <div class="grid" id="charGrid"></div>
    <button class="btn primary fusion" id="startFusionFromChars">Entrer en Fusion Grok</button>
    <button class="btn" id="startFromChars">Entrer dans l'arène</button>
    <button class="btn" data-back="home">Retour</button>
  </section>
  <section id="combat" class="screen">
    <div id="frameWrap"><div id="wrap"><canvas id="game" width="1280" height="720"></canvas></div></div>
    <div id="stage">Arène</div>
    <div id="log"></div>
    <div class="controls">
      <div class="pad">
        <button class="hold" data-hold="left" type="button">◀</button>
        <button class="hold" data-hold="right" type="button">▶</button>
        <button class="hold" data-hold="jump" type="button">Jump</button>
      </div>
      <div class="acts">
        <button class="hold" data-hold="attack" type="button" style="border-color:#f5d657">Atk</button>
        <button class="hold" data-hold="special" type="button" style="border-color:#3ec7f0">Spé</button>
        <button class="hold" data-hold="ultra" type="button" style="border-color:#ff6b8a">ULTRA</button>
        <button class="hold fusionBtn" data-hold="fusion" type="button">FUSION</button>
        <button class="hold" data-hold="regen" type="button" style="border-color:#5ee39a">Regen</button>
      </div>
    </div>
    <button class="btn" id="forfeit" type="button">Abandonner</button>
  </section>
  <section id="victory" class="screen">
    <div class="brand">VICTOIRE</div>
    <h1 id="winTitle">Gagnant</h1>
    <div class="reward"><strong style="color:var(--sun)">Récompense</strong><p id="rewardText" class="sub">—</p></div>
    <button class="btn primary" data-back="home" type="button">Menu</button>
  </section>
</div>
<script>
${js}
</script>
<script>
const CHARS=[
{id:'lumo',name:'Lumo',tag:'Alien voyageur · ailes de lumière',colors:{body:'#7dd3fc',accent:'#fef08a',outline:'#0c4a6e'}},
{id:'pebble',name:'Pebble',tag:'Roc vivant · bouclier mousse',colors:{body:'#a8a29e',accent:'#84cc16',outline:'#292524'}},
{id:'nori',name:'Nori',tag:'Humaine · wok de ki acrobatique',colors:{body:'#fb7185',accent:'#fdba74',outline:'#7f1d1d'}},
{id:'capra',name:'Capra',tag:'Chèvre pirate · cornes farceuses',colors:{body:'#c4b5fd',accent:'#f472b6',outline:'#4c1d95'}},
{id:'mossy',name:'Mossy',tag:'Gardien forestier · runes vivantes',colors:{body:'#4ade80',accent:'#a3e635',outline:'#14532d'}},
{id:'zib',name:'Zib',tag:'Alien chaos · étincelles roses',colors:{body:'#f9a8d4',accent:'#67e8f9',outline:'#9d174d'}},
{id:'kira',name:'Kira',tag:'Parkour · poing solaire',colors:{body:'#fde047',accent:'#38bdf8',outline:'#854d0e'}},
{id:'bolt',name:'Bolt',tag:'Écureuil survolté · queue foudre',colors:{body:'#fdba74',accent:'#facc15',outline:'#9a3412'}},
{id:'grok',name:'Grok',tag:'Esprit cosmique · partenaire de Fusion',colors:{body:'#111827',accent:'#f5d657',outline:'#f8fafc'}}
];
const PROMPTS=['Inventе un snack qui recharge le ki.','Décris une arène en nuages caramel.','Imagine une danse de victoire ridicule.','Propose un nom de technique inédite.','Écris un haiku sur un smash raté.','Design un stage trampoline gelée.']
.map(s=>s.replace(/\\u0435/g,'e'));
let me='lumo', moveX=0, fighting=false, fusionReadyMatch=false;
const $=id=>document.getElementById(id);
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));$(id).classList.add('on'); if(id==='home') paintHero();}
function handleGameMsg(data){if(!data?.type)return; if(data.type==='ready')$('stage').textContent=data.stage||'Arène · Fusion Grok active'; if(data.type==='log')$('log').textContent=(data.log||[]).map(l=>l.msg).slice(0,2).join(' · '); if(data.type==='ended'){fighting=false; const winners=new Set(data.winnerTeams||[]); const names=(data.fighters||[]).filter(f=>winners.has(f.team)).map(f=>f.name).join(' & '); $('winTitle').textContent=names||'Match terminé'; $('rewardText').textContent=PROMPTS[Math.floor(Math.random()*PROMPTS.length)]; show('victory');}}
window.ReactNativeWebView={postMessage(raw){try{handleGameMsg(JSON.parse(raw))}catch{}}};
function send(msg){window.AKI?.onMessage?.(msg)}
function sendInput(extra={}){send({type:'input',slot:0,input:{moveX,...extra}})}
function paintPortrait(canvas,ch){const ctx=canvas.getContext('2d'); window.AKI.drawPortrait(ctx,ch.id,ch.colors,canvas.width)}
function paintHero(){const c=$('heroCanvas'); const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); const g=ctx.createLinearGradient(0,0,c.width,c.height); g.addColorStop(0,'#0b1d3a'); g.addColorStop(1,'#1e3a5f'); ctx.fillStyle=g; ctx.fillRect(0,0,c.width,c.height);
  ['lumo','kira','grok','bolt'].forEach((id,i)=>{const off=document.createElement('canvas'); off.width=120; off.height=120; const octx=off.getContext('2d'); const ch=CHARS.find(x=>x.id===id); window.AKI.drawPortrait(octx,ch.id,ch.colors,120); ctx.drawImage(off,40+i*150,70,120,120)})}
function renderChars(){const grid=$('charGrid'); grid.innerHTML=''; CHARS.forEach(c=>{const b=document.createElement('button'); b.type='button'; b.className='card'+(me===c.id?' on':''); const cv=document.createElement('canvas'); cv.width=180; cv.height=180; b.appendChild(cv); const strong=document.createElement('strong'); strong.textContent=c.name; const small=document.createElement('small'); small.textContent=c.tag; b.appendChild(strong); b.appendChild(small); b.onclick=()=>{me=c.id; renderChars()}; grid.appendChild(b); paintPortrait(cv,c)})}
function startCombat(opts={}){show('combat'); fighting=true; fightStartedAt=Date.now(); fusionReadyMatch=!!opts.fusionReady; const heroId=me==='grok'?'lumo':me; const foe=CHARS.find(c=>c.id==='grok')||CHARS.find(c=>c.id!==heroId)||CHARS[1]; const hero=CHARS.find(c=>c.id===heroId); send({type:'start',config:{mode:'1v1',stocks:3,fusionReady:fusionReadyMatch,fighters:[{id:'p0',slot:0,team:0,characterId:hero.id,name:hero.name,stocks:3},{id:'p1',slot:1,team:1,characterId:foe.id,name:foe.name,stocks:3}]}})}
let fightStartedAt=0;
setInterval(()=>{if(!fighting||!$('combat').classList.contains('on'))return; if(fusionReadyMatch&&Date.now()-fightStartedAt<3500)return; send({type:'input',slot:1,input:{moveX:Math.random()>.5?1:-1,jump:Math.random()>.92,attack:Math.random()>.85,special:Math.random()>.95,ultra:Math.random()>.985}})},180);
function bindHold(el,on,off){const s=e=>{e.preventDefault();on()}; const e=ev=>{ev.preventDefault();off()}; el.addEventListener('touchstart',s,{passive:false}); el.addEventListener('touchend',e); el.addEventListener('touchcancel',e); el.addEventListener('mousedown',s); el.addEventListener('mouseup',e); el.addEventListener('mouseleave',e)}
document.querySelectorAll('[data-hold]').forEach(el=>{const k=el.getAttribute('data-hold'); if(k==='left')bindHold(el,()=>{moveX=-1;sendInput({moveX:-1})},()=>{moveX=0;sendInput({moveX:0})}); else if(k==='right')bindHold(el,()=>{moveX=1;sendInput({moveX:1})},()=>{moveX=0;sendInput({moveX:0})}); else bindHold(el,()=>sendInput({[k]:true}),()=>sendInput({[k]:false}))});
$('goPlay').onclick=()=>startCombat(); $('goFusion').onclick=()=>startCombat({fusionReady:true}); $('goChars').onclick=()=>{renderChars();show('chars')}; $('startFromChars').onclick=()=>startCombat(); $('startFusionFromChars').onclick=()=>startCombat({fusionReady:true}); $('forfeit').onclick=()=>send({type:'forfeit'});
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>show(b.getAttribute('data-back')));
paintHero();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(repo, 'play', 'index.html'), play);
fs.writeFileSync(path.join(repo, 'play', 'game-inner.html'), '<!doctype html><meta http-equiv="refresh" content="0;url=./">');
console.log('play + gameHtml rebuilt', play.length);
