import JSZip from 'jszip';
import {
  IngredientReq,
  ItemDef,
  ModPackMeta,
  RecipeCategory,
  RecipeDef,
  RecipeSlot,
  VanillaDatasetPayload,
} from '../types/emi';

export interface ImportedPackData {
  meta: ModPackMeta;
  items: ItemDef[];
  recipes: RecipeDef[];
  tags: Record<string, string[]>;
}

export interface MergedRegistry {
  version: string;
  items: ItemDef[];
  itemMap: Record<string, ItemDef>;
  recipes: RecipeDef[];
  recipeMap: Record<string, RecipeDef>;
  tags: Record<string, string[]>;
  packs: ModPackMeta[];
}

const DB_NAME = 'emi_web_packs_db';
const STORE_NAME = 'packs';

function openPacksDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'meta.id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadImportedPacks(): Promise<ImportedPackData[]> {
  try {
    const db = await openPacksDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as ImportedPackData[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveImportedPack(pack: ImportedPackData): Promise<void> {
  const db = await openPacksDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(pack);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteImportedPack(packId: string): Promise<void> {
  const db = await openPacksDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(packId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function toggleImportedPackEnabled(
  packId: string,
  enabled: boolean
): Promise<void> {
  const packs = await loadImportedPacks();
  const target = packs.find((p) => p.meta.id === packId);
  if (!target) return;
  target.meta.enabled = enabled;
  await saveImportedPack(target);
}

function titleCase(raw: string): string {
  const clean = raw.includes(':') ? raw.split(':')[1] : raw;
  return clean
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

function normalizeId(id: string, fallbackNs = 'minecraft'): string {
  if (!id) return id;
  if (id.startsWith('#')) {
    return id.includes(':') ? id : `#${fallbackNs}:${id.slice(1)}`;
  }
  return id.includes(':') ? id : `${fallbackNs}:${id}`;
}

function normalizeIng(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === 'string') return [normalizeId(val)];
  if (Array.isArray(val)) {
    const res: string[] = [];
    for (const v of val) res.push(...normalizeIng(v));
    return res;
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj.item === 'string') return [normalizeId(obj.item)];
    if (typeof obj.tag === 'string') return [`#${normalizeId(obj.tag)}`];
  }
  return [];
}

function addIng(map: Map<string, IngredientReq>, choices: string[], count = 1) {
  if (choices.length === 0) return;
  const id = choices.length === 1 ? choices[0] : choices.join('|');
  const existing = map.get(id);
  if (existing) existing.count += count;
  else map.set(id, { id, choices, count });
}

function parseGenericRecipeJson(
  recipeId: string,
  packId: string,
  raw: Record<string, unknown>
): RecipeDef | null {
  // Support Slimefun JSON shortcut format ({ outputId, outputCount, recipeType, grid, workstationId })
  if (typeof raw.outputId === 'string' && Array.isArray(raw.grid)) {
    const grid: RecipeSlot[] = Array(9)
      .fill(null)
      .map((_, i) => (raw.grid as RecipeSlot[])[i] ?? null);
    const ingMap = new Map<string, IngredientReq>();
    for (const slot of grid) {
      if (!slot) continue;
      const choices = Array.isArray(slot) ? slot : [slot];
      addIng(ingMap, choices, 1);
    }
    if (ingMap.size === 0) return null;
    const label = typeof raw.recipeType === 'string' ? raw.recipeType : 'Slimefun Crafting';
    return {
      id: recipeId,
      packId,
      type: 'slimefun',
      customTypeLabel: label,
      workstationId:
        typeof raw.workstationId === 'string'
          ? raw.workstationId
          : 'slimefun:enhanced_crafting_table',
      outputId: raw.outputId,
      outputCount: Number(raw.outputCount ?? 1) || 1,
      grid,
      ingredients: Array.from(ingMap.values()),
    };
  }

  const rawType = String(raw.type || '');
  const resultObj = (raw.result ?? raw.output) as { id?: string; item?: string; count?: number } | undefined;
  const outRaw = resultObj?.id || resultObj?.item;
  if (!outRaw) return null;
  const outputId = normalizeId(outRaw);
  const outputCount = Number(resultObj?.count ?? 1) || 1;

  if (rawType.endsWith('crafting_shaped')) {
    const pattern = Array.isArray(raw.pattern) ? (raw.pattern as string[]) : [];
    const keyMap = (raw.key ?? {}) as Record<string, unknown>;
    const grid: RecipeSlot[] = Array(9).fill(null);
    const ingMap = new Map<string, IngredientReq>();

    for (let r = 0; r < Math.min(3, pattern.length); r++) {
      const row = pattern[r] ?? '';
      for (let c = 0; c < Math.min(3, row.length); c++) {
        const ch = row[c];
        if (ch === ' ') continue;
        const choices = normalizeIng(keyMap[ch]);
        if (choices.length > 0) {
          grid[r * 3 + c] = choices.length === 1 ? choices[0] : choices;
          addIng(ingMap, choices, 1);
        }
      }
    }
    if (ingMap.size === 0) return null;
    return {
      id: recipeId,
      packId,
      type: 'crafting_shaped',
      workstationId: 'minecraft:crafting_table',
      outputId,
      outputCount,
      grid,
      ingredients: Array.from(ingMap.values()),
    };
  }

  if (rawType.endsWith('crafting_shapeless')) {
    const rawIngs = Array.isArray(raw.ingredients) ? raw.ingredients : [];
    const ingMap = new Map<string, IngredientReq>();
    for (const e of rawIngs) addIng(ingMap, normalizeIng(e), 1);
    if (ingMap.size === 0) return null;
    return {
      id: recipeId,
      packId,
      type: 'crafting_shapeless',
      workstationId: 'minecraft:crafting_table',
      outputId,
      outputCount,
      ingredients: Array.from(ingMap.values()),
    };
  }

  const ingMap = new Map<string, IngredientReq>();
  if (raw.ingredient) addIng(ingMap, normalizeIng(raw.ingredient), 1);
  if (Array.isArray(raw.ingredients)) {
    for (const e of raw.ingredients) addIng(ingMap, normalizeIng(e), 1);
  }
  if (raw.base) addIng(ingMap, normalizeIng(raw.base), 1);
  if (raw.addition) addIng(ingMap, normalizeIng(raw.addition), 1);
  if (raw.template) addIng(ingMap, normalizeIng(raw.template), 1);

  if (ingMap.size === 0) return null;

  let type: RecipeCategory = 'special';
  let workstationId = 'minecraft:crafting_table';
  if (rawType.endsWith('smelting')) {
    type = 'smelting';
    workstationId = 'minecraft:furnace';
  } else if (rawType.endsWith('blasting')) {
    type = 'blasting';
    workstationId = 'minecraft:blast_furnace';
  } else if (rawType.endsWith('smoking')) {
    type = 'smoking';
    workstationId = 'minecraft:smoker';
  } else if (rawType.endsWith('stonecutting')) {
    type = 'stonecutting';
    workstationId = 'minecraft:stonecutter';
  } else if (rawType.endsWith('smithing_transform')) {
    type = 'smithing_transform';
    workstationId = 'minecraft:smithing_table';
  }

  return {
    id: recipeId,
    packId,
    type,
    workstationId,
    outputId,
    outputCount,
    ingredients: Array.from(ingMap.values()),
    cookTimeSec: typeof raw.cookingtime === 'number' ? raw.cookingtime / 20 : undefined,
    xp: typeof raw.experience === 'number' ? raw.experience : undefined,
    note: rawType && type === 'special' ? titleCase(rawType) : undefined,
  };
}

export async function parseModPackFile(
  file: File,
  existingItemIds: Set<string>
): Promise<ImportedPackData> {
  const lower = file.name.toLowerCase();
  const packId = `mod-${file.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now().toString(36)}`;

  if (lower.endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const items: ItemDef[] = [];
    const recipes: RecipeDef[] = [];
    const tags: Record<string, string[]> = {};

    if (Array.isArray(parsed)) {
      parsed.forEach((entry, idx) => {
        if (entry && typeof entry === 'object') {
          const r = parseGenericRecipeJson(`${packId}:r_${idx}`, packId, entry);
          if (r) recipes.push(r);
        }
      });
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.recipes)) {
        parsed.recipes.forEach((r: Record<string, unknown>, idx: number) => {
          const parsedR = parseGenericRecipeJson(`${packId}:r_${idx}`, packId, r);
          if (parsedR) recipes.push(parsedR);
        });
      } else {
        const single = parseGenericRecipeJson(`${packId}:recipe`, packId, parsed);
        if (single) recipes.push(single);
      }
      if (Array.isArray(parsed.items)) {
        for (const it of parsed.items) {
          if (it?.id) {
            let iconUrl = it.iconUrl as string | undefined;
            if (!iconUrl && typeof it.headHash === 'string') {
              iconUrl = `/api/icon/head/${it.headHash}`;
            } else if (!iconUrl && typeof it.material === 'string') {
              iconUrl = `/api/icon/minecraft/${it.material.toLowerCase()}`;
            }
            items.push({
              mod: String(it.id).split(':')[0] || 'slimefun',
              category: 'materials',
              tags: [],
              stackSize: 64,
              rarity: 'common',
              isBlock: false,
              ...it,
              iconUrl,
              packId,
            });
          }
        }
      }
    }

    // Ensure outputs & ingredients without vanilla defs get basic ItemDef stubs
    const seen = new Set(items.map((i) => i.id));
    for (const r of recipes) {
      const ids = [r.outputId, ...(r.ingredients?.flatMap((i) => i.choices) ?? [])];
      for (const id of ids) {
        if (id.startsWith('#') || existingItemIds.has(id) || seen.has(id)) continue;
        seen.add(id);
        items.push({
          id,
          name: titleCase(id),
          mod: id.split(':')[0] || 'custom',
          packId,
          category: 'materials',
          tags: [],
          stackSize: 64,
          rarity: 'common',
          isBlock: false,
        });
      }
    }

    return {
      meta: {
        id: packId,
        name: file.name.replace(/\.json$/i, ''),
        version: 'Custom JSON',
        itemCount: items.length,
        recipeCount: recipes.length,
        enabled: true,
      },
      items,
      recipes,
      tags,
    };
  }

  // Handle .jar or .zip Minecraft mod / datapack / Slimefun plugin archive
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);
  const filePaths = Object.keys(zip.files);

  const hasModRecipes = filePaths.some((p) => /^data\/[^/]+\/recipes?\/.+\.json$/.test(p));
  const hasPluginMeta = Boolean(zip.file('plugin.yml') || zip.file('paper-plugin.yml'));
  const hasClassFiles = filePaths.some((p) => p.endsWith('.class'));

  // Route Bukkit/Spigot/Slimefun plugin JARs to the server-side JVM bytecode extractor
  if (!hasModRecipes && (hasPluginMeta || hasClassFiles)) {
    const res = await fetch('/api/import-slimefun-jar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name),
      },
      body: buf,
    });
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload?.error || 'Failed to parse Slimefun plugin JAR');
    }
    return {
      meta: {
        id: payload.id,
        name: payload.name || file.name.replace(/\.(jar|zip)$/i, ''),
        version: payload.version || 'JAR Plugin',
        itemCount: payload.items?.length ?? 0,
        recipeCount: payload.recipes?.length ?? 0,
        enabled: true,
      },
      items: payload.items ?? [],
      recipes: payload.recipes ?? [],
      tags: payload.tags ?? {},
    };
  }

  const langMap: Record<string, string> = {};
  const iconDataUrls = new Map<string, string>();
  const recipes: RecipeDef[] = [];
  const tags: Record<string, string[]> = {};
  let modName = file.name.replace(/\.(jar|zip)$/i, '');
  let modVersion = 'Imported Pack';

  // Read fabric.mod.json if available
  const fabricMetaFile = zip.file('fabric.mod.json');
  if (fabricMetaFile) {
    try {
      const fm = JSON.parse(await fabricMetaFile.async('string'));
      if (fm.name) modName = String(fm.name);
      if (fm.version) modVersion = String(fm.version);
    } catch {
      // Ignore invalid metadata
    }
  }

  // Extract lang translations & textures
  for (const p of filePaths) {
    if (zip.files[p].dir) continue;
    if (/^assets\/[^/]+\/lang\/en_us\.json$/.test(p)) {
      try {
        const langJson = JSON.parse(await zip.files[p].async('string'));
        Object.assign(langMap, langJson);
      } catch {
        // Ignore malformed lang
      }
    } else if (/^assets\/([^/]+)\/textures\/(item|block)\/([^/]+)\.png$/.test(p)) {
      const match = p.match(/^assets\/([^/]+)\/textures\/(item|block)\/([^/]+)\.png$/);
      if (match) {
        const [, ns, kind, texName] = match;
        const key = `${ns}:${texName}`;
        if (!iconDataUrls.has(key) || kind === 'item') {
          const b64 = await zip.files[p].async('base64');
          iconDataUrls.set(key, `data:image/png;base64,${b64}`);
        }
      }
    }
  }

  // Extract recipes
  for (const p of filePaths) {
    if (zip.files[p].dir) continue;
    const recipeMatch = p.match(/^data\/([^/]+)\/recipes?\/(.+)\.json$/);
    if (recipeMatch) {
      const [, ns, rel] = recipeMatch;
      try {
        const raw = JSON.parse(await zip.files[p].async('string'));
        const parsed = parseGenericRecipeJson(`${ns}:${rel}`, packId, raw);
        if (parsed) recipes.push(parsed);
      } catch {
        // Ignore non-standard recipe JSON
      }
    }
    const tagMatch = p.match(/^data\/([^/]+)\/tags\/items?\/(.+)\.json$/);
    if (tagMatch) {
      const [, ns, rel] = tagMatch;
      try {
        const raw = JSON.parse(await zip.files[p].async('string'));
        if (Array.isArray(raw.values)) {
          tags[`#${ns}:${rel}`] = raw.values
            .filter((v: unknown) => typeof v === 'string' && !v.startsWith('#'))
            .map((v: string) => normalizeId(v, ns));
        }
      } catch {
        // Ignore
      }
    }
  }

  const items: ItemDef[] = [];
  const seen = new Set<string>();

  for (const r of recipes) {
    const candidateIds = [
      r.outputId,
      ...(r.ingredients?.flatMap((i) => i.choices) ?? []),
    ];
    for (const id of candidateIds) {
      if (!id || id.startsWith('#') || existingItemIds.has(id) || seen.has(id)) {
        continue;
      }
      seen.add(id);
      const [ns, rawName] = id.split(':');
      const translatedName =
        langMap[`item.${ns}.${rawName}`] ||
        langMap[`block.${ns}.${rawName}`] ||
        titleCase(id);
      items.push({
        id,
        name: translatedName,
        mod: ns || 'mod',
        packId,
        category: 'materials',
        tags: [],
        stackSize: 64,
        rarity: 'common',
        isBlock: false,
        iconUrl: iconDataUrls.get(id),
      });
    }
  }

  return {
    meta: {
      id: packId,
      name: modName,
      version: modVersion,
      itemCount: items.length,
      recipeCount: recipes.length,
      enabled: true,
    },
    items,
    recipes,
    tags,
  };
}

export async function importSlimefunGithubPack(
  repoUrl: string
): Promise<ImportedPackData> {
  const res = await fetch('/api/import-slimefun-github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl }),
  });
  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error || 'Failed to import Slimefun GitHub addon');
  }
  return {
    meta: {
      id: payload.id,
      name: payload.name,
      version: payload.version || 'GitHub',
      itemCount: payload.items?.length ?? 0,
      recipeCount: payload.recipes?.length ?? 0,
      enabled: true,
    },
    items: payload.items ?? [],
    recipes: payload.recipes ?? [],
    tags: payload.tags ?? {},
  };
}

export interface BuiltinSlimefunCoreData {
  id: string;
  name: string;
  version: string;
  items: ItemDef[];
  recipes: RecipeDef[];
  tags: Record<string, string[]>;
}

export function buildMergedRegistry(
  vanilla: VanillaDatasetPayload,
  imported: ImportedPackData[],
  slimefunCore?: { data: BuiltinSlimefunCoreData; enabled: boolean } | null
): MergedRegistry {
  const items: ItemDef[] = [...vanilla.items];
  const itemMap: Record<string, ItemDef> = {};
  for (const it of items) itemMap[it.id] = it;

  const recipes: RecipeDef[] = [...vanilla.recipes];
  const tags: Record<string, string[]> = { ...vanilla.tags };
  const packs: ModPackMeta[] = [
    {
      id: `vanilla-${vanilla.version}`,
      name: `Minecraft Java ${vanilla.version}`,
      version: vanilla.version,
      itemCount: vanilla.items.length,
      recipeCount: vanilla.recipes.length,
      isBuiltin: true,
      enabled: true,
    },
  ];

  if (slimefunCore) {
    packs.push({
      id: slimefunCore.data.id,
      name: slimefunCore.data.name,
      version: slimefunCore.data.version,
      itemCount: slimefunCore.data.items.length,
      recipeCount: slimefunCore.data.recipes.length,
      isBuiltin: true,
      enabled: slimefunCore.enabled,
    });
    if (slimefunCore.enabled) {
      for (const it of slimefunCore.data.items) {
        if (!itemMap[it.id]) {
          itemMap[it.id] = it;
          items.push(it);
        }
      }
      for (const r of slimefunCore.data.recipes) {
        recipes.push(r);
      }
      for (const [tKey, vals] of Object.entries(slimefunCore.data.tags ?? {})) {
        tags[tKey] = Array.from(new Set([...(tags[tKey] ?? []), ...vals]));
      }
    }
  }

  for (const pack of imported) {
    packs.push(pack.meta);
    if (!pack.meta.enabled) continue;
    for (const it of pack.items) {
      if (!itemMap[it.id]) {
        itemMap[it.id] = it;
        items.push(it);
      }
    }
    for (const r of pack.recipes) {
      recipes.push(r);
    }
    for (const [tKey, vals] of Object.entries(pack.tags)) {
      tags[tKey] = Array.from(new Set([...(tags[tKey] ?? []), ...vals]));
    }
  }

  items.sort((a, b) => a.name.localeCompare(b.name));
  const recipeMap: Record<string, RecipeDef> = {};
  for (const r of recipes) recipeMap[r.id] = r;

  return {
    version: vanilla.version,
    items,
    itemMap,
    recipes,
    recipeMap,
    tags,
    packs,
  };
}
