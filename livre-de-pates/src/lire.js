const KEY = "mes-premieres-pates";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function durationAt(text, index) {
  const slice = text.slice(index);
  const hour = slice.match(/^(\d+)\s*h(?:eure|eures)?(?:\s*(\d+))?/i);
  if (hour) {
    return {
      seconds: (Number(hour[1]) * 60 + (hour[2] ? Number(hour[2]) : 0)) * 60,
      length: hour[0].length,
    };
  }
  const minute = slice.match(/^(\d+)\s*min(?:ute|utes)?(?:\s*(\d+))?/i);
  if (minute) {
    return {
      seconds: Number(minute[1]) * 60 + (minute[2] ? Number(minute[2]) : 0),
      length: minute[0].length,
    };
  }
  return null;
}

function spanOf(text) {
  const t = String(text).replace(/[\u00a0\u202f]/g, " ");
  const linked = /(\d+)\s*à\s*(\d+)\s*(h(?:eure|eures)?|min(?:ute|utes)?)(?:\s*(\d+))?/gi;
  let match;
  while ((match = linked.exec(t))) {
    const before = t.slice(0, match.index);
    if (/\d\s*h(?:eure|eures)?\s*$/i.test(before)) continue;
    const hours = match[3].toLowerCase().startsWith("h");
    const first = Number(match[1]) * (hours ? 3600 : 60);
    const last = hours
      ? (Number(match[2]) * 60 + (match[4] ? Number(match[4]) : 0)) * 60
      : Number(match[2]) * 60 + (match[4] ? Number(match[4]) : 0);
    return { first, last: Math.max(first, last) };
  }
  let first = 0;
  let end = 0;
  for (let i = 0; i < t.length; i += 1) {
    if (!/\d/.test(t[i]) || (i > 0 && /\d/.test(t[i - 1]))) continue;
    const hit = durationAt(t, i);
    if (!hit) continue;
    first = hit.seconds;
    end = i + hit.length;
    break;
  }
  if (!first) return { first: 0, last: 0 };
  const link = t.slice(end).match(/^\s*à\s*/i);
  if (link) {
    const next = durationAt(t, end + link[0].length);
    if (next) return { first, last: Math.max(first, next.seconds) };
  }
  return { first, last: first };
}

function timeLabel(total) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes >= 60 && minutes % 60 === 0 && seconds === 0) return `${minutes / 60} h`;
  if (minutes >= 60) {
    const extra = minutes % 60;
    return extra ? `${Math.floor(minutes / 60)} h ${extra}` : `${Math.floor(minutes / 60)} h`;
  }
  if (seconds) return `${minutes} min ${seconds}`;
  return `${minutes} min`;
}

function clock(total) {
  const safe = Math.max(0, total);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function recipeState(data, id) {
  if (!data.checks) data.checks = {};
  if (!data.checks[id]) data.checks[id] = { i: [], s: [] };
  return data.checks[id];
}

const bar = document.createElement("div");
bar.id = "minuteur";
bar.hidden = true;
bar.innerHTML = `<div><strong>00:00</strong><span class="what"></span></div><div><button type="button" id="timer-pause">Pause</button><button type="button" id="timer-stop">Stop</button></div>`;
document.body.appendChild(bar);
const countEl = bar.querySelector("strong");
const whatEl = bar.querySelector(".what");
const pauseBtn = bar.querySelector("#timer-pause");
let tickHandle = 0;
let audioCtx;

function unlockAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const buffer = audioCtx.createBuffer(1, 1, 22050);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
  } catch {
    /* le compte à rebours part même si le son est refusé */
  }
}

function tone(freq, at, dur, volume) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

function blip(freq) {
  try {
    unlockAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    tone(freq, now, 0.16, 0.28);
    tone(freq * 1.25, now + 0.09, 0.2, 0.22);
  } catch {
    /* la phrase reste écrite si le son est refusé */
  }
}

function ding() {
  if (navigator.vibrate) navigator.vibrate([180, 80, 180, 80, 360]);
  try {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    [523, 659, 784].forEach((freq, i) => tone(freq, now + i * 0.16, 0.28, 0.32));
  } catch {
    /* le bandeau reste visible si le son est bloqué */
  }
  speak(whatEl.textContent);
}

function paintTimer() {
  const data = load();
  const timer = data.timer;
  if (!timer) {
    bar.hidden = true;
    document.body.classList.remove("timing");
    bar.classList.remove("alarm");
    return;
  }
  bar.hidden = false;
  document.body.classList.add("timing");
  whatEl.textContent = timer.what;
  if (timer.left != null) {
    countEl.textContent = clock(timer.left);
    pauseBtn.textContent = "Reprendre";
    bar.classList.remove("alarm");
    return;
  }
  const left = Math.ceil((timer.endsAt - Date.now()) / 1000);
  if (left <= 0) {
    countEl.textContent = "00:00";
    whatEl.textContent = timer.extra
      ? `Vérifie maintenant. Tu peux attendre encore ${timeLabel(timer.extra)}.`
      : `C’est l’heure, ${timer.what}`;
    bar.classList.add("alarm");
    pauseBtn.textContent = "Pause";
    if (!timer.rang) {
      timer.rang = true;
      save(data);
      ding();
    }
    return;
  }
  countEl.textContent = clock(left);
  pauseBtn.textContent = "Pause";
  bar.classList.remove("alarm");
}

function startTimer(what, seconds, extra) {
  const data = load();
  data.timer = { what, endsAt: Date.now() + seconds * 1000, left: null, rang: false, extra: extra || 0 };
  save(data);
  paintTimer();
  window.clearInterval(tickHandle);
  tickHandle = window.setInterval(paintTimer, 250);
}

pauseBtn.addEventListener("click", () => {
  const data = load();
  const timer = data.timer;
  if (!timer) return;
  if (timer.left != null) {
    timer.endsAt = Date.now() + timer.left * 1000;
    timer.left = null;
    timer.rang = false;
  } else {
    timer.left = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
    timer.endsAt = null;
  }
  save(data);
  paintTimer();
});

bar.querySelector("#timer-stop").addEventListener("click", () => {
  const data = load();
  delete data.timer;
  save(data);
  window.clearInterval(tickHandle);
  paintTimer();
});

const pitches = {
  farine: 392,
  oeuf: 523,
  beurre: 349,
  lait: 440,
  sucre: 587,
  sel: 494,
  levure: 330,
  chocolat: 294,
  amande: 370,
  fruit: 466,
  creme: 415,
  huile: 311,
  eau: 554,
  confiture: 380,
  fromage: 340,
  pate: 360,
  bol: 420,
};

const voices = {
  farine: "Je me secoue dans le bol.",
  oeuf: "On casse, et on cherche la coquille.",
  beurre: "Froid ou mou, comme c’est écrit.",
  lait: "Je coule dans le bol.",
  sucre: "Je fonds. Je ne décide pas la cuisson.",
  sel: "Juste ce qui est écrit, pas une poignée.",
  levure: "Regarde le nom sur le paquet avant de me verser.",
  chocolat: "Je me cache dans la pâte.",
  amande: "On vérifie l’allergie avant de m’ouvrir.",
  fruit: "Lavés, puis posés.",
  creme: "Je reste dans la mesure écrite.",
  huile: "Neutre, comme c’est écrit.",
  eau: "Froide, et pas plus que la ligne.",
  confiture: "Épaisse, pour que ça tienne.",
  fromage: "Seulement si la ligne le dit.",
  pate: "Je suis déjà prête. On suit les étapes.",
  bol: "Je suis sur la liste. On me pèse.",
};

function kindOf(name) {
  const n = name.toLowerCase();
  if (n.includes("amande")) return "amande";
  if (n.includes("chocolat")) return "chocolat";
  if (n.includes("confiture")) return "confiture";
  if (n.includes("fromage")) return "fromage";
  if (n.includes("fruit") || n.includes("poire") || n.includes("fraise") || n.includes("pomme") || n.includes("kiwi")) return "fruit";
  if (n.includes("crème") || n.includes("creme")) return "creme";
  if (n.includes("huile")) return "huile";
  if (n.includes("levure")) return "levure";
  if (n.includes("œuf") || n.includes("oeuf")) return "oeuf";
  if (n.includes("beurre")) return "beurre";
  if (n.includes("lait")) return "lait";
  if (n.includes("farine")) return "farine";
  if (n.includes("sucre") || n.includes("cassonade")) return "sucre";
  if (n.includes("sel") || n.includes("poivre")) return "sel";
  if (n.includes("eau")) return "eau";
  if (n.includes("pâte") || n.includes("pate") || n.includes("pâton")) return "pate";
  return "bol";
}

let castN = 0;

function face(x, y) {
  return `<g class="eyes">
    <ellipse cx="${x - 8}" cy="${y}" rx="7.2" ry="8.1" fill="#fff"/>
    <ellipse cx="${x + 8}" cy="${y}" rx="7.2" ry="8.1" fill="#fff"/>
    <ellipse class="pupil" cx="${x - 6.2}" cy="${y + 1.4}" rx="3.2" ry="3.6" fill="#2A2118"/>
    <ellipse class="pupil" cx="${x + 9.8}" cy="${y + 1.4}" rx="3.2" ry="3.6" fill="#2A2118"/>
    <circle cx="${x - 7.6}" cy="${y - 1.5}" r="1.5" fill="#fff"/>
    <circle cx="${x + 8.4}" cy="${y - 1.5}" r="1.5" fill="#fff"/>
  </g>
  <ellipse cx="${x - 16}" cy="${y + 11}" rx="4.2" ry="2.2" fill="#E7A090" opacity="0.8"/>
  <ellipse cx="${x + 16}" cy="${y + 11}" rx="4.2" ry="2.2" fill="#E7A090" opacity="0.8"/>
  <path class="mouth" d="M${x - 7} ${y + 14} Q ${x} ${y + 21} ${x + 7} ${y + 14}" fill="none" stroke="#2A2118" stroke-width="1.8" stroke-linecap="round"/>`;
}

function cast(kind) {
  castN += 1;
  const id = `c${castN}`;
  const gloss = `<ellipse cx="32" cy="34" rx="7" ry="5" fill="#fff" opacity="0.35"/>`;
  const bodies = {
    farine: {
      light: "#FFF6E4", dark: "#E4C48A", fx: 40, fy: 42,
      body: `<path d="M31 18 h18 l3 5 -2 3 c9 3 14 12 11 30 -2 14 -10 16 -21 16 s-19 -2 -21 -16 c-3 -18 2 -27 11 -30 l-2 -3 z" fill="url(#${id})"/>
        <path d="M33 18 h14" stroke="#C4A06A" stroke-width="2" stroke-linecap="round"/>
        <rect x="36" y="12" width="8" height="7" rx="2.5" fill="#E2A322"/>
        <ellipse cx="33" cy="32" rx="6" ry="4" fill="#fff" opacity="0.4"/>`,
    },
    oeuf: {
      light: "#FFFDF8", dark: "#F0C9A0", fx: 40, fy: 44,
      body: `<ellipse cx="40" cy="44" rx="18" ry="24" fill="url(#${id})"/>${gloss}`,
    },
    beurre: {
      light: "#FFE9A0", dark: "#E2A322", fx: 40, fy: 46,
      body: `<rect x="15" y="30" width="50" height="30" rx="10" fill="url(#${id})"/>
        <rect x="15" y="30" width="50" height="10" rx="6" fill="#FFF6D0" opacity="0.85"/>
        <path d="M22 48 h36" stroke="#C4841A" stroke-width="1.3" opacity="0.4" stroke-linecap="round"/>`,
    },
    lait: {
      light: "#FFFFFF", dark: "#D5E6F4", fx: 40, fy: 48,
      body: `<rect x="34" y="8" width="12" height="6" rx="2" fill="#5C88B0"/>
        <rect x="33" y="12" width="14" height="10" rx="3" fill="#7EA4C8"/>
        <path d="M31 22 h18 l6 12 v20 a15 15 0 0 1 -30 0 v-20 z" fill="url(#${id})"/>
        <ellipse cx="34" cy="36" rx="4" ry="7" fill="#fff" opacity="0.45"/>`,
    },
    sucre: {
      light: "#FFFFFF", dark: "#E4DDD2", fx: 40, fy: 46,
      body: `<g transform="rotate(-8 40 46)"><rect x="18" y="24" width="42" height="40" rx="9" fill="url(#${id})"/>
        <rect x="18" y="24" width="42" height="12" rx="8" fill="#fff" opacity="0.65"/></g>`,
    },
    sel: {
      light: "#FFFFFF", dark: "#E4DCCE", fx: 40, fy: 46,
      body: `<rect x="28" y="12" width="24" height="10" rx="3" fill="#D7C4A4"/>
        <circle cx="34" cy="16" r="1.15" fill="#6B5340"/><circle cx="40" cy="16" r="1.15" fill="#6B5340"/><circle cx="46" cy="16" r="1.15" fill="#6B5340"/>
        <rect x="26" y="22" width="28" height="42" rx="11" fill="url(#${id})"/>
        <ellipse cx="34" cy="32" rx="5" ry="6" fill="#fff" opacity="0.4"/>`,
    },
    levure: {
      light: "#8FBF96", dark: "#3E6B4F", fx: 40, fy: 48,
      body: `<rect x="22" y="16" width="36" height="50" rx="8" fill="url(#${id})"/>
        <rect x="22" y="16" width="36" height="14" rx="8" fill="#2F5A40"/>
        <rect x="30" y="34" width="20" height="8" rx="2" fill="#FBF6EE"/>`,
    },
    chocolat: {
      light: "#A56B42", dark: "#4A2C18", fx: 40, fy: 46,
      body: `<rect x="12" y="28" width="56" height="32" rx="8" fill="url(#${id})"/>
        <path d="M30 28 v32 M50 28 v32 M12 44 h56" stroke="#3A2416" stroke-width="1.5" opacity="0.35"/>
        <rect x="15" y="31" width="12" height="7" rx="3" fill="#fff" opacity="0.2"/>`,
    },
    amande: {
      light: "#F3DCC0", dark: "#C4A574", fx: 40, fy: 42,
      body: `<path d="M40 12 C60 32 58 58 40 68 C22 58 20 32 40 12" fill="url(#${id})"/>
        <path d="M40 18 C50 34 50 52 40 62" fill="none" stroke="#A68458" stroke-width="1.3" opacity="0.55"/>
        <ellipse cx="32" cy="30" rx="5" ry="7" fill="#fff" opacity="0.3"/>`,
    },
    fruit: {
      light: "#F07070", dark: "#A83232", fx: 40, fy: 48,
      body: `<path d="M40 24 C26 24 16 36 18 50 C20 66 30 70 40 70 C50 70 60 66 62 50 C64 36 54 24 40 24" fill="url(#${id})"/>
        <path d="M40 24 C40 14 48 12 53 16" fill="none" stroke="#3E6B4F" stroke-width="2.2" stroke-linecap="round"/>
        <ellipse cx="52" cy="16" rx="7" ry="3.4" fill="#6E9A62" transform="rotate(-24 52 16)"/>
        <ellipse cx="30" cy="40" rx="6" ry="8" fill="#fff" opacity="0.22"/>`,
    },
    creme: {
      light: "#FFFFFF", dark: "#F3E2C4", fx: 40, fy: 50,
      body: `<rect x="22" y="24" width="36" height="40" rx="10" fill="#F7F1E6" stroke="#E2C99A" stroke-width="1.4"/>
        <rect x="20" y="20" width="40" height="12" rx="6" fill="#E2A322"/>
        <ellipse cx="40" cy="54" rx="12" ry="7" fill="url(#${id})"/>
        <path d="M32 52 q8 -7 16 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
    },
    huile: {
      light: "#FFF6D2", dark: "#E8C15A", fx: 40, fy: 48,
      body: `<rect x="34" y="8" width="12" height="8" rx="2" fill="#C4A574"/>
        <path d="M32 16 h16 l5 12 v26 a13 13 0 0 1 -26 0 v-26 z" fill="url(#${id})"/>
        <rect x="30" y="36" width="20" height="24" rx="7" fill="#E2A322" opacity="0.9"/>
        <ellipse cx="36" cy="28" rx="3" ry="5" fill="#fff" opacity="0.4"/>`,
    },
    eau: {
      light: "#F4FBFF", dark: "#7EB0D8", fx: 40, fy: 50,
      body: `<path d="M40 8 C40 8 16 36 16 50 a24 22 0 0 0 48 0 C64 36 40 8 40 8" fill="url(#${id})"/>
        <ellipse cx="31" cy="40" rx="6" ry="9" fill="#fff" opacity="0.5"/>`,
    },
    confiture: {
      light: "#FFF7F4", dark: "#F0D0C8", fx: 40, fy: 40,
      body: `<rect x="24" y="14" width="32" height="10" rx="3" fill="#C44848"/>
        <path d="M26 16 h6 M38 16 h6 M50 16 h4" stroke="#F7C4C4" stroke-width="2" stroke-linecap="round"/>
        <rect x="22" y="24" width="36" height="40" rx="8" fill="url(#${id})" stroke="#E7C2BA" stroke-width="1.2"/>
        <rect x="26" y="46" width="28" height="14" rx="4" fill="#C44848" opacity="0.85"/>`,
    },
    fromage: {
      light: "#FFE9A2", dark: "#E2A322", fx: 40, fy: 48,
      body: `<path d="M14 58 L40 16 L66 58 Z" fill="url(#${id})"/>
        <circle cx="34" cy="46" r="3.2" fill="#F8E7B4"/><circle cx="48" cy="50" r="2.5" fill="#F8E7B4"/><circle cx="40" cy="56" r="2" fill="#F8E7B4"/>`,
    },
    pate: {
      light: "#FBE0D0", dark: "#E7B7A2", fx: 40, fy: 46,
      body: `<ellipse cx="40" cy="48" rx="24" ry="18" fill="url(#${id})"/>
        <ellipse cx="30" cy="40" rx="7" ry="5" fill="#fff" opacity="0.35"/>
        <path d="M24 54 q16 8 32 0" fill="none" stroke="#D9A888" stroke-width="2" stroke-linecap="round"/>`,
    },
    bol: {
      light: "#FFFFFF", dark: "#F0E2D0", fx: 40, fy: 52,
      body: `<path d="M14 34 h52 l-6 26 a22 14 0 0 1 -40 0 z" fill="url(#${id})"/>
        <ellipse cx="40" cy="34" rx="26" ry="8" fill="#F7F1E6"/>
        <ellipse cx="40" cy="34" rx="16" ry="5" fill="#E7C98A"/>
        <ellipse cx="28" cy="48" rx="5" ry="7" fill="#fff" opacity="0.35"/>`,
    },
  };
  const spec = bodies[kind] || bodies.bol;
  return `<svg class="creature" viewBox="0 0 80 80" aria-hidden="true">
    <defs><radialGradient id="${id}" cx="32%" cy="28%" r="78%">
      <stop offset="0%" stop-color="${spec.light}"/>
      <stop offset="100%" stop-color="${spec.dark}"/>
    </radialGradient></defs>
    <ellipse cx="40" cy="74" rx="18" ry="3.2" fill="#241C14" opacity="0.14"/>
    ${spec.body}
    ${face(spec.fx, spec.fy)}
  </svg>`;
}

function minuteButton(text) {
  const span = spanOf(text);
  if (span.first < 30 || span.first > 3 * 60 * 60) return null;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "minute";
  button.textContent = span.last > span.first
    ? `Minuteur ${timeLabel(span.first)} · jusqu’à ${timeLabel(span.last)}`
    : `Minuteur ${timeLabel(span.first)}`;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    blip(660);
    startTimer(
      button.closest("article")?.querySelector("h2")?.textContent || "Minuteur",
      span.first,
      span.last - span.first,
    );
  });
  return button;
}

const cheers = [
  "Ça, c’est coché.",
  "On continue, tout doux.",
  "Noisette approuve.",
  "Encore un geste.",
  "La table est farinée, tant mieux.",
];
let cheerAt = 0;

const bubble = document.createElement("div");
bubble.id = "noisette-dit";
bubble.hidden = true;
bubble.innerHTML = `<img src="illustrations/noisette-bonjour.jpg" alt=""><p></p>`;
document.body.appendChild(bubble);
const bubbleText = bubble.querySelector("p");
let bubbleTimer = 0;

function frenchVoice() {
  if (!window.speechSynthesis) return null;
  const list = speechSynthesis.getVoices();
  return list.find((voice) => voice.lang === "fr-FR") || list.find((voice) => /^fr/i.test(voice.lang || "")) || null;
}

function speak(text) {
  const synth = window.speechSynthesis;
  if (!synth || !text) return;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "fr-FR";
    utter.rate = 0.96;
    utter.pitch = 1.2;
    utter.volume = 1;
    const voice = frenchVoice();
    if (voice) utter.voice = voice;
    const busy = synth.speaking || synth.pending;
    if (busy) synth.cancel();
    if (busy) window.setTimeout(() => synth.speak(utter), 60);
    else synth.speak(utter);
  } catch {
    /* le texte reste affiché si la voix est refusée */
  }
}

if (window.speechSynthesis) {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener("voiceschanged", () => {
    speechSynthesis.getVoices();
  });
}

function say(text, image) {
  speak(text);
  bubbleText.textContent = text;
  bubble.querySelector("img").src = image || "illustrations/noisette-bonjour.jpg";
  bubble.hidden = false;
  window.clearTimeout(bubbleTimer);
  bubbleTimer = window.setTimeout(() => {
    bubble.hidden = true;
  }, 2400);
}

function confetti() {
  const layer = document.createElement("div");
  layer.className = "confetti";
  const colors = ["#8C3228", "#6E5224", "#2C4A38", "#E4D3BC"];
  for (let i = 0; i < 16; i += 1) {
    const bit = document.createElement("i");
    bit.style.left = `${6 + Math.random() * 88}%`;
    bit.style.background = colors[i % colors.length];
    bit.style.animationDelay = `${Math.random() * 0.2}s`;
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 1400);
}

const board = document.createElement("div");
board.className = "etoiles";
board.innerHTML = `<p class="kicker">Les étoiles de Noisette</p><p class="score"></p><div class="rang"></div>`;
document.querySelector("#sommaire").before(board);
const score = board.querySelector(".score");
const rang = board.querySelector(".rang");
document.querySelectorAll("article.recipe").forEach((article) => {
  const star = document.createElement("a");
  star.href = `#${article.id}`;
  star.title = article.querySelector("h2").textContent;
  star.textContent = "★";
  rang.appendChild(star);
});

function updateStars() {
  const stars = [...rang.children];
  let won = 0;
  stars.forEach((star) => {
    const id = star.getAttribute("href").slice(1);
    const article = document.getElementById(id);
    const total = article.querySelectorAll("ol.steps li").length;
    const done = article.querySelectorAll("ol.steps li.done").length;
    const lit = total > 0 && done === total;
    star.classList.toggle("lit", lit);
    if (lit) won += 1;
  });
  score.textContent = won ? `${won} ${won > 1 ? "étoiles" : "étoile"} sur ${stars.length}` : `0 étoile sur ${stars.length}. La première t’attend.`;
}

function paintRecipe(article) {
  const id = article.id;
  const data = load();
  const state = recipeState(data, id);
  const ingredients = [...article.querySelectorAll(".ings li")];
  const steps = [...article.querySelectorAll("ol.steps li")];
  ingredients.forEach((li, index) => li.classList.toggle("done", state.i.includes(index)));
  let found = false;
  steps.forEach((li, index) => {
    const done = state.s.includes(index);
    li.classList.toggle("done", done);
    const now = !done && !found;
    li.classList.toggle("now", now);
    if (now) found = true;
  });
  const progress = article.querySelector(".progress span");
  if (progress) {
    const n = state.s.length;
    progress.textContent = `${n} ${n > 1 ? "étapes" : "étape"} sur ${steps.length}`;
  }
  const link = document.querySelector(`#sommaire a[href="#${id}"]`);
  if (link) {
    link.classList.toggle("done", steps.length > 0 && state.s.length === steps.length);
    const note = link.querySelector("small");
    if (note) {
      const base = note.dataset.base || note.textContent;
      note.dataset.base = base;
      note.textContent = state.s.length ? `${base} · ${state.s.length}/${steps.length}` : base;
    }
  }
  updateStars();
  return steps.length > 0 && state.s.length === steps.length;
}

function toggle(id, key, index) {
  const data = load();
  const state = recipeState(data, id);
  const list = new Set(state[key]);
  if (list.has(index)) list.delete(index);
  else list.add(index);
  state[key] = [...list].sort((a, b) => a - b);
  save(data);
}

document.querySelectorAll("article.recipe").forEach((article) => {
  const title = article.querySelector("h2");
  const row = document.createElement("div");
  row.className = "progress";
  row.innerHTML = `<span></span><button type="button">Effacer les coches</button>`;
  title.after(row);
  row.querySelector("button").addEventListener("click", () => {
    const data = load();
    delete data.checks?.[article.id];
    save(data);
    paintRecipe(article);
  });

  article.querySelectorAll(".ings li").forEach((li, index) => {
    const name = li.querySelector("span")?.textContent || "";
    const kind = kindOf(name);
    li.classList.add("live");
    li.dataset.kind = kind;
    li.insertAdjacentHTML("afterbegin", cast(kind));
    const creature = li.querySelector(".creature");
    const delay = `${(index % 6) * 0.18}s`;
    creature.style.animationDelay = delay;
    creature.querySelectorAll(".pupil").forEach((eye) => {
      eye.style.animationDelay = delay;
    });
    li.addEventListener("click", () => {
      const already = recipeState(load(), article.id).i.includes(index);
      blip(pitches[kind] || 440);
      toggle(article.id, "i", index);
      paintRecipe(article);
      if (already) return;
      li.classList.add("pop");
      window.setTimeout(() => li.classList.remove("pop"), 450);
      let voix = li.querySelector(".voix");
      if (!voix) {
        voix = document.createElement("span");
        voix.className = "voix";
        li.appendChild(voix);
      }
      const qty = li.querySelector("b")?.textContent?.trim() || "";
      const line = qty ? `${qty}. ${voices[kind]}` : voices[kind];
      voix.textContent = line;
      voix.classList.add("on");
      window.setTimeout(() => voix.classList.remove("on"), 2600);
      const allIn = [...article.querySelectorAll(".ings li")].every((row) => row.classList.contains("done"));
      if (allIn) say("Tout est dans le bol. On peut suivre les étapes.");
      else speak(line);
    });
  });
  article.querySelectorAll("ol.steps li").forEach((li, index) => {
    const phrase = li.querySelector(".phrase") || li;
    const button = minuteButton(phrase.textContent);
    if (button) phrase.appendChild(button);
    li.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      const already = recipeState(load(), article.id).s.includes(index);
      toggle(article.id, "s", index);
      const complete = paintRecipe(article);
      if (already) return;
      li.classList.add("pop");
      window.setTimeout(() => li.classList.remove("pop"), 400);
      if (complete) {
        confetti();
        say(`${article.querySelector("h2").textContent} : cette recette est à toi.`, "illustrations/noisette-bonjour.jpg");
      } else if (li.classList.contains("adult")) {
        say("L’adulte était là. On suit.", "illustrations/noisette-chaud.jpg");
      } else {
        say(cheers[cheerAt % cheers.length]);
        cheerAt += 1;
      }
    });
  });
  article.querySelectorAll(".meta div").forEach((card) => {
    const name = card.querySelector("b")?.textContent || "";
    if (name !== "Attendre" && name !== "Cuire") return;
    const button = minuteButton(card.textContent);
    if (button) card.appendChild(button);
  });
  paintRecipe(article);
});

paintTimer();
if (load().timer) tickHandle = window.setInterval(paintTimer, 250);
