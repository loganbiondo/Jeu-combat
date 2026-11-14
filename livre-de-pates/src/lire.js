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
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = audioCtx || new Ctx();
  if (audioCtx.state === "suspended") audioCtx.resume();
  const buffer = audioCtx.createBuffer(1, 1, 22050);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start();
}

function ding() {
  if (navigator.vibrate) navigator.vibrate([180, 80, 180, 80, 360]);
  try {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    const now = audioCtx.currentTime;
    [0, 0.28, 0.56].forEach((at) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.2, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.22);
      osc.start(now + at);
      osc.stop(now + at + 0.24);
    });
  } catch {
    /* le bandeau reste visible si le son est bloqué */
  }
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

const colors = {
  k: "#241C14",
  w: "#FBF6EE",
  y: "#E2A322",
  b: "#F3D48A",
  m: "#F7F3EA",
  s: "#3E6B4F",
  r: "#C44848",
  g: "#C4A574",
  f: "#F4EBD8",
  c: "#5A3318",
  u: "#8FB4D4",
  l: "#6E9A62",
  p: "#E7B7A2",
};

const sprites = {
  farine: ["................", "......kkkk......", ".....kffffk.....", "....kffffffk....", "....kfokkofk....", "....kffffffk....", "....kffffffk....", "....kkkkkkkk....", ".....kffffk.....", ".....kffffk.....", "......kffk......", ".......kk.......", "................", "................", "................", "................"],
  oeuf: ["................", ".....kkkkkk.....", "....kmmmmmmk....", "....kmmmmmmk....", "...kmmmmmmmmk...", "...kmmyymmmmk...", "...kmmokkmmmk...", "...kmmmmmmmmk...", "....kmmmmmmk....", ".....kkkkkk.....", "......k..k......", "......k..k......", "................", "................", "................", "................"],
  beurre: ["................", "................", "....kkkkkkkk....", "....kbbbbbbk....", "....kbokkobk....", "....kbbbbbbk....", "....kbbbbbbk....", "....kkkkkkkk....", "......k..k......", "......k..k......", "................", "................", "................", "................", "................", "................"],
  lait: ["................", ".......kk.......", "......kwwk......", "......kwwk......", ".....kwwwwk.....", "....kwokkook....", "....kwwwwwwk....", "....kwwwwwwk....", "....kwwwwwwk....", ".....kwwwwk.....", "......kkkk......", "......k..k......", "................", "................", "................", "................"],
  sucre: ["................", "................", "...kkkkkkkkk....", "...kwwwwwwwwk...", "...kwokkwwwwk...", "...kwwwwwwwwk...", "...kwwwwwwwwk...", "...kkkkkkkkkk...", ".....k....k.....", ".....k....k.....", "................", "................", "................", "................", "................", "................"],
  sel: ["................", "......kkkk......", ".....kwwwwk.....", ".....kokkwk.....", ".....kwwwwk.....", "......kkkk......", ".......kk.......", ".......kk.......", "......kwwk......", "......kwwk......", "......kwwk......", ".......kk.......", "................", "................", "................", "................"],
  levure: ["................", "....kkkkkkkk....", "....kssssssk....", "....ksokkssk....", "....kssssssk....", "....kssssssk....", "....kkkkkkkk....", "......k..k......", "......k..k......", "................", "................", "................", "................", "................", "................", "................"],
  chocolat: ["................", "....kkkkkkkk....", "....kcccccck....", "....kcokkock....", "....kcccccck....", "....kcccccck....", "....kkkkkkkk....", "......k..k......", "......k..k......", "................", "................", "................", "................", "................", "................", "................"],
  amande: ["................", ".......kk.......", "......kggk......", ".....kggggk.....", "....kgokkogk....", "....kggggggk....", ".....kggggk.....", "......kggk......", ".......kk.......", "......k..k......", "................", "................", "................", "................", "................", "................"],
  fruit: ["................", ".......ll.......", "......llll......", ".....krrrrk.....", "....krrrrrrk....", "....krokkrork...", "....krrrrrrk....", "....krrrrrrk....", ".....krrrrk.....", "......kkkk......", "......k..k......", "................", "................", "................", "................", "................"],
  creme: ["................", "....kkkkkkkk....", "....kmmmmmmk....", "....kmokkmmk....", "....kmmmmmmk....", "....kmmmmmmk....", "....kkkkkkkk....", "....kmmmmmmk....", "....kmmmmmmk....", "....kkkkkkkk....", "......k..k......", "................", "................", "................", "................", "................"],
  huile: ["................", ".......kk.......", "......kyyk......", "......kyyk......", ".....kyyyyk.....", "....kyokkyok....", "....kyyyyyyk....", "....kyyyyyyk....", ".....kyyyyk.....", "......kkkk......", "......k..k......", "................", "................", "................", "................", "................"],
  eau: ["................", ".......kk.......", "......kuuk......", ".....kuuuuk.....", "....kuokuouk....", "....kuuuuuuk....", "....kuuuuuuk....", ".....kuuuuk.....", "......kuuk......", ".......kk.......", "......k..k......", "................", "................", "................", "................", "................"],
  confiture: ["................", "....kkkkkkkk....", "....krrrrrrk....", "....krokkrork...", "....krrrrrrk....", "....kkkkkkkk....", "....kmmmmmmk....", "....kmmmmmmk....", "....kkkkkkkk....", "......k..k......", "................", "................", "................", "................", "................", "................"],
  fromage: ["................", "....kkkk........", "....kyyyyk......", "....kyokyyk.....", "....kyyyyyk.....", "....kyyyyyyk....", "....kkkkkkkk....", "......k..k......", "......k..k......", "................", "................", "................", "................", "................", "................", "................"],
  pate: ["................", "................", ".....kkkkkk.....", "....kppppppk....", "....kpokkppk....", "....kppppppk....", "....kppppppk....", ".....kkkkkk.....", "......k..k......", "......k..k......", "................", "................", "................", "................", "................", "................"],
  bol: ["................", "................", "....kkkkkkkk....", "....kwokkwwk....", "....kwwwwwwk....", "....kwwwwwwk....", "...kwwwwwwwwk...", "...kkkkkkkkkk...", "................", "................", "................", "................", "................", "................", "................", "................"],
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

function pixel(kind) {
  const rows = sprites[kind] || sprites.bol;
  const rects = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (!colors[ch] && ch !== "o") return;
      const fill = ch === "o" ? colors.k : colors[ch];
      const cls = ch === "o" ? ` class="pupil"` : "";
      rects.push(`<rect${cls} x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`);
    });
  });
  return `<svg class="creature" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${rects.join("")}</svg>`;
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
    unlockAudio();
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

function say(text, image) {
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
    li.insertAdjacentHTML("afterbegin", pixel(kind));
    const creature = li.querySelector(".creature");
    const delay = `${(index % 6) * 0.18}s`;
    creature.style.animationDelay = delay;
    creature.querySelectorAll(".pupil").forEach((eye) => {
      eye.style.animationDelay = delay;
    });
    li.addEventListener("click", () => {
      const already = recipeState(load(), article.id).i.includes(index);
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
      voix.textContent = qty ? `${qty}. ${voices[kind]}` : voices[kind];
      voix.classList.add("on");
      window.setTimeout(() => voix.classList.remove("on"), 2200);
      const allIn = [...article.querySelectorAll(".ings li")].every((row) => row.classList.contains("done"));
      if (allIn) say("Tout est dans le bol. On peut suivre les étapes.");
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
