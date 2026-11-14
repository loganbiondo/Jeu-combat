import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { book, chapters, recipes } from "./recettes.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcImg = "/opt/cursor/artifacts/assets";
const illu = path.join(root, "illustrations");
const buildDir = path.join(root, "build");
const dist = path.join(root, "dist");

const copies = [
  ["mix-cover.jpg", "cover.jpg", 3],
  ["noisette-bonjour.jpg", "noisette-bonjour.jpg", 2],
  ["noisette-astuce.jpg", "noisette-astuce.jpg", 2],
  ["noisette-chaud.jpg", "noisette-chaud.jpg", 2],
  ...recipes.map((r) => [`mix-${r.id}.jpg`, `${r.id}.jpg`, 2]),
];

function prepareImages() {
  fs.mkdirSync(illu, { recursive: true });
  const pending = copies.filter(([, dest]) => !fs.existsSync(path.join(illu, dest)));
  if (pending.length === 0) return;
  const jobs = pending.map(([src, dest, scale]) => ({
    src: path.join(srcImg, src),
    dest: path.join(illu, dest),
    scale,
  }));
  for (const job of jobs) {
    if (!fs.existsSync(job.src)) {
      throw new Error(`Illustration manquante : ${path.basename(job.dest)}. Le dossier illustrations/ doit déjà contenir les images du livre.`);
    }
  }
  const py = `
from PIL import Image
import json, sys
jobs = json.loads(sys.stdin.read())
for job in jobs:
    im = Image.open(job["src"]).convert("RGB")
    w, h = im.size
    im = im.resize((w * job["scale"], h * job["scale"]), Image.Resampling.LANCZOS)
    im.save(job["dest"], "JPEG", quality=86, optimize=True)
print(len(jobs))
`;
  execFileSync("python3", ["-c", py], { input: JSON.stringify(jobs) });
}

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function typo(s) {
  return esc(s)
    .replace(/« /g, "«\u202F")
    .replace(/ »/g, "\u202F»")
    .replace(/ :/g, "\u00A0:")
    .replace(/ ;/g, "\u202F;")
    .replace(/ !/g, "\u202F!")
    .replace(/ \?/g, "\u202F?")
    .replace(/(\d)\s+(g|ml|min|cm|°C|h)\b/g, "$1\u00A0$2");
}
function ings(list) {
  return `<ul class="ings">${list
    .map(([q, n]) =>
      q
        ? `<li><b>${typo(q)}</b><span>${typo(n)}</span></li>`
        : `<li><span>${typo(n)}</span></li>`,
    )
    .join("")}</ul>`;
}
function stepsHtml(list) {
  return list
    .map(
      (s, i) =>
        `<div class="step${s.adult ? " adult" : ""}"><div class="num">${i + 1}</div><p>${
          s.adult ? "<em>Avec un adulte. </em>" : ""
        }${typo(s.t)}</p></div>`,
    )
    .join("");
}
function dots(level) {
  return [1, 2, 3].map((n) => (n <= level ? "●" : "○")).join("");
}
function quote(text, img = "noisette-astuce.jpg") {
  return `<div class="quote"><img src="../illustrations/${img}" alt="Noisette"/><p>${typo(text)}</p></div>`;
}

function pagesOfBook() {
  const pages = [];
  const add = (kind, data = {}) => pages.push({ kind, data });

  add("half");
  add("frontis");
  add("title");
  add("copyright");
  add("hello");
  add("rules");
  add("adult");
  add("yeasts");
  add("words");
  add("path");
  add("table");
  add("toc");

  for (const chapter of chapters) {
    add("chapter", chapter);
    for (const recipe of recipes.filter((r) => r.chapter === chapter.id)) {
      add("hero", recipe);
      add("ingredients", recipe);
      add("steps", recipe);
      if (recipe.stepsMore) add("more", recipe);
      if (recipe.finish) add("finish", recipe);
    }
  }

  add("trouble");
  add("safety");
  add("gouter");
  add("shop");
  add("notes");
  add("colophon");
  if (pages.length % 2 === 1) add("notes");
  return pages;
}

function render(page, index, pages) {
  const n = index + 1;
  const side = n % 2 === 1 ? "recto" : "verso";
  const folio = n > 3 ? `<div class="folio">${n}</div>` : "";
  const inner = renderKind(page, pages);
  return `<section class="page ${side}">${folio}${inner}</section>`;
}

function renderKind(page, pages) {
  switch (page.kind) {
    case "half":
      return `<div class="sheet half"><p class="kicker">Le cahier de Noisette</p><div class="rule"></div><h1>${typo(book.title)}</h1><p class="dek mt">${typo(book.subtitle)}</p></div>`;
    case "frontis":
      return `<div class="sheet frontis"><img src="../illustrations/cover.jpg" alt="Noisette et les gâteaux"/><p>L’assiette est peinte. Noisette, elle, vient du dessin animé.</p></div>`;
    case "title":
      return `<div class="sheet title-page"><p class="kicker">Cuisine en famille</p><div class="spacer"></div><h1>${typo(book.title)}</h1><p class="sub">${typo(book.subtitle)}</p><p class="dek mt">Tartes, gâteaux, crêpes et viennoiseries, à faire avec un adulte.</p><div class="spacer"></div><p class="small">Un livre à lire à deux. Noisette montre le geste. L’adulte garde le feu.</p></div>`;
    case "copyright":
      return `<div class="sheet"><p class="kicker">Mentions</p><h2 class="mt">${typo(book.title)}</h2><div class="small mt"><p>Texte original, ${book.year}. Les formules de base sont des pâtes de maison. Les gestes ont été écrits pour un enfant accompagné.</p><p class="mt">Auteur : ${typo(book.author)}</p><p>Personnage : Noisette, dessin original de ce livre.</p><p>ISBN : attribué au moment de la publication.</p><p class="mt">Tous droits réservés. Toute reproduction, même partielle, est soumise à autorisation, sauf courte citation.</p><p class="mt">Les temps dépendent du four. Un adulte est toujours là pour le four, la poêle, l’eau bouillante, les couteaux et la friture.</p><p class="mt">Allergènes selon les recettes : gluten, œufs, lait, amandes, chocolat. Lire chaque page et les étiquettes.</p><p class="mt">Polices : Noto Serif Display et Inter, sous SIL Open Font License.</p></div></div>`;
    case "hello":
      return `<div class="sheet"><p class="run">Pour toi</p><img class="portrait" src="../illustrations/noisette-bonjour.jpg" alt="Noisette te salue"/><h1>Bonjour, c’est Noisette.</h1><p class="why">Elle a de la farine sur le nez et un tablier vert. Autour d’elle, les gâteaux sont peints. Elle, c’est le dessin animé. Les deux styles sont ensemble pour que tu repères tout de suite qui t’accompagne.</p><p class="why">Tu peux mesurer, mélanger, plier et décorer. Quand une étape commence par « Avec un adulte », tu appelles la grande personne. Le four, la poêle, le couteau et l’huile chaude ne sont pas un jeu.</p><p class="why">Les recettes vont de la plus simple à la plus difficile. Les pastilles ●○○ veulent dire : je commence. ●●○ : je progresse. ●●● : je relève le défi, avec un adulte tout près.</p><div class="bottom">${quote("Lis toute la recette avant de sortir le lait. On se trompe moins.", "noisette-bonjour.jpg")}</div></div>`;
    case "rules":
      return `<div class="sheet"><p class="run">Avant de commencer</p><h2>Six règles, à chaque fois</h2><div class="rules mt">${[
        "Un adulte est dans la cuisine, pas dans une autre pièce.",
        "Je me lave les mains et j’attache les cheveux s’ils sont longs.",
        "Je lis la recette jusqu’au bout, puis je sors les ingrédients.",
        "Je pèse. La balance est plus juste qu’un verre. J’appuie sur tare pour repartir de zéro.",
        "Le four, la poêle et la friture, c’est l’adulte. Je ne m’en approche pas sans lui.",
        "On goûte quand l’adulte dit que ce n’est plus brûlant. Le sucre chaud brûle encore.",
      ]
        .map((t, i) => `<div class="rule-row"><div class="n">${i + 1}</div><p>${typo(t)}</p></div>`)
        .join("")}</div><div class="bottom">${quote("La tare, c’est le bouton qui remet la balance à zéro avec le bol dessus.", "noisette-astuce.jpg")}</div></div>`;
    case "adult":
      return `<div class="sheet"><p class="run">Pour l’adulte</p><h2>Ce qui évite les ratés</h2><div class="small mt"><p>Les températures sont données pour un four à chaleur statique, grille du milieu. En chaleur tournante, baissez de 15 °C. Les œufs sont moyens, environ 50 g sans la coquille. S’ils sont très gros, la pâte sera plus molle : un peu de farine, cuillère par cuillère.</p><p class="mt">Le beurre froid se sable. Le beurre mou se crème : le doigt s’enfonce, il ne coule pas. Le beurre fondu doit tiédir avant de toucher les œufs.</p><p class="mt">Levure fraîche et levure sèche de boulanger sont la même famille. 20 g de fraîche = 7 g de sèche. 25 g de fraîche = 8 g de sèche. La levure chimique est une poudre pour les gâteaux : on ne les échange pas.</p><p class="mt">Le lait des brioches est tiède, jamais brûlant. Le lait des croissants et des danois est froid, pour que le beurre des tours ne fonde pas.</p><p class="mt">Ce livre se fait à deux. L’enfant pèse, mélange, plie et décore. Vous gardez le feu, les lames, le démoulage et la friture.</p></div>${quote("Si le lait brûle le doigt, il est trop chaud pour la levure.", "noisette-chaud.jpg")}</div>`;
    case "yeasts":
      return `<div class="sheet"><p class="run">À ne pas confondre</p><h2>Deux levures, deux métiers</h2><div class="two mt"><div class="card sage"><h3>Levure de boulanger</h3><p>Elle est vivante. Elle fait gonfler la pâte avant le four : brioche, beignets, croissants, danois. Fraîche, elle s’émiette. Sèche, elle se mélange à la farine. Un liquide brûlant la tue, et rien ne gonfle.</p></div><div class="card"><h3>Levure chimique</h3><p>C’est une poudre. Elle fait gonfler dans le four : pancakes, gaufres, cookies, muffins, cake, madeleines, financiers. On la mélange très bien à la farine, sinon un morceau a un goût amer.</p></div></div><div class="card white mt"><h3>Le bon réflexe</h3><p>Si la recette dit « levure fraîche », ce n’est pas le sachet de gâteau. Si elle dit « levure chimique », ce n’est pas le cube du boulanger. Les échanger, c’est la panne la plus fréquente.</p></div><div class="bottom">${quote("Regarde le nom sur le paquet avant de verser.", "noisette-chaud.jpg")}</div></div>`;
    case "words":
      return `<div class="sheet"><p class="run">Les mots</p><h2>Ce que Noisette veut dire</h2><div class="gloss mt">${[
        ["Sabler", "Frotter le beurre froid dans la farine jusqu’à obtenir du sable."],
        ["Foncer", "Étaler la pâte dans le moule, avec un bord qui monte."],
        ["Piquer", "Faire des trous avec une fourchette pour que le fond ne gonfle pas."],
        ["Dorer", "Badigeonner d’œuf battu, sans écraser la pâte."],
        ["Laisser doubler", "Attendre que la pâte devienne deux fois plus grosse."],
        ["Tourer", "Plier la pâte en trois, comme une lettre, pour faire des feuilles."],
        ["Dessécher", "Sécher la pâte à choux une minute dans la casserole."],
        ["Cuisson à blanc", "Cuire la pâte seule, avec du papier et des légumes secs dessus."],
        ["Beurre noisette", "Beurre fondu jusqu’à l’odeur de noisette et de petits points bruns."],
        ["Chaleur statique", "Four sans ventilateur. C’est celle de ce livre."],
      ]
        .map(([a, b]) => `<div><b>${typo(a)}</b><span>${typo(b)}</span></div>`)
        .join("")}</div></div>`;
    case "path":
      return `<div class="sheet"><p class="run">Par où commencer</p><h2>Quatre goûters, puis un défi</h2><p class="why">Inutile de commencer par les croissants. Noisette propose cet ordre. Chaque réussite donne le geste de la suivante.</p><div class="path"><div class="card"><b>1. Le jour même</b><p>Pancakes ou crêpes. Tu apprends à mélanger et à reconnaître une pâte lisse.</p></div><div class="card"><b>2. Le lendemain</b><p>Cookies ou muffins. Tu apprends le four, avec l’adulte, et à ne pas trop mélanger.</p></div><div class="card"><b>3. La semaine d’après</b><p>Pâte brisée ou sablée, puis la tarte qui va avec. Tu apprends à sabler sans pétrir.</p></div><div class="card"><b>4. Quand tu es à l’aise</b><p>Brioche légère. Ensuite seulement les beignets, les danois et les croissants.</p></div></div><div class="bottom">${quote("Une recette réussie vaut mieux que trois commencées.", "noisette-bonjour.jpg")}</div></div>`;
    case "table":
      return `<div class="sheet"><p class="run">Quelle pâte ?</p><h2>Les 18, d’un coup d’œil</h2><table class="table mt"><thead><tr><th>Recette</th><th>Pour</th><th>Niveau</th></tr></thead><tbody>${recipes
        .map((r) => {
          const use = {
            pancakes: "Matin et goûter",
            crepes: "Dîner ou goûter",
            gaufres: "Goûter croustillant",
            cookies: "Boîte à biscuits",
            muffins: "Dix gâteaux individuels",
            cake: "Un cake à partager",
            madeleines: "Coques à la bosse",
            financiers: "Petits gâteaux à l’amande",
            brisee: "Quiche et tartes salées",
            sablee: "Tarte aux fruits frais",
            sucree: "Tarte aux poires",
            amandine: "Tarte à l’amande",
            feuilletee: "Palmiers feuilletés",
            choux: "Choux à garnir froids",
            brioche: "Huit petites brioches",
            beignets: "Friture, adulte seulement",
            danois: "Carrés à la confiture",
            croissants: "Le grand défi",
          }[r.id];
          return `<tr><td>${typo(r.title)}</td><td>${typo(use)}</td><td>${dots(r.level)} ${typo(r.levelLabel)}</td></tr>`;
        })
        .join("")}</tbody></table></div>`;
    case "toc":
      return `<div class="sheet"><p class="run">Sommaire</p><h2>Dans l’ordre du livre</h2><div class="toc mt">${chapters
        .map((c) => {
          const head = pageNo(pages, "chapter", c.id);
          const items = recipes
            .filter((r) => r.chapter === c.id)
            .map((r) => `<div class="li" style="display:flex;justify-content:space-between;gap:0.15in;border-bottom:1px solid var(--line);padding:0.045in 0;font-size:11.5pt"><span>${typo(r.title)}</span><span>${pageNo(pages, "hero", r.id)}</span></div>`)
            .join("");
          return `<div class="ch">${typo(c.title)} · ${head}</div>${items}`;
        })
        .join("")}</div></div>`;
    case "chapter": {
      const c = page.data;
      const list = recipes.filter((r) => r.chapter === c.id);
      return `<div class="sheet chapter"><p class="chapter-num">Chapitre ${c.num}</p><h1>${typo(c.title)}</h1><p class="lead">${typo(c.lead)}</p><ul>${list
        .map((r) => `<li>${typo(r.title)} <span>${typo(r.levelLabel)}</span></li>`)
        .join("")}</ul><div class="bottom">${quote("Regarde le niveau. Tu as le droit de sauter une page et d’y revenir.", "noisette-bonjour.jpg")}</div></div>`;
    }
    case "hero": {
      const r = page.data;
      return `<div class="sheet"><p class="kicker">Recette ${String(recipes.indexOf(r) + 1).padStart(2, "0")} · ${typo(r.levelLabel)}</p><img class="hero-img" src="../illustrations/${r.id}.jpg" alt="${typo(r.title)} avec Noisette"/><h1>${typo(r.title)}</h1><p class="dek">${typo(r.dek)}</p><div class="meta"><div><b>Pour</b><span>${typo(r.yield)}</span></div><div><b>Préparer</b><span>${typo(r.prep)}</span></div><div><b>Attendre</b><span>${typo(r.rest)}</span></div><div><b>Cuire</b><span>${typo(r.bake)}</span></div></div></div>`;
    }
    case "ingredients": {
      const r = page.data;
      return `<div class="sheet"><p class="run">${typo(r.title)}</p><h2>Il te faut</h2><p class="why">${typo(r.why)}</p><h3>Ingrédients</h3>${ings(r.ingredients)}<div class="two"><div class="card"><h3>Avant</h3><ul>${r.before.map((t) => `<li>${typo(t)}</li>`).join("")}</ul></div><div class="card sage"><h3>Matériel</h3><ul>${r.gear.map((t) => `<li>${typo(t)}</li>`).join("")}</ul><p class="mt"><b>Allergènes.</b> ${typo(r.allergens)}.</p></div></div><div class="bottom">${quote(r.noisette)}</div></div>`;
    }
    case "steps": {
      const r = page.data;
      const closing = r.stepsMore
        ? `<div class="card gold"><h3>Pas encore fini</h3><p>La cuisson est sur la page d’après. On ne goûte pas maintenant.</p></div>`
        : `<div class="split"><div class="card sage"><h3>C’est réussi quand</h3><p>${typo(r.success)}</p></div><div class="card"><h3>On le garde</h3><p>${typo(r.keep)}</p></div></div><div class="card gold"><h3>Noisette dit</h3><p>${typo(r.tip)}</p></div><p class="note">${typo(r.oven)}</p>`;
      return `<div class="sheet"><p class="run">${typo(r.title)}</p><h2>Les étapes</h2><div class="mt">${stepsHtml(r.steps)}</div><div class="bottom">${closing}</div></div>`;
    }
    case "more": {
      const r = page.data;
      return `<div class="sheet"><p class="run">${typo(r.title)}</p><h2>${typo(r.stepsMoreTitle)}</h2><div class="mt">${stepsHtml(r.stepsMore)}</div><div class="bottom"><div class="split"><div class="card sage"><h3>C’est réussi quand</h3><p>${typo(r.success)}</p></div><div class="card"><h3>On le garde</h3><p>${typo(r.keep)}</p></div></div><div class="card gold"><h3>Noisette dit</h3><p>${typo(r.tip)} ${typo(r.noisette)}</p></div><p class="note">${typo(r.oven)}</p></div></div>`;
    }
    case "finish": {
      const r = page.data;
      const f = r.finish;
      return `<div class="sheet"><p class="run">${typo(r.title)}</p><h2>${typo(f.title)}</h2><p class="why">${typo(f.intro)}</p><h3>En plus</h3>${ings(f.ingredients)}<div class="mt">${stepsHtml(f.steps)}</div><div class="bottom"><p class="note">${typo(r.oven)}</p></div></div>`;
    }
    case "trouble":
      return `<div class="sheet"><p class="run">Si ça coince</p><h2>Neuf ratés, neuf réparations</h2><div class="gloss mt">${[
        ["Pâte trop sèche", "Une cuillère à café d’eau froide. On attend, on regarde, on n’en verse pas un verre."],
        ["Pâte trop collante", "20 minutes au frais. Ensuite seulement, un peu de farine sur le plan."],
        ["Beurre qui fond dans les tours", "On s’arrête. 20 minutes au réfrigérateur. On ne roule pas un beurre mou."],
        ["Rien ne gonfle", "Le lait était trop chaud, ou la levure était périmée. On vérifie la date et on recommence."],
        ["Gâteau doré et cru", "Four trop chaud, ou moule trop petit. On baisse, on couvre d’un papier, on prolonge."],
        ["Cookies durs", "Ils ont cuit trop longtemps, ou la pâte a été trop mélangée."],
        ["Choux retombés", "La porte du four a été ouverte trop tôt. La prochaine fois, on attend 25 minutes."],
        ["Crêpes en grumeaux", "On a versé tout le lait d’un coup. On ajoute une cuillère de lait et on mélange au centre."],
        ["Beignets gras", "L’huile n’était pas à 170 °C. On en fait moins à la fois, et on attend entre les fournées."],
      ]
        .map(([a, b]) => `<div><b>${typo(a)}</b><span>${typo(b)}</span></div>`)
        .join("")}</div></div>`;
    case "safety":
      return `<div class="sheet"><p class="run">Les endroits chauds</p><h2>Ce que l’adulte garde</h2><div class="two mt"><div><div class="card"><h3>Le four</h3><p>L’adulte l’allume, ouvre la porte avec une manique, et sort la plaque. On ne pose pas la main sur la porte.</p></div><div class="card mt"><h3>La poêle</h3><p>Le manche ne dépasse pas de la cuisinière. On ne jette pas d’eau sur l’huile chaude.</p></div></div><div><div class="card"><h3>Le couteau</h3><p>L’adulte coupe le beurre froid, épluche les fruits et tranche la pâte. Toi, tu peux décorer.</p></div><div class="card mt"><h3>La friture</h3><p>Un seul adulte, une casserole haute, 170 °C, pas d’eau, un couvercle à portée. L’huile refroidit dans la casserole, sans qu’on la déplace.</p></div></div></div><div class="bottom">${quote("Si tu ne sais pas si c’est chaud, c’est que tu ne touches pas. Tu demandes.", "noisette-chaud.jpg")}</div></div>`;
    case "gouter":
      return `<div class="sheet"><p class="run">Un mois de goûters</p><h2>Quatre idées toutes prêtes</h2><div class="path"><div class="card"><b>Le matin pressé</b><p>Pancakes. Le beurre et le lait sortent pendant que tu pèses la farine.</p></div><div class="card"><b>Le goûter d’anniversaire</b><p>Cake sucré et une assiette de financiers, s’il n’y a pas d’allergie aux amandes.</p></div><div class="card"><b>Le dîner léger</b><p>Crêpes, avec du sucre pour les uns et du fromage pour les autres. La pâte n’a pas de sucre.</p></div><div class="card"><b>Le dimanche long</b><p>Pâte sablée le matin, repos pendant une histoire, tarte aux fruits l’après-midi.</p></div></div><p class="why">Les croissants et les danois demandent une journée et une cuisine pas trop chaude. On les choisit quand on a déjà réussi une brioche.</p></div>`;
    case "shop":
      return `<div class="sheet"><p class="run">Les courses</p><h2>Le placard de base</h2><p class="why">Avec ça, presque toutes les recettes démarrent. On ajoute les fruits, la confiture et le chocolat selon la page du jour.</p><div class="two"><div class="card"><h3>Toujours</h3><ul><li>Farine de blé T55</li><li>Beurre doux</li><li>Œufs moyens</li><li>Lait</li><li>Sucre, sucre glace, cassonade</li><li>Sel fin</li><li>Levure chimique</li><li>Levure de boulanger fraîche ou sèche</li></ul></div><div class="card sage"><h3>Selon la recette</h3><ul><li>Poudre d’amandes</li><li>Chocolat</li><li>Confiture épaisse</li><li>Huile de tournesol</li><li>Crème liquide</li><li>Fruits de saison</li><li>Papier cuisson</li></ul></div></div><div class="bottom">${quote("On lit la recette, puis on coche. On n’achète pas le placard entier d’un coup.", "noisette-astuce.jpg")}</div></div>`;
    case "notes":
      return `<div class="sheet"><p class="run">À toi</p><h2>Mes essais</h2><p class="dek">La date, la recette, et ce que tu changeras la prochaine fois.</p><div class="lines"></div></div>`;
    case "colophon":
      return `<div class="sheet half"><p class="kicker">Fin</p><div class="rule"></div><h2>Merci d’avoir fariné la table.</h2><p class="why">Noisette range son tablier. Les 18 pâtes sont à toi : tu peux les refaire, les rater une fois, et les réussir la fois d’après. L’adulte est encore là pour le four.</p><p class="small">${typo(book.title)} · ${book.year}</p></div>`;
    default:
      return "";
  }
}

function pageNo(pages, kind, id) {
  const i = pages.findIndex((p) => {
    if (p.kind !== kind) return false;
    if (kind === "chapter") return p.data.id === id;
    if (p.data && p.data.id) return p.data.id === id;
    return true;
  });
  return i >= 0 ? String(i + 1) : "";
}

function htmlDocument(body) {
  const css = fs.readFileSync(path.join(root, "src", "print.css"), "utf8");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(book.title)}</title><style>${css}</style></head><body>${body}</body></html>`;
}

function printPdf(htmlPath, pdfPath) {
  try {
    execFileSync("pkill", ["-f", "chrome --headless"]);
  } catch {
    /* aucun chrome à arrêter */
  }
  if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--no-pdf-header-footer",
    "--virtual-time-budget=40000",
    `--print-to-pdf=${pdfPath}`,
    `file://${htmlPath}`,
  ];
  try {
    execFileSync("google-chrome", args, { timeout: 70000, stdio: "pipe" });
  } catch (err) {
    if (!fs.existsSync(pdfPath) || fs.statSync(pdfPath).size < 8000) {
      const detail = err.stderr ? err.stderr.toString().slice(-500) : String(err);
      throw new Error(`PDF impossible : ${detail}`);
    }
  }
}

function buildCover(pageCount) {
  const bleed = 0.125;
  const tw = 8;
  const th = 10;
  const spine = +(pageCount * 0.002347).toFixed(4);
  const W = bleed + tw + spine + tw + bleed;
  const H = bleed + th + bleed;
  const frontLeft = bleed + tw + spine;
  const safePt = (spine - 0.125) * 72;
  const spineText = safePt >= 8 ? "MES PREMIÈRES PÂTES" : "";
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
    @page { size: ${W}in ${H}in; margin: 0; }
    html, body { margin: 0; padding: 0; }
    @font-face { font-family: Display; src: url("../fonts/NotoSerifDisplay-Bold.ttf") format("truetype"); font-weight: 700; }
    @font-face { font-family: Text; src: url("../fonts/Inter-Regular.ttf") format("truetype"); }
    @font-face { font-family: Text; src: url("../fonts/Inter-SemiBold.ttf") format("truetype"); font-weight: 600; }
    * { box-sizing: border-box; }
    .wrap { width: ${W}in; height: ${H}in; position: relative; background: #FBF6EE; overflow: hidden; }
    .back { position: absolute; left: ${bleed}in; top: ${bleed}in; width: ${tw}in; height: ${th}in; padding: 0.45in 0.5in; }
    .spine { position: absolute; left: ${bleed + tw}in; top: 0; width: ${spine}in; height: ${H}in; background: #9C4033; }
    .frontimg { position: absolute; left: ${frontLeft}in; top: 0; width: ${tw + bleed}in; height: ${H}in; object-fit: cover; object-position: center 30%; }
    .titlebox { position: absolute; left: ${frontLeft + 0.38}in; bottom: ${bleed + 0.38}in; width: ${tw - 0.76}in; background: rgba(251,246,238,0.94); padding: 0.22in 0.24in 0.2in; }
    h1 { font-family: Display, serif; font-size: 32pt; line-height: 0.95; margin: 0; color: #2A2118; }
    .sub { font-family: Text, sans-serif; font-size: 12pt; margin: 0.08in 0 0; color: #5C5148; }
    .k { font-family: Text, sans-serif; font-size: 9pt; letter-spacing: 0.16em; text-transform: uppercase; color: #9C4033; font-weight: 600; margin: 0 0 0.08in; }
    .back h2 { font-family: Display, serif; font-size: 20pt; margin: 0.08in 0; color: #2A2118; }
    .back p, .back li { font-family: Text, sans-serif; font-size: 11pt; line-height: 1.35; color: #2A2118; }
    .back ul { margin: 0.08in 0 0; padding-left: 0.16in; }
    .mini { width: 1.15in; height: 1.15in; object-fit: cover; object-position: center 15%; border-radius: 6px; float: right; margin-left: 0.12in; }
    .barcode { position: absolute; left: ${bleed + tw - 0.28 - 2}in; top: ${H - bleed - 0.32 - 1.2}in; width: 2in; height: 1.2in; background: white; }
  </style></head><body><div class="wrap">
    <img class="frontimg" src="../illustrations/cover.jpg" alt=""/>
    <div class="titlebox"><p class="k">18 recettes · avec un adulte</p><h1>Mes premières pâtes</h1><p class="sub">Le cahier illustré qu’un enfant peut réussir. Noisette, en dessin animé, montre le geste à côté de chaque assiette peinte.</p></div>
    <div class="spine"></div>
    <div class="back"><img class="mini" src="../illustrations/noisette-bonjour.jpg" alt=""/><p class="k">Le cahier de Noisette</p><h2>Mes premières pâtes</h2><p>Dix-huit pâtes et gâteaux, du pancake au croissant, écrits en gestes courts. L’enfant pèse, mélange et façonne. L’adulte garde le four, la poêle et la friture.</p><ul><li>Des plus simples aux plus difficiles</li><li>Les deux levures, pour ne plus les confondre</li><li>Une suite simple pour chaque pâte à tarte</li><li>Les ratés, et comment les réparer</li></ul><p style="margin-top:0.15in">Dès 6 ou 7 ans, toujours avec un adulte à la cuisine.</p></div>
    <div class="barcode"></div>
  </div></body></html>`;
  const htmlPath = path.join(buildDir, "couverture.html");
  fs.writeFileSync(htmlPath, html);
  const pdfPath = path.join(dist, "mes-premieres-pates-couverture.pdf");
  printPdf(htmlPath, pdfPath);
  fs.writeFileSync(
    path.join(buildDir, "couverture-mesures.txt"),
    `pages=${pageCount}\nspine_in=${spine}\ncover_in=${W} x ${H}\nspine_text_pt=${safePt.toFixed(2)}\nspine_text=${spineText || "aucun, dos trop fin pour un 7 pt sûr"}\n`,
  );
  return { spine, W, H, safePt };
}

function buildEbookCover() {
  const htmlPath = path.join(buildDir, "ebook-cover.html");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: Display; src: url("../fonts/NotoSerifDisplay-Bold.ttf") format("truetype"); }
    @font-face { font-family: Text; src: url("../fonts/Inter-Regular.ttf") format("truetype"); }
    @font-face { font-family: Text; src: url("../fonts/Inter-SemiBold.ttf") format("truetype"); font-weight: 600; }
    html, body { margin: 0; width: 800px; height: 1280px; overflow: hidden; background: #FBF6EE; }
    .frame { width: 800px; height: 1280px; position: relative; }
    img.art { width: 800px; height: 980px; object-fit: cover; object-position: center 28%; display: block; }
    .band { position: absolute; left: 0; right: 0; bottom: 0; height: 340px; background: #FBF6EE; padding: 28px 48px 0; }
    .k { font-family: Text, sans-serif; color: #9C4033; letter-spacing: 0.14em; text-transform: uppercase; font-size: 16px; font-weight: 600; margin: 0; }
    h1 { font-family: Display, serif; font-size: 64px; line-height: 0.92; margin: 10px 0 0; color: #2A2118; }
    p { font-family: Text, sans-serif; font-size: 22px; line-height: 1.35; color: #5C5148; margin: 14px 0 0; }
  </style></head><body><div class="frame"><img class="art" src="../illustrations/cover.jpg" alt=""/><div class="band"><p class="k">18 recettes · avec un adulte</p><h1>Mes premières pâtes</h1><p>Le cahier illustré qu’un enfant peut réussir, entre peinture et dessin animé.</p></div></div></body></html>`;
  fs.writeFileSync(htmlPath, html);
  const out = path.join(dist, "mes-premieres-pates-couverture-ebook.png");
  try {
    execFileSync("pkill", ["-f", "chrome --headless"]);
  } catch {
    /* rien */
  }
  try {
    execFileSync(
      "google-chrome",
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--hide-scrollbars",
        "--window-size=800,1280",
        "--force-device-scale-factor=2",
        "--virtual-time-budget=20000",
        `--screenshot=${out}`,
        `file://${htmlPath}`,
      ],
      { timeout: 40000, stdio: "pipe" },
    );
  } catch (err) {
    if (!fs.existsSync(out)) throw err;
  }
}

function buildEpub() {
  const epubRoot = path.join(buildDir, "epub");
  const oeb = path.join(epubRoot, "OEBPS");
  fs.mkdirSync(path.join(oeb, "images"), { recursive: true });
  fs.mkdirSync(path.join(epubRoot, "META-INF"), { recursive: true });
  fs.writeFileSync(path.join(epubRoot, "mimetype"), "application/epub+zip");
  for (const file of fs.readdirSync(illu)) {
    if (file.endsWith(".jpg")) fs.copyFileSync(path.join(illu, file), path.join(oeb, "images", file));
  }
  const css = `body{font-family:Georgia,serif;font-size:1.15em;line-height:1.5;margin:1em} h1{font-size:1.7em;line-height:1.15} h2{font-size:1.25em} img{max-width:100%;height:auto;margin:0.6em 0} p,li{margin:0.45em 0} .adult{font-weight:bold}`;
  fs.writeFileSync(path.join(oeb, "style.css"), css);
  const manifest = [];
  const spine = [];
  function writeXhtml(name, title, body) {
    const xhtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr" xml:lang="fr"><head><title>${esc(title)}</title><link rel="stylesheet" href="style.css"/></head><body>${body}</body></html>`;
    fs.writeFileSync(path.join(oeb, name), xhtml);
    const id = name.replace(".xhtml", "");
    manifest.push(`<item id="${id}" href="${name}" media-type="application/xhtml+xml"/>`);
    spine.push(`<itemref idref="${id}"/>`);
  }
  writeXhtml(
    "intro.xhtml",
    book.title,
    `<h1>${esc(book.title)}</h1><p>${esc(book.subtitle)}</p><img src="images/cover.jpg" alt="Noisette et les gâteaux"/><p>Noisette est le personnage en dessin animé. Les gâteaux sont peints. Un adulte reste là pour le four, la poêle, les couteaux et la friture.</p><p>Les températures sont pour un four sans ventilateur. S’il ventile, baissez de 15 °C. 20 g de levure fraîche = 7 g de levure sèche. 25 g de fraîche = 8 g de sèche. La levure chimique ne se remplace pas par de la levure de boulanger.</p>`,
  );
  for (const r of recipes) {
    const blocks = [
      `<h1>${esc(r.title)}</h1>`,
      `<img src="images/${r.id}.jpg" alt="${esc(r.title)}"/>`,
      `<p>${esc(r.dek)}</p>`,
      `<p>Pour ${esc(r.yield)}. Préparation ${esc(r.prep)}. Attente ${esc(r.rest)}. Cuisson ${esc(r.bake)}. Niveau : ${esc(r.levelLabel)}.</p>`,
      `<p>${esc(r.why)}</p>`,
      `<h2>Ingrédients</h2><ul>${r.ingredients.map(([q, n]) => `<li>${esc(q ? q + " " : "")}${esc(n)}</li>`).join("")}</ul>`,
      `<h2>Étapes</h2><ol>${r.steps.map((s) => `<li>${s.adult ? `<span class="adult">Avec un adulte. </span>` : ""}${esc(s.t)}</li>`).join("")}</ol>`,
    ];
    if (r.stepsMore) {
      blocks.push(`<h2>${esc(r.stepsMoreTitle)}</h2><ol>${r.stepsMore.map((s) => `<li>${s.adult ? `<span class="adult">Avec un adulte. </span>` : ""}${esc(s.t)}</li>`).join("")}</ol>`);
    }
    if (r.finish) {
      blocks.push(`<h2>${esc(r.finish.title)}</h2><p>${esc(r.finish.intro)}</p><ul>${r.finish.ingredients.map(([q, n]) => `<li>${esc(q)} ${esc(n)}</li>`).join("")}</ul><ol>${r.finish.steps.map((s) => `<li>${s.adult ? `<span class="adult">Avec un adulte. </span>` : ""}${esc(s.t)}</li>`).join("")}</ol>`);
    }
    blocks.push(`<p><strong>C’est réussi quand.</strong> ${esc(r.success)}</p><p><strong>Conservation.</strong> ${esc(r.keep)}</p><p><strong>Noisette.</strong> ${esc(r.tip)}</p><p>${esc(r.oven)}</p><p>Allergènes : ${esc(r.allergens)}.</p>`);
    writeXhtml(`${r.id}.xhtml`, r.title, blocks.join(""));
  }
  const nav = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="fr"><head><title>Sommaire</title></head><body><nav epub:type="toc"><h1>Sommaire</h1><ol><li><a href="intro.xhtml">${esc(book.title)}</a></li>${recipes
    .map((r) => `<li><a href="${r.id}.xhtml">${esc(r.title)}</a></li>`)
    .join("")}</ol></nav></body></html>`;
  fs.writeFileSync(path.join(oeb, "nav.xhtml"), nav);
  manifest.push(`<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`);
  manifest.push(`<item id="css" href="style.css" media-type="text/css"/>`);
  manifest.push(`<item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>`);
  for (const file of fs.readdirSync(path.join(oeb, "images"))) {
    if (file === "cover.jpg") continue;
    manifest.push(`<item id="img-${file.replace(".", "-")}" href="images/${file}" media-type="image/jpeg"/>`);
  }
  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="3.0" xml:lang="fr">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="uid">urn:uuid:mes-premieres-pates-2026</dc:identifier>
<dc:title>${esc(book.title)}</dc:title>
<dc:language>fr</dc:language>
<dc:creator>${esc(book.author)}</dc:creator>
<dc:date>${book.year}</dc:date>
<meta property="dcterms:modified">2026-11-13T00:00:00Z</meta>
<meta name="cover" content="cover-image"/>
</metadata>
<manifest>
${manifest.join("\n")}
</manifest>
<spine>${spine.join("")}</spine>
</package>`;
  fs.writeFileSync(path.join(oeb, "content.opf"), opf);
  fs.writeFileSync(
    path.join(buildDir, "epub", "META-INF", "container.xml"),
    `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
  );
  const epubPath = path.join(dist, "mes-premieres-pates.epub");
  execFileSync("python3", [
    "-c",
    `
import zipfile, os, sys
root, out = sys.argv[1], sys.argv[2]
if os.path.exists(out): os.remove(out)
z = zipfile.ZipFile(out, "w")
z.write(os.path.join(root, "mimetype"), "mimetype", compress_type=zipfile.ZIP_STORED)
for base, dirs, files in os.walk(root):
    for name in files:
        if name == "mimetype":
            continue
        full = os.path.join(base, name)
        rel = os.path.relpath(full, root)
        z.write(full, rel, compress_type=zipfile.ZIP_DEFLATED)
z.close()
`,
    path.join(buildDir, "epub"),
    epubPath,
  ]);
}

const uses = {
  pancakes: "Matin et goûter",
  crepes: "Dîner ou goûter",
  gaufres: "Goûter croustillant",
  cookies: "Boîte à biscuits",
  muffins: "Dix gâteaux individuels",
  cake: "Un cake à partager",
  madeleines: "Coques à la bosse",
  financiers: "Petits gâteaux à l’amande",
  brisee: "Quiche et tartes salées",
  sablee: "Tarte aux fruits frais",
  sucree: "Tarte aux poires",
  amandine: "Tarte à l’amande",
  feuilletee: "Palmiers feuilletés",
  choux: "Choux à garnir froids",
  brioche: "Huit petites brioches",
  beignets: "Friture, adulte seulement",
  danois: "Carrés à la confiture",
  croissants: "Le grand défi",
};

function stepItems(list) {
  return list
    .map((s) => {
      const phrase = `${s.adult ? `<span class="badge">Avec un adulte. </span>` : ""}${typo(s.t)}`;
      return `<li${s.adult ? ` class="adult"` : ""}><span class="phrase">${phrase}</span></li>`;
    })
    .join("");
}

function buildReader() {
  const toc = chapters
    .map((c) => {
      const items = recipes
        .filter((r) => r.chapter === c.id)
        .map((r) => `<a href="#${r.id}">${typo(r.title)}<small>${typo(r.levelLabel)} · ${typo(uses[r.id] || r.yield)}</small></a>`)
        .join("");
      return `<p class="ch-label">${typo(c.num)} · ${typo(c.title)}</p>${items}`;
    })
    .join("");

  const recipesHtml = chapters
    .map((c) => {
      const cards = recipes
        .filter((r) => r.chapter === c.id)
        .map((r) => {
          const more = r.stepsMore
            ? `<h3>${typo(r.stepsMoreTitle)}</h3><ol class="steps">${stepItems(r.stepsMore)}</ol>`
            : "";
          const finish = r.finish
            ? `<h3>${typo(r.finish.title)}</h3><p class="block">${typo(r.finish.intro)}</p>${ings(r.finish.ingredients)}<ol class="steps">${stepItems(r.finish.steps)}</ol>`
            : "";
          return `<article class="recipe" id="${r.id}">
            <p class="kicker">${typo(r.levelLabel)} · ${dots(r.level)}</p>
            <h2>${typo(r.title)}</h2>
            <img src="illustrations/${r.id}.jpg" alt="${typo(r.title)} avec Noisette">
            <p class="lead">${typo(r.dek)}</p>
            <div class="meta">
              <div><b>Pour</b><span>${typo(r.yield)}</span></div>
              <div><b>Préparer</b><span>${typo(r.prep)}</span></div>
              <div><b>Attendre</b><span>${typo(r.rest)}</span></div>
              <div><b>Cuire</b><span>${typo(r.bake)}</span></div>
            </div>
            <p class="block">${typo(r.why)}</p>
            <h3>Il te faut</h3>
            ${ings(r.ingredients)}
            <div class="cards two">
              <div class="card"><h3>Avant</h3><ul class="plain">${r.before.map((t) => `<li>${typo(t)}</li>`).join("")}</ul></div>
              <div class="card sage"><h3>Matériel</h3><ul class="plain">${r.gear.map((t) => `<li>${typo(t)}</li>`).join("")}</ul><p><b>Allergènes.</b> ${typo(r.allergens)}.</p></div>
            </div>
            <p class="quote">${typo(r.noisette)}</p>
            <h3>Les étapes</h3>
            <ol class="steps">${stepItems(r.steps)}</ol>
            ${more}
            ${finish}
            <div class="cards two">
              <div class="card sage"><h3>C’est réussi quand</h3><p>${typo(r.success)}</p></div>
              <div class="card"><h3>On le garde</h3><p>${typo(r.keep)}</p></div>
            </div>
            <div class="card gold"><h3>Noisette dit</h3><p>${typo(r.tip)}</p></div>
            <p class="note">${typo(r.oven)}</p>
          </article>`;
        })
        .join("");
      return `<section class="chapter" id="chapitre-${c.id}"><p class="kicker">Chapitre ${c.num}</p><h2>${typo(c.title)}</h2><p class="lead">${typo(c.lead)}</p></section>${cards}`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(book.title)} — à lire</title>
<link rel="stylesheet" href="src/lire.css">
</head>
<body>
<header class="bar"><span>Mes premières pâtes</span><a href="#sommaire">Sommaire</a></header>
<main class="wrap">
<p class="kicker">Le cahier de Noisette</p>
<h1>${typo(book.title)}</h1>
<p class="lead">${typo(book.subtitle)}. Choisis une recette dans le sommaire. Le texte défile, en gros caractères.</p>
<div class="downloads">
  <a class="dl" href="dist/mes-premieres-pates.epub" download="mes-premieres-pates.epub">Télécharger pour le téléphone</a>
  <p>Ce fichier s’ouvre dans Livres sur iPhone, et dans Play Livres sur Android. Il reste sur le téléphone, même sans réseau.</p>
  <a class="dl secondary" href="dist/mes-premieres-pates-interieur.pdf" download="mes-premieres-pates.pdf">Télécharger le PDF</a>
</div>
<img class="hero-art" src="illustrations/cover.jpg" alt="Noisette et les gâteaux">
<p class="block">Noisette est le personnage en dessin animé. Les gâteaux sont peints. Tu mesures, tu mélanges, tu plies. Quand une étape est sur fond rose, tu appelles l’adulte : four, poêle, couteau, eau bouillante, huile chaude.</p>

<section class="front" id="regles">
<h2>Six règles, à chaque fois</h2>
<ol class="steps">
<li>Un adulte est dans la cuisine, pas dans une autre pièce.</li>
<li>Je me lave les mains et j’attache les cheveux s’ils sont longs.</li>
<li>Je lis la recette jusqu’au bout, puis je sors les ingrédients.</li>
<li>Je pèse. La balance est plus juste qu’un verre. J’appuie sur tare pour repartir de zéro.</li>
<li class="adult"><span class="badge">Avec un adulte. </span>Le four, la poêle et la friture, c’est l’adulte. Je ne m’en approche pas sans lui.</li>
<li>On goûte quand l’adulte dit que ce n’est plus brûlant. Le sucre chaud brûle encore.</li>
</ol>
<p class="quote">La tare, c’est le bouton qui remet la balance à zéro avec le bol dessus.</p>
</section>

<section class="front" id="levures">
<h2>Deux levures, deux métiers</h2>
<div class="cards two">
<div class="card sage"><h3>Levure de boulanger</h3><p>Elle est vivante. Elle fait gonfler la pâte avant le four : brioche, beignets, croissants, danois. 20 g de fraîche = 7 g de sèche. 25 g de fraîche = 8 g de sèche. Un liquide brûlant la tue.</p></div>
<div class="card"><h3>Levure chimique</h3><p>C’est une poudre. Elle fait gonfler dans le four : pancakes, gaufres, cookies, muffins, cake, madeleines, financiers. On la mélange très bien à la farine. On ne l’échange pas avec la levure de boulanger.</p></div>
</div>
</section>

<section class="front" id="mots">
<h2>Les mots de Noisette</h2>
<div class="cards">
<div class="card white"><h3>Sabler</h3><p>Frotter le beurre froid dans la farine jusqu’à obtenir du sable.</p></div>
<div class="card white"><h3>Foncer</h3><p>Étaler la pâte dans le moule, avec un bord qui monte.</p></div>
<div class="card white"><h3>Piquer</h3><p>Faire des trous avec une fourchette pour que le fond ne gonfle pas.</p></div>
<div class="card white"><h3>Dorer</h3><p>Badigeonner d’œuf battu, sans écraser la pâte.</p></div>
<div class="card white"><h3>Tourer</h3><p>Plier la pâte en trois, comme une lettre, pour faire des feuilles.</p></div>
<div class="card white"><h3>Cuisson à blanc</h3><p>Cuire la pâte seule, avec du papier et des légumes secs dessus.</p></div>
</div>
</section>

<nav class="toc" id="sommaire">
<h2>Les 18 recettes</h2>
${toc}
</nav>

${recipesHtml}

<section class="front" id="rates">
<h2>Si ça coince</h2>
<div class="cards">
<div class="card"><h3>Pâte trop sèche</h3><p>Une cuillère à café d’eau froide. On attend, on regarde, on n’en verse pas un verre.</p></div>
<div class="card"><h3>Pâte trop collante</h3><p>20 minutes au frais. Ensuite seulement, un peu de farine sur le plan.</p></div>
<div class="card"><h3>Beurre qui fond dans les tours</h3><p>On s’arrête. 20 minutes au réfrigérateur. On ne roule pas un beurre mou.</p></div>
<div class="card"><h3>Rien ne gonfle</h3><p>Le lait était trop chaud, ou la levure était périmée. On vérifie la date et on recommence.</p></div>
<div class="card"><h3>Choux retombés</h3><p>La porte du four a été ouverte trop tôt. La prochaine fois, on attend 25 minutes.</p></div>
<div class="card"><h3>Beignets gras</h3><p>L’huile n’était pas à 170 °C. On en fait moins à la fois, et on attend entre les fournées.</p></div>
</div>
</section>

<section class="front" id="chaud">
<h2>Ce que l’adulte garde</h2>
<div class="cards two">
<div class="card"><h3>Le four</h3><p>L’adulte l’allume, ouvre la porte avec une manique, et sort la plaque. On ne pose pas la main sur la porte.</p></div>
<div class="card"><h3>La poêle</h3><p>Le manche ne dépasse pas de la cuisinière. On ne jette pas d’eau sur l’huile chaude.</p></div>
<div class="card"><h3>Le couteau</h3><p>L’adulte coupe le beurre froid, épluche les fruits et tranche la pâte. Toi, tu peux décorer.</p></div>
<div class="card"><h3>La friture</h3><p>Un seul adulte, une casserole haute, 170 °C, pas d’eau, un couvercle à portée. L’huile refroidit dans la casserole, sans qu’on la déplace.</p></div>
</div>
<p class="quote">Si tu ne sais pas si c’est chaud, c’est que tu ne touches pas. Tu demandes.</p>
</section>
</main>
</body>
</html>`;
  fs.writeFileSync(path.join(root, "index.html"), html);
}

function main() {
  prepareImages();
  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(dist, { recursive: true });
  const pages = pagesOfBook();
  const body = pages.map((p, i) => render(p, i, pages)).join("\n");
  const htmlPath = path.join(buildDir, "interieur.html");
  fs.writeFileSync(htmlPath, htmlDocument(body));
  const pdfPath = path.join(dist, "mes-premieres-pates-interieur.pdf");
  printPdf(htmlPath, pdfPath);
  const info = execFileSync("pdfinfo", [pdfPath]).toString();
  const count = Number(info.match(/Pages:\s+(\d+)/)[1]);
  const size = info.match(/Page size:\s+([^\n]+)/)[1];
  fs.writeFileSync(path.join(buildDir, "interieur-info.txt"), info);
  if (count !== pages.length) {
    fs.writeFileSync(path.join(buildDir, "WARN-pages.txt"), `html=${pages.length} pdf=${count}\n`);
  }
  buildEpub();
  const cover = buildCover(count);
  buildEbookCover();
  buildReader();
  console.log(JSON.stringify({ htmlPages: pages.length, pdfPages: count, pageSize: size, cover }, null, 2));
}

if (process.argv.includes("--lire")) {
  buildReader();
  console.log("index.html");
} else if (process.argv.includes("--epub")) {
  buildEpub();
  buildReader();
  console.log("epub");
} else {
  main();
}
