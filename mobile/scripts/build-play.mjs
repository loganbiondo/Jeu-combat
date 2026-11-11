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
  #wrap{width:100%;height:100%;display:flex;align-items:center;justify-content:center;position:relative;background:#050b14}
  canvas#game{background:#050b14;max-width:100%;max-height:100%;display:block}
`;

const gameHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${cssGame}</style></head><body><div id="wrap"><canvas id="game" width="1280" height="720"></canvas></div><script>${js}</script></body></html>`;
fs.writeFileSync(outHtmlMod, `export const GAME_HTML = ${JSON.stringify(gameHtml)};\n`);

const play = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"/>
<title>Arena Ki Fighters</title>
<style>
:root{--bg:#050b14;--ink:#f3f7fb;--muted:#9eb6c9;--sun:#f5d657;--cyan:#3ec7f0;--hot:#ff6b8a}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font-family:"Trebuchet MS",Segoe UI,system-ui,sans-serif;overflow:hidden;touch-action:none}
#app{height:100%;display:flex;flex-direction:column;position:relative}
.bgfx{position:fixed;inset:0;pointer-events:none;background:
 radial-gradient(ellipse 70% 45% at 85% 0%,rgba(56,189,248,.18),transparent 55%),
 radial-gradient(ellipse 60% 40% at 10% 100%,rgba(251,113,133,.16),transparent 50%),
 linear-gradient(160deg,#050b14 0%,#0c1a2a 45%,#13263a 100%)}
.screen{display:none;flex:1;flex-direction:column;padding:20px 16px calc(16px + env(safe-area-inset-bottom));overflow:auto;position:relative;z-index:1;touch-action:manipulation}
.screen.on{display:flex}
.brand{font-weight:800;letter-spacing:.22em;font-size:.72rem;color:var(--sun)}
h1{font-weight:800;font-size:clamp(2rem,7.5vw,3rem);line-height:1;margin:10px 0;letter-spacing:-.02em}
.sub{color:var(--muted);font-size:1rem;line-height:1.4;max-width:30ch;margin:0 0 16px}
.btn{display:block;width:100%;margin:8px 0;padding:16px;border-radius:18px;border:1px solid rgba(125,211,252,.28);
background:rgba(10,20,34,.78);color:var(--ink);font-weight:800;font-size:1rem}
.btn.primary{border:0;background:linear-gradient(120deg,#3ec7f0,#f5d657);color:#071018}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.card{border:2px solid transparent;border-radius:16px;padding:8px;background:rgba(10,20,34,.82);text-align:left;color:inherit}
.card.on{border-color:var(--sun)}
.card canvas{width:100%;height:auto;border-radius:12px;display:block;background:#0b1d3a}
.card strong{display:block;margin-top:6px}
.card small{color:var(--muted);display:block;line-height:1.25;font-size:.78rem}
#combat{padding:0;gap:0;overflow:hidden}
#frameWrap{flex:1;min-height:0;overflow:hidden;background:#050b14;position:relative}
${cssGame}
.touchHud{position:absolute;inset:0;pointer-events:none;z-index:5}
.stickZone,.btnZone{position:absolute;bottom:calc(12px + env(safe-area-inset-bottom));pointer-events:auto}
.stickZone{left:12px;width:148px;height:148px}
.btnZone{right:10px;display:grid;grid-template-columns:repeat(3,70px);gap:10px;align-content:end}
#stick{width:148px;height:148px;border-radius:50%;border:2px solid rgba(125,211,252,.4);background:rgba(7,17,31,.45);position:relative;touch-action:none}
#knob{position:absolute;left:49px;top:49px;width:50px;height:50px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#7dd3fc,#0ea5e9);box-shadow:0 6px 16px rgba(0,0,0,.35)}
.act{width:70px;height:70px;border-radius:50%;border:2px solid rgba(125,211,252,.45);background:rgba(7,17,31,.72);color:#fff;font-weight:800;font-size:.72rem;touch-action:none}
.act:active,.act.on{transform:scale(.94);background:rgba(56,189,248,.35)}
.act.smash{border-color:#fb923c}.act.ki{border-color:#67e8f9}.act.spe{border-color:#38bdf8}
.act.forme{border-color:#facc15}.act.ultra{border-color:#fb7185}.act.guard{border-color:#a5b4fc}
.topBar{position:absolute;top:8px;left:0;right:0;display:flex;justify-content:space-between;padding:0 12px;pointer-events:auto;z-index:6}
.chip{background:rgba(7,17,31,.65);border:1px solid rgba(125,211,252,.3);border-radius:999px;padding:8px 12px;color:#9eb6c9;font-size:.75rem;font-weight:800}
#log{position:absolute;top:48px;left:12px;right:12px;font-size:.7rem;color:#94a3b8;text-align:center;pointer-events:none;z-index:6}
.reward{border:1px solid rgba(245,214,87,.45);border-radius:18px;padding:16px;background:rgba(10,20,34,.75)}
.heroArt{height:170px;border-radius:20px;margin:8px 0 16px;overflow:hidden;border:1px solid rgba(125,211,252,.25)}
.heroArt canvas{width:100%;height:100%}
</style>
</head>
<body>
<div class="bgfx"></div>
<div id="app">
  <section id="home" class="screen on">
    <div class="brand">ARENA KI FIGHTERS</div>
    <h1>Arène 3D.<br/>Humains. Ki.</h1>
    <p class="sub">Gameplay 2026 tactile — caméra cinéma, transformations, dash-cancel.</p>
    <div class="heroArt"><canvas id="heroCanvas" width="640" height="280"></canvas></div>
    <button class="btn primary" id="goPlay">Jouer 1v1 vs IA</button>
    <button class="btn" id="goChars">Choisir mon combattant</button>
  </section>
  <section id="chars" class="screen">
    <div class="brand">ROSTER 2026</div>
    <h1 style="font-size:1.9rem">Combattants</h1>
    <p class="sub">Humains réalistes, styles de jeu distincts.</p>
    <div class="grid" id="charGrid"></div>
    <button class="btn primary" id="startFromChars">Entrer dans l'arène 3D</button>
    <button class="btn" data-back="home">Retour</button>
  </section>
  <section id="combat" class="screen">
    <div id="frameWrap"><div id="wrap"><canvas id="game" width="1280" height="720"></canvas></div>
      <div class="topBar">
        <span class="chip" id="stage">Arène 3D</span>
        <button class="chip" id="forfeit" type="button">Quitter</button>
      </div>
      <div id="log"></div>
      <div class="touchHud">
        <div class="stickZone"><div id="stick"><div id="knob"></div></div></div>
        <div class="btnZone">
          <button class="act" data-act="jump" type="button">Jump</button>
          <button class="act" data-act="dash" type="button">Dash</button>
          <button class="act guard" data-act="guard" type="button">Garde</button>
          <button class="act" data-act="attack" type="button">Atk</button>
          <button class="act smash" data-act="heavy" type="button">Smash</button>
          <button class="act ki" data-act="blast" type="button">Ki</button>
          <button class="act spe" data-act="special" type="button">Spé</button>
          <button class="act forme" data-act="transform" type="button">Forme</button>
          <button class="act ultra" data-act="ultra" type="button">Ultra</button>
        </div>
      </div>
    </div>
  </section>
  <section id="victory" class="screen">
    <div class="brand">VICTOIRE</div>
    <h1 id="winTitle">Gagnant</h1>
    <div class="reward"><strong style="color:var(--sun)">Prompt créatif</strong><p class="sub" style="margin:6px 0 8px;font-size:.88rem">Victoire = 1 idée originale (100 au total).</p><p id="rewardText" class="sub">—</p></div>
    <button class="btn primary" data-back="home" type="button">Menu</button>
  </section>
</div>
<script>
${js}
</script>
<script>
const CHARS=[
{id:'lumo',name:'Aria Vale',tag:'Sprinteuse · combos nets',colors:{body:'#c68642',accent:'#38bdf8',outline:'#3b2314',hair:'#1c1917',cloth:'#0f172a'}},
{id:'pebble',name:'Kenzo Park',tag:'Tank · smash lourd',colors:{body:'#8d5524',accent:'#f97316',outline:'#2a160a',hair:'#111827',cloth:'#1f2937'}},
{id:'nori',name:'Maya Cruz',tag:'Rushdown · kicks',colors:{body:'#d4a574',accent:'#fb7185',outline:'#4a2c1a',hair:'#7c2d12',cloth:'#881337'}},
{id:'capra',name:'Omar Diallo',tag:'Power · présence ring',colors:{body:'#5c3317',accent:'#a78bfa',outline:'#1c0f08',hair:'#0a0a0a',cloth:'#312e81'}},
{id:'mossy',name:'Soren Blake',tag:'Balanced · contre',colors:{body:'#e0ac69',accent:'#4ade80',outline:'#5c4033',hair:'#365314',cloth:'#14532d'}},
{id:'zib',name:'Jin Reyes',tag:'Chaos · mix-ups',colors:{body:'#f1c27d',accent:'#f472b6',outline:'#6b4423',hair:'#831843',cloth:'#500724'}},
{id:'kira',name:'Elena Rossi',tag:'Technique · footsies',colors:{body:'#c68642',accent:'#facc15',outline:'#3f2a14',hair:'#78350f',cloth:'#422006'}},
{id:'bolt',name:'Ray Nakamura',tag:'Speed · dash cancel',colors:{body:'#ffe0bd',accent:'#38bdf8',outline:'#8b5e3c',hair:'#111827',cloth:'#0c4a6e'}}
];
const PROMPTS=['Invente un snack qui recharge le ki.','Décris une arène en néons 2026.','Imagine une danse de victoire.','Propose un nom de technique inédite.','Écris un haiku sur un smash raté.','Design un stage holographique.'];
let me='lumo', moveX=0, fighting=false;
const $=id=>document.getElementById(id);
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));$(id).classList.add('on'); if(id==='home') paintHero();}
function handleGameMsg(data){if(!data?.type)return; if(data.type==='ready')$('stage').textContent=data.stage||'Arène 3D'; if(data.type==='log')$('log').textContent=(data.log||[]).map(l=>l.msg).slice(0,2).join(' · '); if(data.type==='ended'){fighting=false; const winners=new Set(data.winnerTeams||[]); if(!winners.size){show('home');return;} const names=(data.fighters||[]).filter(f=>winners.has(f.team)).map(f=>f.name).join(' & '); $('winTitle').textContent=names||'Match terminé'; $('rewardText').textContent=PROMPTS[Math.floor(Math.random()*PROMPTS.length)]; show('victory');}}
window.ReactNativeWebView={postMessage(raw){try{handleGameMsg(JSON.parse(raw))}catch{}}};
function send(msg){window.AKI?.onMessage?.(msg)}
function sendInput(extra={}){send({type:'input',slot:0,input:{moveX,...extra}})}
function paintPortrait(canvas,ch){const ctx=canvas.getContext('2d'); window.AKI.drawPortrait(ctx,ch.id,ch.colors,canvas.width)}
function paintHero(){const c=$('heroCanvas'); const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height); const g=ctx.createLinearGradient(0,0,c.width,c.height); g.addColorStop(0,'#050b14'); g.addColorStop(1,'#12304a'); ctx.fillStyle=g; ctx.fillRect(0,0,c.width,c.height); ['lumo','kira','zib','bolt'].forEach((id,i)=>{const off=document.createElement('canvas'); off.width=120; off.height=120; const octx=off.getContext('2d'); const ch=CHARS.find(x=>x.id===id); window.AKI.drawPortrait(octx,ch.id,ch.colors,120); ctx.drawImage(off,40+i*150,70,120,120)})}
function renderChars(){const grid=$('charGrid'); grid.innerHTML=''; CHARS.forEach(c=>{const b=document.createElement('button'); b.type='button'; b.className='card'+(me===c.id?' on':''); const cv=document.createElement('canvas'); cv.width=180; cv.height=180; b.appendChild(cv); const strong=document.createElement('strong'); strong.textContent=c.name; const small=document.createElement('small'); small.textContent=c.tag; b.appendChild(strong); b.appendChild(small); b.onclick=()=>{me=c.id; renderChars()}; grid.appendChild(b); paintPortrait(cv,c)})}
function startCombat(){show('combat'); fighting=true; const foe=CHARS.find(c=>c.id!==me)||CHARS[1]; send({type:'start',config:{mode:'1v1',stocks:1,fighters:[{id:'p0',slot:0,team:0,characterId:me,name:CHARS.find(c=>c.id===me).name,stocks:1},{id:'p1',slot:1,team:1,characterId:foe.id,name:foe.name,stocks:1}]}})}

/* Virtual stick */
(function(){
  const stick=$('stick'), knob=$('knob');
  let active=false, cx=0, cy=0;
  const setKnob=(x,y)=>{knob.style.left=(49+x)+'px'; knob.style.top=(49+y)+'px'};
  const read=(e)=>{
    const t=e.touches?e.touches[0]:e;
    const r=stick.getBoundingClientRect();
    const dx=t.clientX-(r.left+r.width/2);
    const dy=t.clientY-(r.top+r.height/2);
    const max=42; const len=Math.hypot(dx,dy)||1; const s=Math.min(1,max/len);
    const x=dx*s, y=dy*s; setKnob(x,y);
    moveX = Math.abs(x)>12 ? (x>0?1:-1) : 0;
    sendInput({moveX, jump:y<-28, down:y>28});
  };
  const end=()=>{active=false; setKnob(0,0); moveX=0; sendInput({moveX:0,jump:false,down:false})};
  stick.addEventListener('touchstart',e=>{e.preventDefault();active=true;read(e)},{passive:false});
  stick.addEventListener('touchmove',e=>{e.preventDefault();if(active)read(e)},{passive:false});
  stick.addEventListener('touchend',end); stick.addEventListener('touchcancel',end);
  stick.addEventListener('mousedown',e=>{active=true;read(e)});
  window.addEventListener('mousemove',e=>{if(active)read(e)});
  window.addEventListener('mouseup',end);
})();

function bindAct(el){
  const k=el.getAttribute('data-act');
  const on=e=>{e.preventDefault(); el.classList.add('on'); sendInput({[k]:true})};
  const off=e=>{e.preventDefault(); el.classList.remove('on'); sendInput({[k]:false})};
  el.addEventListener('touchstart',on,{passive:false});
  el.addEventListener('touchend',off); el.addEventListener('touchcancel',off);
  el.addEventListener('mousedown',on); el.addEventListener('mouseup',off); el.addEventListener('mouseleave',off);
}
document.querySelectorAll('[data-act]').forEach(bindAct);

setInterval(()=>{if(!fighting||!$('combat').classList.contains('on'))return; const r=Math.random(); send({type:'input',slot:1,input:{moveX:Math.random()>.5?1:-1,jump:r>.9,attack:r>.82,heavy:r>.96,blast:r>.93,special:r>.95,dash:r>.97,guard:r>.98,ultra:r>.992,transform:r>.995}})},160);
$('goPlay').onclick=startCombat; $('goChars').onclick=()=>{renderChars();show('chars')}; $('startFromChars').onclick=startCombat; $('forfeit').onclick=()=>send({type:'forfeit'});
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>show(b.getAttribute('data-back')));
paintHero();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(repo, 'play', 'index.html'), play);
fs.writeFileSync(path.join(repo, 'play', 'game-inner.html'), '<!doctype html><meta http-equiv="refresh" content="0;url=./">');
console.log('play + gameHtml rebuilt', play.length);
