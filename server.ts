import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import type {
  IngredientReq,
  ItemCategory,
  ItemDef,
  ItemRarity,
  RecipeCategory,
  RecipeDef,
  RecipeSlot,
  VanillaDatasetPayload,
} from './src/types/emi.ts';
import {
  buildSlimefunCorePack,
  importSlimefunFromGithubRepo,
  parseSlimefunPluginJar,
  type SlimefunPackPayload,
} from './server/slimefun.ts';

const PORT = Number(process.env.PORT) || 3000;
const MC_VERSION = '26.3';
const CACHE_DIR = path.resolve(process.cwd(), '.cache');
const DATASET_CACHE_FILE = path.join(CACHE_DIR, `mc-${MC_VERSION}-dataset.json`);
const SLIMEFUN_CACHE_FILE = path.join(CACHE_DIR, 'slimefun4-core-v2.json');
const ICON_CACHE_DIR = path.join(CACHE_DIR, `mc-${MC_VERSION}-icons`);

let cachedDataset: VanillaDatasetPayload | null = null;
let datasetPromise: Promise<VanillaDatasetPayload> | null = null;
let cachedSlimefunCore: SlimefunPackPayload | null = null;
let slimefunCorePromise: Promise<SlimefunPackPayload> | null = null;
let blockNameSet: Set<string> = new Set();
const negativeIconCache = new Map<string, number>();

async function getSlimefunCore(forceRefresh = false): Promise<SlimefunPackPayload> {
  if (cachedSlimefunCore && !forceRefresh) return cachedSlimefunCore;
  if (slimefunCorePromise && !forceRefresh) return slimefunCorePromise;

  slimefunCorePromise = (async () => {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    if (!forceRefresh) {
      try {
        const raw = await fs.readFile(SLIMEFUN_CACHE_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as SlimefunPackPayload;
        if (parsed.items?.length > 400 && parsed.recipes?.length > 300) {
          cachedSlimefunCore = parsed;
          return parsed;
        }
      } catch {
        // Cache miss
      }
    }

    const fresh = await buildSlimefunCorePack();
    cachedSlimefunCore = fresh;
    await fs.writeFile(SLIMEFUN_CACHE_FILE, JSON.stringify(fresh), 'utf-8');
    return fresh;
  })();

  try {
    return await slimefunCorePromise;
  } finally {
    slimefunCorePromise = null;
  }
}

const POTION_COLORS: Record<string, number> = {
  water: 0x385dc6,
  awkward: 0x385dc6,
  mundane: 0x385dc6,
  thick: 0x385dc6,
  fire_resistance: 0xff9900,
  long_fire_resistance: 0xff9900,
  harming: 0xa9656a,
  strong_harming: 0xa9656a,
  healing: 0xf82423,
  strong_healing: 0xf82423,
  infested: 0x8c9b8c,
  invisibility: 0xf6f6f6,
  long_invisibility: 0xf6f6f6,
  leaping: 0xfdff84,
  long_leaping: 0xfdff84,
  strong_leaping: 0xfdff84,
  luck: 0x59c106,
  night_vision: 0xc2ff66,
  long_night_vision: 0xc2ff66,
  oozing: 0x99ffa3,
  poison: 0x87a363,
  long_poison: 0x87a363,
  strong_poison: 0x87a363,
  regeneration: 0xcd5cab,
  long_regeneration: 0xcd5cab,
  strong_regeneration: 0xcd5cab,
  slow_falling: 0xf3cfb9,
  long_slow_falling: 0xf3cfb9,
  slowness: 0x8bafe0,
  long_slowness: 0x8bafe0,
  strong_slowness: 0x8bafe0,
  strength: 0xffc700,
  long_strength: 0xffc700,
  strong_strength: 0xffc700,
  swiftness: 0x33ebff,
  long_swiftness: 0x33ebff,
  strong_swiftness: 0x33ebff,
  turtle_master: 0x8b67b0,
  long_turtle_master: 0x8b67b0,
  strong_turtle_master: 0x8b67b0,
  water_breathing: 0x98dac0,
  long_water_breathing: 0x98dac0,
  weakness: 0x484d48,
  long_weakness: 0x484d48,
  weaving: 0x78695a,
  wind_charged: 0xbdc9ff,
};

const FLAT_BLOCK_HINTS = new Set([
  'torch',
  'soul_torch',
  'redstone_torch',
  'copper_torch',
  'lantern',
  'soul_lantern',
  'copper_lantern',
  'ladder',
  'lever',
  'tripwire_hook',
  'rail',
  'powered_rail',
  'detector_rail',
  'activator_rail',
  'iron_bars',
  'cobweb',
  'dandelion',
  'poppy',
  'blue_orchid',
  'allium',
  'azure_bluet',
  'red_tulip',
  'orange_tulip',
  'white_tulip',
  'pink_tulip',
  'oxeye_daisy',
  'cornflower',
  'lily_of_the_valley',
  'wither_rose',
  'sugar_cane',
  'vine',
  'lily_pad',
  'seagrass',
  'kelp',
  'crimson_fungus',
  'warped_fungus',
  'crimson_roots',
  'warped_roots',
  'nether_sprouts',
]);

function normalizeId(id: string): string {
  if (!id) return id;
  if (id.startsWith('#')) {
    return id.includes(':') ? id : `#minecraft:${id.slice(1)}`;
  }
  return id.includes(':') ? id : `minecraft:${id}`;
}

function titleCaseId(raw: string): string {
  const clean = raw.replace(/^minecraft:/, '');
  return clean
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}

function resolveLangName(
  rawName: string,
  comp: Record<string, unknown>,
  lang: Record<string, string>,
  isBlock: boolean
): string {
  const itemNameComp = comp['minecraft:item_name'];
  if (itemNameComp && typeof itemNameComp === 'object' && 'translate' in itemNameComp) {
    const key = String((itemNameComp as { translate: string }).translate);
    if (lang[key]) return lang[key];
  } else if (typeof itemNameComp === 'string') {
    return itemNameComp;
  }

  const primaryKey = isBlock ? `block.minecraft.${rawName}` : `item.minecraft.${rawName}`;
  const altKey = isBlock ? `item.minecraft.${rawName}` : `block.minecraft.${rawName}`;
  return lang[primaryKey] || lang[altKey] || titleCaseId(rawName);
}

function classifyItem(
  rawName: string,
  comp: Record<string, unknown>,
  tags: string[],
  isBlock: boolean
): ItemCategory {
  const tagJoin = tags.join(' ');
  if (
    rawName.includes('redstone') ||
    rawName.includes('piston') ||
    rawName.includes('observer') ||
    rawName.includes('repeater') ||
    rawName.includes('comparator') ||
    rawName.includes('hopper') ||
    rawName.includes('dropper') ||
    rawName.includes('dispenser') ||
    rawName === 'crafter' ||
    rawName === 'lever' ||
    rawName.includes('rail') ||
    rawName.includes('_button') ||
    rawName.includes('_pressure_plate') ||
    rawName === 'daylight_detector' ||
    rawName === 'target' ||
    rawName === 'sculk_sensor' ||
    rawName === 'calibrated_sculk_sensor' ||
    rawName === 'tnt'
  ) {
    return 'redstone';
  }
  if (
    rawName.includes('potion') ||
    rawName.includes('brewing') ||
    rawName === 'blaze_powder' ||
    rawName === 'nether_wart' ||
    rawName === 'fermented_spider_eye' ||
    rawName === 'glistering_melon_slice' ||
    rawName === 'dragon_breath' ||
    rawName === 'glass_bottle' ||
    rawName === 'experience_bottle'
  ) {
    return 'alchemy';
  }
  if (comp['minecraft:food'] || tagJoin.includes('#minecraft:meat')) {
    return 'food';
  }
  if (
    rawName.endsWith('_sword') ||
    rawName.endsWith('_helmet') ||
    rawName.endsWith('_chestplate') ||
    rawName.endsWith('_leggings') ||
    rawName.endsWith('_boots') ||
    rawName === 'bow' ||
    rawName === 'crossbow' ||
    rawName === 'trident' ||
    rawName === 'shield' ||
    rawName === 'mace' ||
    rawName.includes('arrow')
  ) {
    return 'combat';
  }
  if (
    comp['minecraft:tool'] ||
    rawName.endsWith('_pickaxe') ||
    rawName.endsWith('_axe') ||
    rawName.endsWith('_shovel') ||
    rawName.endsWith('_hoe') ||
    rawName === 'shears' ||
    rawName === 'flint_and_steel' ||
    rawName === 'fishing_rod' ||
    rawName === 'compass' ||
    rawName === 'clock' ||
    rawName === 'spyglass' ||
    rawName === 'brush' ||
    rawName.includes('bucket')
  ) {
    return 'tools';
  }
  if (isBlock) {
    return 'blocks';
  }
  return 'materials';
}

function flattenTag(
  tagKey: string,
  rawTags: Record<string, { values: unknown[] }>,
  visited: Set<string>
): string[] {
  if (visited.has(tagKey)) return [];
  visited.add(tagKey);
  const entry = rawTags[tagKey];
  if (!entry || !Array.isArray(entry.values)) return [];

  const out = new Set<string>();
  for (const val of entry.values) {
    const rawVal =
      typeof val === 'string'
        ? val
        : val && typeof val === 'object' && 'id' in val
        ? String((val as { id: string }).id)
        : '';
    if (!rawVal) continue;
    if (rawVal.startsWith('#')) {
      const nestedKey = rawVal.slice(1).replace(/^minecraft:/, '');
      for (const item of flattenTag(nestedKey, rawTags, visited)) {
        out.add(item);
      }
    } else {
      out.add(normalizeId(rawVal));
    }
  }
  return Array.from(out);
}

function normalizeIngredientValue(val: unknown): string[] {
  if (!val) return [];
  if (typeof val === 'string') return [normalizeId(val)];
  if (Array.isArray(val)) {
    const out: string[] = [];
    for (const v of val) {
      out.push(...normalizeIngredientValue(v));
    }
    return out;
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj.item === 'string') return [normalizeId(obj.item)];
    if (typeof obj.tag === 'string') return [`#${normalizeId(obj.tag)}`];
  }
  return [];
}

function toSlotValue(choices: string[]): RecipeSlot {
  if (choices.length === 0) return null;
  if (choices.length === 1) return choices[0];
  return choices;
}

function addIngredientToMap(map: Map<string, IngredientReq>, choices: string[], count = 1) {
  if (choices.length === 0) return;
  const key = choices.length === 1 ? choices[0] : choices.join('|');
  const existing = map.get(key);
  if (existing) {
    existing.count += count;
  } else {
    map.set(key, { id: key, choices, count });
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return (await res.json()) as T;
}

function resolvePotionDisplayName(
  container: 'potion' | 'splash_potion' | 'lingering_potion' | 'tipped_arrow',
  potionKey: string,
  lang: Record<string, string>
): string {
  const isLong = potionKey.startsWith('long_');
  const isStrong = potionKey.startsWith('strong_');
  const base = potionKey.replace(/^long_/, '').replace(/^strong_/, '');
  const suffix = isLong ? ' (Extended)' : isStrong ? ' II' : '';
  const langKey = `item.minecraft.${container}.effect.${base}`;
  if (lang[langKey]) {
    return `${lang[langKey]}${suffix}`;
  }
  const containerLabel =
    container === 'splash_potion'
      ? 'Splash Potion of '
      : container === 'lingering_potion'
      ? 'Lingering Potion of '
      : container === 'tipped_arrow'
      ? 'Arrow of '
      : 'Potion of ';
  return `${containerLabel}${titleCaseId(base)}${suffix}`;
}

async function buildVanillaDataset(): Promise<VanillaDatasetPayload> {
  const baseSummary = `https://raw.githubusercontent.com/misode/mcmeta/${MC_VERSION}-summary`;
  const baseReg = `https://raw.githubusercontent.com/misode/mcmeta/${MC_VERSION}-registries`;
  const baseAssets = `https://raw.githubusercontent.com/misode/mcmeta/${MC_VERSION}-assets`;

  const [rawComponents, rawBlocks, rawPotions, rawTags, rawRecipes, lang] = await Promise.all([
    fetchJson<Record<string, Record<string, unknown>>>(`${baseSummary}/item_components/data.min.json`),
    fetchJson<string[]>(`${baseReg}/block/data.min.json`),
    fetchJson<string[]>(`${baseReg}/potion/data.min.json`),
    fetchJson<Record<string, { values: unknown[] }>>(`${baseSummary}/data/tag/item/data.min.json`),
    fetchJson<Record<string, Record<string, unknown>>>(`${baseSummary}/data/recipe/data.min.json`),
    fetchJson<Record<string, string>>(`${baseAssets}/assets/minecraft/lang/en_us.json`),
  ]);

  const blockSet = new Set(rawBlocks);
  blockNameSet = blockSet;

  // Resolve and flatten all item tags
  const tags: Record<string, string[]> = {};
  const tagsPerItem = new Map<string, string[]>();

  for (const tagKey of Object.keys(rawTags)) {
    const fullTag = `#minecraft:${tagKey}`;
    const members = flattenTag(tagKey, rawTags, new Set());
    tags[fullTag] = members;
    for (const itemId of members) {
      const list = tagsPerItem.get(itemId);
      if (list) list.push(fullTag);
      else tagsPerItem.set(itemId, [fullTag]);
    }
  }

  // Normalize all items
  const items: ItemDef[] = [];
  const itemSet = new Set<string>();

  for (const [rawName, comp] of Object.entries(rawComponents)) {
    if (rawName === 'air') continue;
    const id = `minecraft:${rawName}`;
    const isBlock = blockSet.has(rawName);
    const itemTags = tagsPerItem.get(id) ?? [];
    const stackSize =
      typeof comp['minecraft:max_stack_size'] === 'number'
        ? (comp['minecraft:max_stack_size'] as number)
        : 64;
    const rarityRaw = comp['minecraft:rarity'];
    const rarity: ItemRarity =
      rarityRaw === 'uncommon' || rarityRaw === 'rare' || rarityRaw === 'epic'
        ? rarityRaw
        : 'common';
    const iconModel =
      typeof comp['minecraft:item_model'] === 'string'
        ? (comp['minecraft:item_model'] as string)
        : id;

    items.push({
      id,
      name: resolveLangName(rawName, comp, lang, isBlock),
      mod: 'minecraft',
      packId: `vanilla-${MC_VERSION}`,
      category: classifyItem(rawName, comp, itemTags, isBlock),
      tags: itemTags,
      stackSize,
      rarity,
      isBlock,
      iconModel,
    });
    itemSet.add(id);
  }

  // Register all official Minecraft 26.3 potion & tipped arrow variants
  const potionContainers: Array<'potion' | 'splash_potion' | 'lingering_potion'> = [
    'potion',
    'splash_potion',
    'lingering_potion',
  ];
  const nonArrowBasePotions = new Set(['awkward', 'mundane', 'thick']);

  const getPotionEffectTags = (potionKey: string): string[] => {
    const base = potionKey.replace(/^long_/, '').replace(/^strong_/, '');
    const map: Record<string, string[]> = {
      leaping: ['#minecraft:effect/jump_boost'],
      swiftness: ['#minecraft:effect/speed'],
      healing: ['#minecraft:effect/instant_health'],
      harming: ['#minecraft:effect/instant_damage'],
      turtle_master: ['#minecraft:effect/resistance', '#minecraft:effect/slowness'],
      regeneration: ['#minecraft:effect/regeneration'],
      fire_resistance: ['#minecraft:effect/fire_resistance'],
      water_breathing: ['#minecraft:effect/water_breathing'],
      night_vision: ['#minecraft:effect/night_vision'],
      invisibility: ['#minecraft:effect/invisibility'],
      slow_falling: ['#minecraft:effect/slow_falling'],
      strength: ['#minecraft:effect/strength'],
      weakness: ['#minecraft:effect/weakness'],
      poison: ['#minecraft:effect/poison'],
      slowness: ['#minecraft:effect/slowness'],
      luck: ['#minecraft:effect/luck'],
      wind_charged: ['#minecraft:effect/wind_charged'],
      oozing: ['#minecraft:effect/oozing'],
      weaving: ['#minecraft:effect/weaving'],
      infested: ['#minecraft:effect/infested'],
    };
    return map[base] ?? [];
  };

  for (const potionKey of rawPotions) {
    const effectTags = getPotionEffectTags(potionKey);
    for (const container of potionContainers) {
      const variantId = `minecraft:${container}__${potionKey}`;
      items.push({
        id: variantId,
        name: resolvePotionDisplayName(container, potionKey, lang),
        mod: 'minecraft',
        packId: `vanilla-${MC_VERSION}`,
        category: 'alchemy',
        tags: ['#minecraft:brewing_potion_inputs', ...effectTags],
        stackSize: 1,
        rarity: 'common',
        isBlock: false,
        iconModel: `minecraft:${container}`,
      });
      itemSet.add(variantId);
    }

    if (!nonArrowBasePotions.has(potionKey)) {
      const arrowId = `minecraft:tipped_arrow__${potionKey}`;
      items.push({
        id: arrowId,
        name: resolvePotionDisplayName('tipped_arrow', potionKey, lang),
        mod: 'minecraft',
        packId: `vanilla-${MC_VERSION}`,
        category: 'combat',
        tags: ['#minecraft:arrows', ...effectTags],
        stackSize: 64,
        rarity: 'common',
        isBlock: false,
        iconModel: 'minecraft:tipped_arrow',
      });
      itemSet.add(arrowId);
    }
  }

  items.sort((a, b) => a.name.localeCompare(b.name));

  // Normalize all recipes
  const recipes: RecipeDef[] = [];

  for (const [recipeKey, raw] of Object.entries(rawRecipes)) {
    const rawType = String(raw.type || '');
    const resultObj = raw.result as { id?: string; count?: number } | undefined;
    const outputObj = raw.output as { id?: string; count?: number } | undefined;
    const rawOutId = resultObj?.id || outputObj?.id;
    if (!rawOutId) continue;
    const outputId = normalizeId(rawOutId);
    if (!itemSet.has(outputId)) continue;
    const outputCount = Number(resultObj?.count ?? outputObj?.count ?? 1) || 1;

    if (rawType === 'minecraft:crafting_shaped') {
      const pattern = Array.isArray(raw.pattern) ? (raw.pattern as string[]) : [];
      const keyMap = (raw.key ?? {}) as Record<string, unknown>;
      const grid: RecipeSlot[] = Array(9).fill(null);
      const ingMap = new Map<string, IngredientReq>();

      for (let r = 0; r < Math.min(3, pattern.length); r++) {
        const row = pattern[r] ?? '';
        for (let c = 0; c < Math.min(3, row.length); c++) {
          const ch = row[c];
          if (ch === ' ') continue;
          const choices = normalizeIngredientValue(keyMap[ch]);
          if (choices.length > 0) {
            grid[r * 3 + c] = toSlotValue(choices);
            addIngredientToMap(ingMap, choices, 1);
          }
        }
      }

      if (ingMap.size > 0) {
        recipes.push({
          id: `minecraft:${recipeKey}`,
          packId: `vanilla-${MC_VERSION}`,
          type: 'crafting_shaped',
          workstationId: 'minecraft:crafting_table',
          outputId,
          outputCount,
          grid,
          ingredients: Array.from(ingMap.values()),
        });
      }
    } else if (rawType === 'minecraft:crafting_shapeless') {
      const rawIngs = Array.isArray(raw.ingredients) ? raw.ingredients : [];
      const ingMap = new Map<string, IngredientReq>();
      for (const entry of rawIngs) {
        const choices = normalizeIngredientValue(entry);
        addIngredientToMap(ingMap, choices, 1);
      }
      if (ingMap.size > 0) {
        recipes.push({
          id: `minecraft:${recipeKey}`,
          packId: `vanilla-${MC_VERSION}`,
          type: 'crafting_shapeless',
          workstationId: 'minecraft:crafting_table',
          outputId,
          outputCount,
          ingredients: Array.from(ingMap.values()),
        });
      }
    } else if (
      rawType === 'minecraft:smelting' ||
      rawType === 'minecraft:blasting' ||
      rawType === 'minecraft:smoking' ||
      rawType === 'minecraft:campfire_cooking'
    ) {
      const typeShort = rawType.replace('minecraft:', '') as RecipeCategory;
      const workstationByType: Record<string, string> = {
        smelting: 'minecraft:furnace',
        blasting: 'minecraft:blast_furnace',
        smoking: 'minecraft:smoker',
        campfire_cooking: 'minecraft:campfire',
      };
      const choices = normalizeIngredientValue(raw.ingredient);
      if (choices.length > 0) {
        recipes.push({
          id: `minecraft:${recipeKey}`,
          packId: `vanilla-${MC_VERSION}`,
          type: typeShort,
          workstationId: workstationByType[typeShort] ?? 'minecraft:furnace',
          outputId,
          outputCount,
          ingredients: [
            {
              id: choices.length === 1 ? choices[0] : choices.join('|'),
              choices,
              count: 1,
            },
          ],
          cookTimeSec: typeof raw.cookingtime === 'number' ? raw.cookingtime / 20 : 10,
          xp: typeof raw.experience === 'number' ? raw.experience : undefined,
        });
      }
    } else if (rawType === 'minecraft:stonecutting') {
      const choices = normalizeIngredientValue(raw.ingredient);
      if (choices.length > 0) {
        recipes.push({
          id: `minecraft:${recipeKey}`,
          packId: `vanilla-${MC_VERSION}`,
          type: 'stonecutting',
          workstationId: 'minecraft:stonecutter',
          outputId,
          outputCount,
          ingredients: [
            {
              id: choices.length === 1 ? choices[0] : choices.join('|'),
              choices,
              count: 1,
            },
          ],
        });
      }
    } else if (rawType === 'minecraft:smithing_transform') {
      const ingMap = new Map<string, IngredientReq>();
      addIngredientToMap(ingMap, normalizeIngredientValue(raw.template), 1);
      addIngredientToMap(ingMap, normalizeIngredientValue(raw.base), 1);
      addIngredientToMap(ingMap, normalizeIngredientValue(raw.addition), 1);
      if (ingMap.size > 0) {
        recipes.push({
          id: `minecraft:${recipeKey}`,
          packId: `vanilla-${MC_VERSION}`,
          type: 'smithing_transform',
          workstationId: 'minecraft:smithing_table',
          outputId,
          outputCount,
          ingredients: Array.from(ingMap.values()),
        });
      }
    } else if (rawType === 'minecraft:brewing') {
      const ingMap = new Map<string, IngredientReq>();
      const reagentChoices = normalizeIngredientValue(raw.reagent);

      const inputObj = raw.input as
        | { item?: string; potion_contents?: { potions?: string } }
        | undefined;
      const inputContainer = inputObj?.item ? normalizeId(inputObj.item) : null;
      const inputPotionShort = inputObj?.potion_contents?.potions?.replace(/^minecraft:/, '');
      const concreteInputId =
        inputContainer && inputPotionShort
          ? `${inputContainer}__${inputPotionShort}`
          : null;
      const inputChoices =
        concreteInputId && itemSet.has(concreteInputId)
          ? [concreteInputId]
          : normalizeIngredientValue(raw.input);

      const outputPotionRaw = (
        raw.output as { components?: { 'minecraft:potion_contents'?: { potion?: string } } }
      )?.components?.['minecraft:potion_contents']?.potion;
      const outputPotionShort = outputPotionRaw?.replace(/^minecraft:/, '');
      const concreteOutputId =
        outputPotionShort && itemSet.has(`${outputId}__${outputPotionShort}`)
          ? `${outputId}__${outputPotionShort}`
          : outputId;

      addIngredientToMap(ingMap, reagentChoices, 1);
      addIngredientToMap(ingMap, inputChoices, 3);

      if (ingMap.size > 0) {
        const reagentLabel =
          reagentChoices[0] ? titleCaseId(reagentChoices[0]) : 'Reagent';
        recipes.push({
          id: `minecraft:${recipeKey}`,
          packId: `vanilla-${MC_VERSION}`,
          type: 'brewing',
          workstationId: 'minecraft:brewing_stand',
          outputId: concreteOutputId,
          outputCount: 3,
          ingredients: Array.from(ingMap.values()),
          cookTimeSec: 20,
          note: `${reagentLabel} · Blaze Fuel`,
        });
      }
    } else if (rawType === 'minecraft:crafting_transmute') {
      const ingMap = new Map<string, IngredientReq>();
      addIngredientToMap(ingMap, normalizeIngredientValue(raw.input), 1);
      addIngredientToMap(ingMap, normalizeIngredientValue(raw.material), 1);
      if (ingMap.size > 0) {
        recipes.push({
          id: `minecraft:${recipeKey}`,
          packId: `vanilla-${MC_VERSION}`,
          type: 'transmute',
          workstationId: 'minecraft:crafting_table',
          outputId,
          outputCount,
          ingredients: Array.from(ingMap.values()),
          note: 'Dye / Transmute',
        });
      }
    } else if (rawType === 'minecraft:crafting_imbue') {
      // Expand crafting_imbue into concrete 3x3 shaped recipes for every Tipped Arrow potion variant
      for (const potionKey of rawPotions) {
        if (nonArrowBasePotions.has(potionKey)) continue;
        const lingeringId = `minecraft:lingering_potion__${potionKey}`;
        const arrowOutId = `minecraft:tipped_arrow__${potionKey}`;
        if (!itemSet.has(lingeringId) || !itemSet.has(arrowOutId)) continue;
        recipes.push({
          id: `minecraft:${recipeKey}__${potionKey}`,
          packId: `vanilla-${MC_VERSION}`,
          type: 'crafting_shaped',
          workstationId: 'minecraft:crafting_table',
          outputId: arrowOutId,
          outputCount: 8,
          grid: [
            'minecraft:arrow', 'minecraft:arrow', 'minecraft:arrow',
            'minecraft:arrow', lingeringId, 'minecraft:arrow',
            'minecraft:arrow', 'minecraft:arrow', 'minecraft:arrow',
          ],
          ingredients: [
            { id: 'minecraft:arrow', choices: ['minecraft:arrow'], count: 8 },
            { id: lingeringId, choices: [lingeringId], count: 1 },
          ],
          note: 'Tipped Arrow',
        });
      }
    } else if (rawType === 'minecraft:crafting_decorated_pot') {
      const ingMap = new Map<string, IngredientReq>();
      addIngredientToMap(ingMap, normalizeIngredientValue(raw.back), 4);
      if (ingMap.size > 0) {
        recipes.push({
          id: `minecraft:${recipeKey}`,
          packId: `vanilla-${MC_VERSION}`,
          type: 'crafting_shaped',
          workstationId: 'minecraft:crafting_table',
          outputId,
          outputCount,
          grid: [
            null, '#minecraft:decorated_pot_ingredients', null,
            '#minecraft:decorated_pot_ingredients', null, '#minecraft:decorated_pot_ingredients',
            null, '#minecraft:decorated_pot_ingredients', null,
          ],
          ingredients: Array.from(ingMap.values()),
        });
      }
    }
  }

  if (itemSet.has('minecraft:potion__water') && itemSet.has('minecraft:glass_bottle')) {
    recipes.push({
      id: 'minecraft:water_bottle_filling',
      packId: `vanilla-${MC_VERSION}`,
      type: 'special',
      workstationId: 'minecraft:water_bucket',
      outputId: 'minecraft:potion__water',
      outputCount: 1,
      ingredients: [
        { id: 'minecraft:glass_bottle', choices: ['minecraft:glass_bottle'], count: 1 },
      ],
      note: 'Fill from Water Source',
    });
  }

  return {
    version: MC_VERSION,
    generatedAt: new Date().toISOString(),
    items,
    recipes,
    tags,
  };
}

async function getDataset(forceRefresh = false): Promise<VanillaDatasetPayload> {
  if (cachedDataset && !forceRefresh) return cachedDataset;
  if (datasetPromise && !forceRefresh) return datasetPromise;

  datasetPromise = (async () => {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    if (!forceRefresh) {
      try {
        const raw = await fs.readFile(DATASET_CACHE_FILE, 'utf-8');
        const parsed = JSON.parse(raw) as VanillaDatasetPayload;
        const hasPotionVariants = parsed.items?.some(
          (i) =>
            i.id === 'minecraft:potion__healing' &&
            i.tags.includes('#minecraft:effect/instant_health')
        );
        if (parsed.items?.length > 1000 && parsed.recipes?.length > 1000 && hasPotionVariants) {
          cachedDataset = parsed;
          blockNameSet = new Set(
            parsed.items
              .filter((i) => i.isBlock)
              .map((i) => i.id.replace(/^minecraft:/, ''))
          );
          return parsed;
        }
      } catch {
        // Cache miss
      }
    }

    const fresh = await buildVanillaDataset();
    cachedDataset = fresh;
    await fs.writeFile(DATASET_CACHE_FILE, JSON.stringify(fresh), 'utf-8');
    return fresh;
  })();

  try {
    return await datasetPromise;
  } finally {
    datasetPromise = null;
  }
}

function shouldPreferItemSpriteFirst(name: string): boolean {
  if (!blockNameSet.has(name)) return true;
  if (FLAT_BLOCK_HINTS.has(name)) return true;
  return (
    name.endsWith('_door') ||
    name.endsWith('_sign') ||
    name.endsWith('_hanging_sign') ||
    name.endsWith('_candle') ||
    name.endsWith('_sapling') ||
    name.endsWith('_banner') ||
    name.endsWith('_rail')
  );
}

async function fetchFirstValidPng(urls: string[]): Promise<Buffer | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok && res.headers.get('content-type')?.includes('image')) {
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length > 50) return buf;
      }
    } catch {
      // Try next fallback URL
    }
  }
  return null;
}

interface DecodedPng {
  width: number;
  height: number;
  rgba: Uint8Array;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePngRgba(buf: Buffer): DecodedPng | null {
  if (buf.length < 33 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let trnsGray: number | null = null;
  let palette: Buffer | null = null;
  let trnsPalette: Buffer | null = null;
  const idatParts: Buffer[] = [];

  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'PLTE') {
      palette = data;
    } else if (type === 'tRNS') {
      if (colorType === 0 && len >= 2) {
        trnsGray = data.readUInt16BE(0);
      } else if (colorType === 3) {
        trnsPalette = data;
      }
    } else if (type === 'IDAT') {
      idatParts.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }

  if (bitDepth !== 8 || !width || !height) return null;
  const bpp =
    colorType === 6
      ? 4
      : colorType === 4
      ? 2
      : colorType === 2
      ? 3
      : colorType === 0 || colorType === 3
      ? 1
      : 0;
  if (!bpp) return null;
  if (colorType === 3 && !palette) return null;

  const inflated = zlib.inflateSync(Buffer.concat(idatParts));
  const stride = width * bpp;
  const raw = new Uint8Array(height * stride);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    const filter = inflated[rowStart];
    const outStart = y * stride;

    for (let x = 0; x < stride; x++) {
      const val = inflated[rowStart + 1 + x];
      const a = x >= bpp ? raw[outStart + x - bpp] : 0;
      const b = y > 0 ? raw[outStart - stride + x] : 0;
      const c = y > 0 && x >= bpp ? raw[outStart - stride + x - bpp] : 0;

      let recon = val;
      if (filter === 1) recon = (val + a) & 0xff;
      else if (filter === 2) recon = (val + b) & 0xff;
      else if (filter === 3) recon = (val + ((a + b) >> 1)) & 0xff;
      else if (filter === 4) recon = (val + paethPredictor(a, b, c)) & 0xff;
      raw[outStart + x] = recon;
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const dst = i * 4;
    if (colorType === 6) {
      rgba[dst] = raw[i * 4];
      rgba[dst + 1] = raw[i * 4 + 1];
      rgba[dst + 2] = raw[i * 4 + 2];
      rgba[dst + 3] = raw[i * 4 + 3];
    } else if (colorType === 4) {
      const g = raw[i * 2];
      rgba[dst] = g;
      rgba[dst + 1] = g;
      rgba[dst + 2] = g;
      rgba[dst + 3] = raw[i * 2 + 1];
    } else if (colorType === 2) {
      rgba[dst] = raw[i * 3];
      rgba[dst + 1] = raw[i * 3 + 1];
      rgba[dst + 2] = raw[i * 3 + 2];
      rgba[dst + 3] = 255;
    } else if (colorType === 3 && palette) {
      const idx = raw[i];
      if (idx * 3 + 2 < palette.length) {
        rgba[dst] = palette[idx * 3];
        rgba[dst + 1] = palette[idx * 3 + 1];
        rgba[dst + 2] = palette[idx * 3 + 2];
        rgba[dst + 3] = trnsPalette && idx < trnsPalette.length ? trnsPalette[idx] : 255;
      }
    } else if (colorType === 0) {
      const g = raw[i];
      rgba[dst] = g;
      rgba[dst + 1] = g;
      rgba[dst + 2] = g;
      rgba[dst + 3] = trnsGray !== null && g === trnsGray ? 0 : 255;
    }
  }

  return { width, height, rgba };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePngRgba(width: number, height: number, rgba: Uint8Array): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const rowOff = y * (stride + 1);
    raw[rowOff] = 0;
    raw.set(rgba.subarray(y * stride, (y + 1) * stride), rowOff + 1);
  }

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function alphaBlendPixel(
  dst: Uint8Array,
  idx: number,
  sr: number,
  sg: number,
  sb: number,
  sa: number
) {
  if (sa <= 0) return;
  const da = dst[idx + 3] / 255;
  const sAlpha = sa / 255;
  const outA = sAlpha + da * (1 - sAlpha);
  if (outA <= 0) return;
  dst[idx] = Math.round((sr * sAlpha + dst[idx] * da * (1 - sAlpha)) / outA);
  dst[idx + 1] = Math.round((sg * sAlpha + dst[idx + 1] * da * (1 - sAlpha)) / outA);
  dst[idx + 2] = Math.round((sb * sAlpha + dst[idx + 2] * da * (1 - sAlpha)) / outA);
  dst[idx + 3] = Math.round(outA * 255);
}

async function buildTintedPotionIcon(
  container: 'potion' | 'splash_potion' | 'lingering_potion' | 'tipped_arrow',
  potionKey: string
): Promise<Buffer | null> {
  const mcAssetBase = `https://assets.mcasset.cloud/${MC_VERSION}/assets/minecraft/textures/item`;
  const overlayName = container === 'tipped_arrow' ? 'tipped_arrow_head' : 'potion_overlay';
  const baseName = container === 'tipped_arrow' ? 'tipped_arrow_base' : container;

  const [overlayRaw, baseRaw] = await Promise.all([
    fetchFirstValidPng([`${mcAssetBase}/${overlayName}.png`]),
    fetchFirstValidPng([`${mcAssetBase}/${baseName}.png`]),
  ]);
  if (!overlayRaw || !baseRaw) return null;

  const overlay = decodePngRgba(overlayRaw);
  const base = decodePngRgba(baseRaw);
  if (!overlay || !base || overlay.width !== base.width || overlay.height !== base.height) {
    return null;
  }

  const colorHex = POTION_COLORS[potionKey] ?? 0x385dc6;
  const tintR = (colorHex >> 16) & 0xff;
  const tintG = (colorHex >> 8) & 0xff;
  const tintB = colorHex & 0xff;

  const out = new Uint8Array(base.width * base.height * 4);
  const layers =
    container === 'tipped_arrow' ? ['base', 'overlay'] : ['overlay', 'base'];

  for (const layer of layers) {
    for (let i = 0; i < base.width * base.height; i++) {
      const idx = i * 4;
      if (layer === 'overlay') {
        const a = overlay.rgba[idx + 3];
        if (a === 0) continue;
        const r = Math.round((overlay.rgba[idx] * tintR) / 255);
        const g = Math.round((overlay.rgba[idx + 1] * tintG) / 255);
        const b = Math.round((overlay.rgba[idx + 2] * tintB) / 255);
        alphaBlendPixel(out, idx, r, g, b, a);
      } else {
        alphaBlendPixel(
          out,
          idx,
          base.rgba[idx],
          base.rgba[idx + 1],
          base.rgba[idx + 2],
          base.rgba[idx + 3]
        );
      }
    }
  }

  return encodePngRgba(base.width, base.height, out);
}

function renderIsometricHeadFromSkin(skinBuf: Buffer): Buffer | null {
  let skin: DecodedPng | null = null;
  try {
    skin = decodePngRgba(skinBuf);
  } catch {
    return null;
  }
  if (!skin || skin.width < 64 || skin.height < 32) return null;

  const texScale = skin.width / 64;
  const size = 64;
  const out = new Uint8Array(size * size * 4);

  const drawFace = (
    srcOx: number,
    srcOy: number,
    p00: [number, number],
    p10: [number, number],
    p01: [number, number],
    shade: number,
    forceOpaque = false
  ) => {
    const ax = p10[0] - p00[0];
    const ay = p10[1] - p00[1];
    const bx = p01[0] - p00[0];
    const by = p01[1] - p00[1];
    const det = ax * by - ay * bx;
    if (Math.abs(det) < 1e-6) return;

    const p11: [number, number] = [p10[0] + bx, p10[1] + by];
    const minX = Math.max(0, Math.floor(Math.min(p00[0], p10[0], p01[0], p11[0])));
    const maxX = Math.min(size - 1, Math.ceil(Math.max(p00[0], p10[0], p01[0], p11[0])));
    const minY = Math.max(0, Math.floor(Math.min(p00[1], p10[1], p01[1], p11[1])));
    const maxY = Math.min(size - 1, Math.ceil(Math.max(p00[1], p10[1], p01[1], p11[1])));

    const faceTexW = Math.round(8 * texScale);
    const faceTexOx = Math.round(srcOx * texScale);
    const faceTexOy = Math.round(srcOy * texScale);

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = px + 0.5 - p00[0];
        const dy = py + 0.5 - p00[1];
        const u = (dx * by - dy * bx) / det;
        const v = (ax * dy - ay * dx) / det;
        if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;

        const tx = Math.min(faceTexW - 1, Math.max(0, Math.floor(u * faceTexW)));
        const ty = Math.min(faceTexW - 1, Math.max(0, Math.floor(v * faceTexW)));
        const sx = faceTexOx + tx;
        const sy = faceTexOy + ty;
        if (sx >= skin.width || sy >= skin.height) continue;

        const sIdx = (sy * skin.width + sx) * 4;
        const sa = forceOpaque ? 255 : skin.rgba[sIdx + 3];
        if (sa === 0) continue;

        const sr = Math.min(255, Math.round(skin.rgba[sIdx] * shade));
        const sg = Math.min(255, Math.round(skin.rgba[sIdx + 1] * shade));
        const sb = Math.min(255, Math.round(skin.rgba[sIdx + 2] * shade));
        alphaBlendPixel(out, (py * size + px) * 4, sr, sg, sb, sa);
      }
    }
  };

  // Isometric cube geometry (base 8x8x8), facing bottom-right (Front on right, Right-ear side on left)
  const renderCube = (
    scale: number,
    topUv: [number, number],
    sideLeftUv: [number, number],
    frontRightUv: [number, number],
    forceOpaque: boolean
  ) => {
    const cx = 32;
    const cy = 32;
    const W = 23 * scale;
    const H = 11.5 * scale;
    const D = 26 * scale;
    const topY = cy - H - D * 0.5;

    const cTop: [number, number] = [cx, topY];
    const cLeft: [number, number] = [cx - W, topY + H];
    const cRight: [number, number] = [cx + W, topY + H];
    const cCenter: [number, number] = [cx, topY + 2 * H];
    const bLeft: [number, number] = [cx - W, topY + H + D];
    const bCenter: [number, number] = [cx, topY + 2 * H + D];

    // Top face (hinged along front edge cCenter->cRight), Right-ear side (bottom-left), Front face (bottom-right)
    drawFace(topUv[0], topUv[1], cLeft, cTop, cCenter, 1.0, forceOpaque);
    drawFace(sideLeftUv[0], sideLeftUv[1], cLeft, cCenter, bLeft, 0.78, forceOpaque);
    drawFace(frontRightUv[0], frontRightUv[1], cCenter, cRight, bCenter, 0.94, forceOpaque);
  };

  // Base head layer: Top (8,0), Right-ear (0,8), Front (8,8)
  renderCube(1.0, [8, 0], [0, 8], [8, 8], false);

  // Detect legacy solid-black uninitialized hat quadrant artifact in old 64x32 skins
  const hatFaces: [number, number][] = [
    [40, 0],
    [32, 8],
    [40, 8],
  ];
  let hatHasPixels = false;
  let hatAllSolidBlack = true;
  for (const [ox, oy] of hatFaces) {
    for (let dy = 0; dy < 8; dy++) {
      for (let dx = 0; dx < 8; dx++) {
        const sx = Math.min(skin.width - 1, Math.round((ox + dx) * texScale));
        const sy = Math.min(skin.height - 1, Math.round((oy + dy) * texScale));
        const idx = (sy * skin.width + sx) * 4;
        const a = skin.rgba[idx + 3];
        if (a > 0) hatHasPixels = true;
        if (a !== 255 || skin.rgba[idx] !== 0 || skin.rgba[idx + 1] !== 0 || skin.rgba[idx + 2] !== 0) {
          hatAllSolidBlack = false;
        }
      }
    }
  }

  if (hatHasPixels && !hatAllSolidBlack) {
    renderCube(1.08, [40, 0], [32, 8], [40, 8], false);
  }

  return encodePngRgba(size, size, out);
}

async function startServer() {
  const app = express();

  app.get('/api/dataset', async (req, res) => {
    try {
      const refresh = req.query.refresh === '1';
      const data = await getDataset(refresh);
      res.setHeader('Cache-Control', 'no-store');
      res.json(data);
    } catch (err) {
      console.error('Failed to load dataset:', err);
      res.status(500).json({ error: 'Failed to load Minecraft 26.3 dataset' });
    }
  });

  app.get('/api/slimefun-core', async (req, res) => {
    try {
      const refresh = req.query.refresh === '1';
      const data = await getSlimefunCore(refresh);
      res.setHeader('Cache-Control', 'no-store');
      res.json(data);
    } catch (err) {
      console.error('Failed to load Slimefun4 Core:', err);
      res.status(500).json({ error: 'Failed to load Slimefun4 Core data' });
    }
  });

  app.post('/api/import-slimefun-github', express.json({ limit: '64kb' }), async (req, res) => {
    try {
      const repoUrl = typeof req.body?.repoUrl === 'string' ? req.body.repoUrl : '';
      if (!repoUrl.trim()) {
        res.status(400).json({ error: 'Masukkan link repositori GitHub addon Slimefun.' });
        return;
      }
      const core = await getSlimefunCore().catch(() => null);
      const pack = await importSlimefunFromGithubRepo(repoUrl, core?.fieldToItemId ?? {});
      res.json(pack);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Gagal membaca repositori GitHub Slimefun',
      });
    }
  });

  app.post(
    '/api/import-slimefun-jar',
    express.raw({ type: 'application/octet-stream', limit: '30mb' }),
    async (req, res) => {
      try {
        const rawName = String(req.headers['x-file-name'] || 'slimefun-addon.jar');
        const safeName = path.basename(decodeURIComponent(rawName));
        if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
          res.status(400).json({ error: 'File JAR kosong atau tidak valid.' });
          return;
        }
        const core = await getSlimefunCore().catch(() => null);
        const pack = await parseSlimefunPluginJar(
          req.body,
          safeName,
          core?.fieldToItemId ?? {}
        );
        res.json(pack);
      } catch (err) {
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal membaca file JAR plugin Slimefun',
        });
      }
    }
  );

  app.get('/api/icon/:namespace/:name', async (req, res) => {
    const namespace = req.params.namespace;
    const name = req.params.name;

    if (!/^[a-z0-9_.-]+$/.test(namespace) || !/^[a-z0-9_./-]+$/.test(name)) {
      res.status(400).end();
      return;
    }

    const cacheKey =
      namespace === 'head'
        ? `sfhead3__${name.replace(/\//g, '_')}`
        : `${namespace}__${name.replace(/\//g, '_')}`;
    const negExp = negativeIconCache.get(cacheKey);
    if (negExp && negExp > Date.now()) {
      res.status(404).end();
      return;
    }

    await fs.mkdir(ICON_CACHE_DIR, { recursive: true });
    const cachePath = path.join(ICON_CACHE_DIR, `${cacheKey}.png`);

    try {
      const diskBuf = await fs.readFile(cachePath);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.send(diskBuf);
      return;
    } catch {
      // Cache miss
    }

    // Ensure blockSet is populated when icon hits before /api/dataset completes
    if (blockNameSet.size === 0) {
      try {
        await getDataset(false);
      } catch {
        // Proceed with heuristic
      }
    }

    const mcAssetBase = `https://assets.mcasset.cloud/${MC_VERSION}/assets/minecraft/textures`;
    const candidates: string[] = [];

    if (namespace === 'minecraft') {
      const potionMatch = name.match(
        /^(potion|splash_potion|lingering_potion|tipped_arrow)__([a-z0-9_]+)$/
      );
      if (potionMatch) {
        const container = potionMatch[1] as
          | 'potion'
          | 'splash_potion'
          | 'lingering_potion'
          | 'tipped_arrow';
        const potionKey = potionMatch[2];
        const tinted = await buildTintedPotionIcon(container, potionKey);
        if (tinted) {
          await fs.writeFile(cachePath, tinted).catch(() => {});
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=604800');
          res.send(tinted);
          return;
        }
      }

      const itemUrl = `${mcAssetBase}/item/${name}.png`;
      const itemIconUrl = `https://blocksitems.com/api/v2/items/minecraft:${name}/icon.png?size=64`;
      const isoUrl = `https://blocksitems.com/api/v2/blocks/minecraft:${name}/render.png?angle=iso&size=64`;
      const blockUrl = `${mcAssetBase}/block/${name}.png`;
      const frontUrl = `${mcAssetBase}/block/${name}_front.png`;
      const sideUrl = `${mcAssetBase}/block/${name}_side.png`;
      const topUrl = `${mcAssetBase}/block/${name}_top.png`;

      if (shouldPreferItemSpriteFirst(name)) {
        candidates.push(itemUrl, itemIconUrl, isoUrl, blockUrl, frontUrl, sideUrl, topUrl);
      } else {
        candidates.push(isoUrl, itemIconUrl, itemUrl, blockUrl, frontUrl, sideUrl, topUrl);
      }
    } else if (namespace === 'head') {
      if (!/^[a-f0-9]{32,80}$/i.test(name)) {
        res.status(400).end();
        return;
      }

      // Render 3D isometric head directly from Mojang skin PNG so short (57..63 char) hashes never hit Steve fallback
      const rawSkin = await fetchFirstValidPng([
        `https://textures.minecraft.net/texture/${name}`,
      ]);
      if (rawSkin) {
        const renderedHead = renderIsometricHeadFromSkin(rawSkin);
        if (renderedHead) {
          await fs.writeFile(cachePath, renderedHead).catch(() => {});
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=604800');
          res.send(renderedHead);
          return;
        }
      }

      candidates.push(
        `https://mc-heads.net/head/${name}/64`,
        `https://crafatar.com/renders/head/${name}?size=64&overlay`
      );
    } else {
      res.status(404).end();
      return;
    }

    const pngBuf = await fetchFirstValidPng(candidates);
    if (!pngBuf) {
      negativeIconCache.set(cacheKey, Date.now() + 5 * 60 * 1000);
      res.status(404).end();
      return;
    }

    await fs.writeFile(cachePath, pngBuf).catch(() => {});
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=604800');
    res.send(pngBuf);
  });

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*path', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });

    app.get('/@vite/client', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) {
  return url;
}
export class ErrorOverlay extends HTMLElement {}
`);
    });

    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EMI Web server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
