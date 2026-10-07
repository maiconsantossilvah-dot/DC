import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE = "https://www.ditlep.com";
const PAGE_SIZE = 100;

const rarityNames = {
  C: "Comum",
  R: "Raro",
  V: "Muito raro",
  E: "Épico",
  L: "Lendário",
  M: "Mítico",
  H: "Heroico",
};

const elements = {
  e: ["Terra", "#b98956", "mountain"],
  f: ["Fogo", "#ff7648", "flame"],
  w: ["Mar", "#50bfff", "waves"],
  p: ["Natureza", "#79d36b", "leaf"],
  el: ["Elétrico", "#ffe15a", "zap"],
  i: ["Gelo", "#72d4ff", "snowflake"],
  m: ["Metal", "#aab5bd", "cog"],
  d: ["Sombrio", "#8c79ad", "moon"],
  l: ["Lenda", "#f4ca48", "sparkles"],
  li: ["Luz", "#fff3a1", "sun"],
  pu: ["Puro", "#f1c8ff", "gem"],
  wr: ["Guerra", "#ff6b64", "swords"],
  pr: ["Primordial", "#ffab62", "paw-print"],
  wd: ["Vento", "#bdeef3", "wind"],
  ti: ["Tempo", "#86e9ff", "timer-reset"],
  ch: ["Caos", "#b97fff", "sparkles"],
  mg: ["Magia", "#cb85ff", "wand-sparkles"],
  hp: ["Felicidade", "#ffdf66", "smile"],
  bt: ["Beleza", "#ff8fc6", "flower-2"],
  dr: ["Sonho", "#ff91d6", "cloud-moon"],
  so: ["Alma", "#f5e8a3", "ghost"],
  th: ["Trovão", "#f9d64e", "cloud-lightning"],
  ph: ["Físico", "#d5ff55", "swords"],
};

const familyNames = {
  "dc-ui-family-insignia_astro.png": "Astro",
  "dc-ui-family-insignia_hypno.png": "Hypno",
  "dc-ui-family-insignia_stained.png": "Stained",
  "dc-ui-family-insignia_void.png": "Void",
  "gr-family-badge-apocalypse.png": "Apocalypse",
  "gr-family-badge-arcana.png": "Arcana",
  "gr-family-badge-armor.png": "Armored",
  "gr-family-badge-ascended.png": "Ascended",
  "gr-family-badge-berserker.png": "Berserker",
  "gr-family-badge-corrupted.png": "Corrupted",
  "gr-family-badge-critical.png": "Critical",
  "gr-family-badge-doom.png": "Doom",
  "gr-family-badge-evader.png": "Evader",
  "gr-family-badge-extractor.png": "Extractor",
  "gr-family-badge-guard.png": "Guard",
  "gr-family-badge-mecha.png": "Mecha",
  "gr-family-badge-quantum.png": "Quantum",
  "gr-family-badge-redemption.png": "Redemption",
  "gr-family-badge-risen.png": "Risen",
  "gr-family-badge-titans.png": "Titan",
  "icon-dual.png": "Dual",
  "icon-eternal.png": "Eternal",
  "icon-plasma.png": "Plasma",
  "icon-silencer.png": "Silencer",
  "icon-spikes.png": "Spiked",
  "icon-strategist.png": "Strategist",
  "icon-twd.png": "The Walking Dead",
  "icon2.png": "Vampire",
  "icon4.png": "Karma",
  "mythical-icon.png": "Mythical",
};

function slug(value = "") {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function absoluteImage(value, suffix = "_3@2x.png") {
  if (!value) return "";
  if (/^https?:/i.test(value)) return value;
  if (value.startsWith("/Image?")) return `${BASE}${value}`;
  return `${BASE}/Image?m=${value}${suffix}`;
}

function localElementIcon(value) {
  if (!value) return "";
  return `assets/elements/${path.basename(value)}`;
}

async function download(url, target, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      await writeFile(target, Buffer.from(await response.arrayBuffer()));
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError;
}

function stripMoveName(move) {
  return (move?.originalName || move?.name || "Golpe").replace(/\s*-\s*Damage:\s*[\d,.]+.*$/i, "");
}

function familyOf(dragon) {
  if (dragon.familyName?.trim()) return dragon.familyName.trim();
  return familyNames[(dragon.familyIcon || "").toLowerCase()] || "Sem família";
}

function effectText(explanation, skin) {
  if (!skin.hasCombatBonus) return "Skin cosmética: não possui modificador de combate configurado.";
  if (!explanation) return `Altera ${skin.categories?.join(" e ") || "atributos ou habilidades"}.`;

  const lines = [];
  if (explanation.officialDescription) lines.push(explanation.officialDescription);
  for (const effect of explanation.effects || []) {
    if (effect.before != null && effect.after != null) {
      const before = Number(effect.before);
      const after = Number(effect.after);
      const percent = before && Number.isFinite(before) && Number.isFinite(after)
        ? ` (${after > before ? "+" : ""}${Math.round((after / before - 1) * 100)}%)`
        : "";
      lines.push(`${effect.title || effect.category}: ${effect.before} → ${effect.after}${percent}.`);
    } else if (effect.officialDescription) {
      lines.push(effect.officialDescription);
    } else if (effect.title) {
      lines.push(`Modifica ${effect.title}.`);
    }
  }
  if ((explanation.skillChanges || []).length) {
    lines.push(`Altera ${explanation.skillChanges.length} ${explanation.skillChanges.length === 1 ? "habilidade" : "habilidades"}.`);
  }
  return [...new Set(lines)].join(" ") || `Altera ${skin.categories?.join(" e ") || "o combate"}.`;
}

async function json(url, options = {}, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError;
}

async function pool(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

async function searchPage(page) {
  return json(`${BASE}/Dragon/Search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dragonName: "", rarities: [], elements: [], orderBy: 0, families: [], page, pageSize: PAGE_SIZE }),
  });
}

async function main() {
  console.log("Buscando catálogo de dragões…");
  const first = await searchPage(0);
  const pageCount = Math.ceil(first.total / PAGE_SIZE);
  const remaining = await pool(Array.from({ length: pageCount - 1 }, (_, index) => index + 1), 6, searchPage);
  const summaries = [first, ...remaining]
    .flatMap(page => page.items || [])
    .filter(item => item?.name && !/placeholder|test dragon|dummy/i.test(item.name));
  console.log(`${summaries.length} dragões encontrados.`);

  const batches = Array.from({ length: Math.ceil(summaries.length / 100) }, (_, index) => summaries.slice(index * 100, index * 100 + 100).map(item => item.id));
  console.log("Buscando golpes, elementos e famílias…");
  const detailGroups = await pool(batches, 5, ids => json(`${BASE}/Dragon/GetDragonByIds`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dragonIds: ids }),
  }));
  const details = detailGroups.flat();
  const detailsById = new Map(details.map(item => [item.id, item]));

  const elementIconByCode = new Map();
  for (const detail of details) {
    (detail.elements || []).forEach((code, index) => {
      const icon = detail.dragonAttribute?.[index];
      if (icon && !elementIconByCode.has(code)) elementIconByCode.set(code, localElementIcon(icon));
    });
  }
  const elementIconUrls = [...new Set(details.flatMap(detail => detail.dragonAttribute || []).filter(Boolean))];
  const elementAssets = path.join(ROOT, "assets", "elements");
  await mkdir(elementAssets, { recursive: true });
  console.log(`Baixando ${elementIconUrls.length} ícones oficiais de elementos…`);
  await pool(elementIconUrls, 6, icon => download(`${BASE}${icon}`, path.join(elementAssets, path.basename(icon))));

  console.log("Buscando skins e bônus…");
  const skinCatalog = await json(`${BASE}/DragonSkin/Catalog`);
  const combatSkins = skinCatalog.filter(skin => skin.hasCombatBonus);
  const explanations = await pool(combatSkins, 10, async skin => {
    try {
      const value = await json(`${BASE}/DragonSkin/Explanation?id=${skin.id}`, {}, 2);
      return [skin.id, value];
    } catch {
      return [skin.id, null];
    }
  });
  const explanationById = new Map(explanations);
  const skinsByDragon = new Map();
  for (const skin of skinCatalog) {
    const list = skinsByDragon.get(skin.dragonId) || [];
    list.push(skin);
    skinsByDragon.set(skin.dragonId, list);
  }

  const catalog = summaries.map(summary => {
    const detail = detailsById.get(summary.id) || summary;
    const family = familyOf(detail);
    const elementPairs = (detail.elements || []).map(code => {
      const [name, color, lucideIcon] = elements[code] || [code.toUpperCase(), "#d5ff55", "sparkles"];
      return [name, color, lucideIcon, elementIconByCode.get(code) || ""];
    });
    const special = (detail.skills || []).filter(skill => skill.name || skill.description).slice(0, 2);
    const description = special.length
      ? special.map(skill => `${skill.name || "Habilidade"}: ${skill.description || "habilidade especial"}`).join(" ")
      : `${rarityNames[detail.rarity] || detail.rarity || "Dragão"} de categoria ${detail.category || "—"}, com ${elementPairs.length || 1} ${elementPairs.length === 1 ? "elemento" : "elementos"}.`;
    const defaultSkin = {
      name: "Visual padrão",
      type: "Original",
      image: absoluteImage(detail.image || summary.image),
      buff: "Sem bônus de combate associado ao visual padrão.",
    };
    const knownSkins = (skinsByDragon.get(detail.id) || []).map(skin => ({
      name: skin.name.replace(new RegExp(`^${detail.name}\\s*`, "i"), "") || `Skin #${skin.id}`,
      type: skin.hasCombatBonus ? "Skin de combate" : "Cosmética",
      image: absoluteImage(skin.image, ""),
      buff: effectText(explanationById.get(skin.id), skin),
      source: `${BASE}/Dragon-Skins/${skin.id}/${slug(skin.name)}?lang=en-US`,
    }));
    const listedPaths = new Set(knownSkins.map(skin => skin.image));
    const extraSkins = (detail.skins || [])
      .filter(value => value && value !== detail.image)
      .map((value, index) => ({ name: `Skin ${index + 1}`, type: "Visual disponível", image: absoluteImage(value, "_3@2x.png"), buff: "Nenhum bônus confirmado na configuração consultada." }))
      .filter(skin => !listedPaths.has(skin.image));

    const move = item => [
      stripMoveName(item),
      (elements[item.element] || [item.element?.toUpperCase() || "Especial"])[0],
      Number(item.damage) || 0,
      (elements[item.element] || [null, null, "sparkles"])[2],
      elementIconByCode.get(item.element) || "",
    ];

    return {
      id: detail.id,
      name: (detail.name || summary.name || "Dragão").replace(/ Dragon$/i, ""),
      fullName: detail.name || summary.name || "Dragão",
      family,
      rarity: rarityNames[detail.rarity] || detail.rarity || "Desconhecida",
      rarityCode: detail.rarity || "?",
      category: detail.category || null,
      image: absoluteImage(detail.image || summary.image),
      source: `${BASE}/dragons/${detail.id}/${slug(detail.name || summary.name)}?lang=en-US`,
      description,
      elements: elementPairs.map(([name, color, , icon]) => [name, color, icon]),
      skins: [defaultSkin, ...knownSkins, ...extraSkins].slice(0, 12),
      base: (detail.attackSkills || []).map(move),
      trained: (detail.trainableAttackSkills || []).map(move),
      accent: elementPairs[0]?.[1] || "#d5ff55",
    };
  });

  await mkdir(ROOT, { recursive: true });
  const banner = `// Gerado automaticamente a partir do Ditlep em ${new Date().toISOString()}.\n`;
  await writeFile(path.join(ROOT, "dragons-data.js"), `${banner}window.DRAGONS_DATA = ${JSON.stringify(catalog)};\n`, "utf8");
  await writeFile(path.join(ROOT, "catalog-meta.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), dragons: catalog.length, skins: skinCatalog.length, source: BASE }, null, 2)}\n`, "utf8");
  console.log(`Concluído: ${catalog.length} dragões e ${skinCatalog.length} skins.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
