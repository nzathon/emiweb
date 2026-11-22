import JSZip from 'jszip';
import type {
  IngredientReq,
  ItemCategory,
  ItemDef,
  RecipeDef,
  RecipeSlot,
} from '../src/types/emi.ts';

export interface SlimefunPackPayload {
  id: string;
  name: string;
  version: string;
  items: ItemDef[];
  recipes: RecipeDef[];
  tags: Record<string, string[]>;
  fieldToItemId?: Record<string, string>;
}

const SLIMEFUN_GITHUB_BASE =
  'https://raw.githubusercontent.com/Slimefun/Slimefun4/master/src/main/java/io/github/thebusybiscuit/slimefun4';

const BUKKIT_MATERIAL_ALIASES: Record<string, string> = {
  workbench: 'crafting_table',
  crafting_table: 'crafting_table',
  skull_item: 'player_head',
  player_head: 'player_head',
  enchantment_table: 'enchanting_table',
  ender_portal_frame: 'end_portal_frame',
  redstone_torch_on: 'redstone_torch',
  smooth_brick: 'stone_bricks',
  stained_glass_pane: 'white_stained_glass_pane',
  stained_clay: 'terracotta',
  gold_ingot: 'gold_ingot',
  sulphur: 'gunpowder',
  ink_sack: 'ink_sac',
  slime_ball: 'slime_ball',
  blaze_rod: 'blaze_rod',
  nether_stalk: 'nether_wart',
  clay_ball: 'clay_ball',
  melon_block: 'melon',
  magma: 'magma_block',
  snow_ball: 'snowball',
  piston_base: 'piston',
  piston_sticky_base: 'sticky_piston',
  iron_fence: 'iron_bars',
  redstone_comparator: 'comparator',
  diode: 'repeater',
  nether_fence: 'nether_brick_fence',
  thin_glass: 'glass_pane',
  wood_door: 'oak_door',
  iron_plate: 'heavy_weighted_pressure_plate',
  gold_plate: 'light_weighted_pressure_plate',
  stone_plate: 'stone_pressure_plate',
  wood_plate: 'oak_pressure_plate',
  exp_bottle: 'experience_bottle',
  firework: 'firework_rocket',
  watch: 'clock',
  totem: 'totem_of_undying',
};

const BUKKIT_TAG_TO_MC_TAG: Record<string, string> = {
  LOGS: '#minecraft:logs',
  LOGS_THAT_BURN: '#minecraft:logs_that_burn',
  PLANKS: '#minecraft:planks',
  LEAVES: '#minecraft:leaves',
  SAPLINGS: '#minecraft:saplings',
  WOOL: '#minecraft:wool',
  SAND: '#minecraft:sand',
  COALS: '#minecraft:coals',
  STONE_BRICKS: '#minecraft:stone_bricks',
  WOODEN_SLABS: '#minecraft:wooden_slabs',
  WOODEN_STAIRS: '#minecraft:wooden_stairs',
  WOODEN_FENCES: '#minecraft:wooden_fences',
  WOODEN_DOORS: '#minecraft:wooden_doors',
  FLOWERS: '#minecraft:flowers',
  SMALL_FLOWERS: '#minecraft:small_flowers',
  FISHES: '#minecraft:fishes',
  CARPETS: '#minecraft:wool_carpets',
  TERRACOTTA: '#minecraft:terracotta',
  ICE: '#minecraft:ice',
  BEDS: '#minecraft:beds',
  ANVIL: '#minecraft:anvil',
  ITEMS_STONE_CRAFTING_MATERIALS: '#minecraft:stone_crafting_materials',
  ITEMS_STONE_TOOL_MATERIALS: '#minecraft:stone_tool_materials',
  STONE_CRAFTING_MATERIALS: '#minecraft:stone_crafting_materials',
  STONE_TOOL_MATERIALS: '#minecraft:stone_tool_materials',
};

const COLOR_TO_POTION: Record<string, string> = {
  RED: 'healing',
  MAROON: 'harming',
  ORANGE: 'fire_resistance',
  YELLOW: 'strength',
  GREEN: 'poison',
  LIME: 'leaping',
  AQUA: 'swiftness',
  BLUE: 'water',
  NAVY: 'night_vision',
  PURPLE: 'slow_falling',
  FUCHSIA: 'regeneration',
  GRAY: 'weakness',
  SILVER: 'invisibility',
  WHITE: 'invisibility',
  BLACK: 'weakness',
};

const RECIPE_TYPE_WORKSTATIONS: Record<string, { id: string; label: string }> = {
  ENHANCED_CRAFTING_TABLE: {
    id: 'slimefun:enhanced_crafting_table',
    label: 'Enhanced Crafting Table',
  },
  MAGIC_WORKBENCH: {
    id: 'slimefun:magic_workbench',
    label: 'Magic Workbench',
  },
  GRIND_STONE: {
    id: 'slimefun:grind_stone',
    label: 'Grind Stone',
  },
  ARMOR_FORGE: {
    id: 'slimefun:armor_forge',
    label: 'Armor Forge',
  },
  SMELTERY: {
    id: 'slimefun:smeltery',
    label: 'Smeltery',
  },
  ORE_CRUSHER: {
    id: 'slimefun:ore_crusher',
    label: 'Ore Crusher',
  },
  ORE_WASHER: {
    id: 'slimefun:ore_washer',
    label: 'Ore Washer',
  },
  COMPRESSOR: {
    id: 'slimefun:compressor',
    label: 'Compressor',
  },
  PRESSURE_CHAMBER: {
    id: 'slimefun:pressure_chamber',
    label: 'Pressure Chamber',
  },
  HEATED_PRESSURE_CHAMBER: {
    id: 'slimefun:heated_pressure_chamber',
    label: 'Heated Pressure Chamber',
  },
  ANCIENT_ALTAR: {
    id: 'slimefun:ancient_altar',
    label: 'Ancient Altar',
  },
  JUICER: {
    id: 'slimefun:juicer',
    label: 'Juicer',
  },
  GOLD_PAN: {
    id: 'slimefun:gold_pan',
    label: 'Gold Pan',
  },
  REFINERY: {
    id: 'slimefun:refinery',
    label: 'Oil Refinery',
  },
  GEO_MINER: {
    id: 'slimefun:geo_miner',
    label: 'GEO Miner',
  },
  FREEZER: {
    id: 'slimefun:freezer',
    label: 'Freezer',
  },
  NUCLEAR_REACTOR: {
    id: 'slimefun:nuclear_reactor',
    label: 'Nuclear Reactor',
  },
  MOB_DROP: {
    id: 'minecraft:iron_sword',
    label: 'Mob Drop',
  },
  BARTER_DROP: {
    id: 'minecraft:gold_ingot',
    label: 'Piglin Barter',
  },
  INTERACT: {
    id: 'minecraft:player_head',
    label: 'World Interaction',
  },
  MULTIBLOCK: {
    id: 'minecraft:crafting_table',
    label: 'Multiblock Structure',
  },
};

export function stripMcColorCodes(raw: string): string {
  return raw
    .replace(/&[0-9a-fk-or]/gi, '')
    .replace(/§[0-9a-fk-or]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function titleCaseRaw(raw: string): string {
  return raw
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function materialToMinecraftId(materialName: string): string {
  const lower = materialName.trim().toLowerCase();
  const mapped = BUKKIT_MATERIAL_ALIASES[lower] ?? lower;
  return `minecraft:${mapped}`;
}

export function extractHashFromBase64OrHex(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^[a-f0-9]{40,80}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^[A-Za-z0-9+/=]{32,}$/.test(trimmed)) {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      const urlMatch = decoded.match(/textures\.minecraft\.net\/texture\/([a-f0-9]+)/i);
      if (urlMatch) return urlMatch[1].toLowerCase();
    } catch {
      // Ignore invalid base64
    }
  }
  return null;
}

function classifySlimefunItem(id: string, name: string): ItemCategory {
  const hay = `${id} ${name}`.toLowerCase();
  if (
    hay.includes('sword') ||
    hay.includes('bow') ||
    hay.includes('blade') ||
    hay.includes('helmet') ||
    hay.includes('chestplate') ||
    hay.includes('leggings') ||
    hay.includes('boots') ||
    hay.includes('armor') ||
    hay.includes('staff') ||
    hay.includes('crossbow')
  ) {
    return 'combat';
  }
  if (
    hay.includes('pickaxe') ||
    hay.includes('axe') ||
    hay.includes('shovel') ||
    hay.includes('hoe') ||
    hay.includes('wrench') ||
    hay.includes('scanner') ||
    hay.includes('magnet') ||
    hay.includes('backpack') ||
    hay.includes('multitool') ||
    hay.includes('jetpack')
  ) {
    return 'tools';
  }
  if (
    hay.includes('juice') ||
    hay.includes('cookie') ||
    hay.includes('cake') ||
    hay.includes('jerky') ||
    hay.includes('pie') ||
    hay.includes('cheese') ||
    hay.includes('butter') ||
    hay.includes('milk') ||
    hay.includes('cider') ||
    hay.includes('food')
  ) {
    return 'food';
  }
  if (
    hay.includes('rune') ||
    hay.includes('talisman') ||
    hay.includes('magic') ||
    hay.includes('altar') ||
    hay.includes('essence') ||
    hay.includes('necrotic') ||
    hay.includes('flask')
  ) {
    return 'alchemy';
  }
  if (
    hay.includes('motor') ||
    hay.includes('circuit') ||
    hay.includes('solar') ||
    hay.includes('capacitor') ||
    hay.includes('generator') ||
    hay.includes('electric') ||
    hay.includes('cargo') ||
    hay.includes('reactor') ||
    hay.includes('android') ||
    hay.includes('gps') ||
    hay.includes('energy') ||
    hay.includes('smeltery') ||
    hay.includes('crusher') ||
    hay.includes('compressor') ||
    hay.includes('machine')
  ) {
    return 'redstone';
  }
  return 'materials';
}

function splitTopLevelArgs(str: string): string[] {
  const args: string[] = [];
  let cur = '';
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let inQuote: '"' | "'" | null = null;
  let escaped = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escaped) {
      cur += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\' && inQuote) {
      cur += ch;
      escaped = true;
      continue;
    }
    if ((ch === '"' || ch === "'") && !inQuote) {
      inQuote = ch;
      cur += ch;
      continue;
    }
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
      cur += ch;
      continue;
    }
    if (ch === '(') depthParen++;
    else if (ch === ')') depthParen--;
    else if (ch === '{') depthBrace++;
    else if (ch === '}') depthBrace--;
    else if (ch === '[') depthBracket++;
    else if (ch === ']') depthBracket--;
    else if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      args.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

function findMatchingDelimiter(
  text: string,
  openIndex: number,
  openCh: string,
  closeCh: string
): number {
  let depth = 0;
  let inQuote: '"' | "'" | null = null;
  let escaped = false;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && inQuote) {
      escaped = true;
      continue;
    }
    if ((ch === '"' || ch === "'") && !inQuote) {
      inQuote = ch;
      continue;
    }
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
      continue;
    }
    if (ch === openCh) depth++;
    else if (ch === closeCh) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function stripJavaComments(src: string): string {
  // Remove block comments and line comments outside string literals
  let out = '';
  let inStr = false;
  let escaped = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (inStr) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }
    if (ch === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 1;
      continue;
    }
    out += ch;
  }
  return out;
}

function resolveJavaStringExpr(expr: string): string | null {
  const trimmed = expr.trim();
  const chris = trimmed.match(/^ChatUtils\.christmas\s*\(\s*"([^"]+)"\s*\)$/);
  if (chris) return chris[1];
  const literal = trimmed.match(/^"((?:[^"\\]|\\.)*)"$/);
  if (literal) {
    return literal[1].replace(/\\"/g, '"').replace(/\\n/g, ' ');
  }
  // Handle concatenated strings: "foo" + "bar"
  if (trimmed.includes('"') && trimmed.includes('+')) {
    const parts = trimmed.match(/"((?:[^"\\]|\\.)*)"/g);
    if (parts && parts.length > 0) {
      return parts.map((p) => p.slice(1, -1)).join('');
    }
  }
  return null;
}

function addIng(map: Map<string, IngredientReq>, choices: string[], count = 1) {
  if (choices.length === 0) return;
  const id = choices.length === 1 ? choices[0] : choices.join('|');
  const existing = map.get(id);
  if (existing) existing.count += count;
  else map.set(id, { id, choices, count });
}

export function parseSlimefunJavaSource(options: {
  modNamespace: string;
  packId: string;
  packName: string;
  version: string;
  javaFiles: { path: string; content: string }[];
  externalFieldToItemId?: Record<string, string>;
}): SlimefunPackPayload {
  const { modNamespace, packId, packName, version, javaFiles, externalFieldToItemId } = options;

  const headTextures: Record<string, string> = {};
  const fieldToItemId: Record<string, string> = { ...(externalFieldToItemId ?? {}) };
  const itemsById = new Map<string, ItemDef>();
  const recipes: RecipeDef[] = [];
  const seenRecipeKeys = new Set<string>();

  const cleanFiles = javaFiles.map((f) => ({
    path: f.path,
    content: stripJavaComments(f.content),
  }));

  // Pass 1: Extract HeadTexture / Skull enums
  for (const file of cleanFiles) {
    const headEnumRegex = /\b([A-Z0-9_]+)\s*\(\s*"([A-Za-z0-9+/=]{32,})"\s*\)/g;
    let m: RegExpExecArray | null;
    while ((m = headEnumRegex.exec(file.content)) !== null) {
      const hash = extractHashFromBase64OrHex(m[2]);
      if (hash) {
        headTextures[m[1]] = hash;
      }
    }
  }

  // Pass 2: Extract SlimefunItemStack declarations
  for (const file of cleanFiles) {
    const declRegex =
      /\b(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?SlimefunItemStack\s+([A-Z0-9_]+)\s*=\s*new\s+SlimefunItemStack\s*\(/g;
    let m: RegExpExecArray | null;
    while ((m = declRegex.exec(file.content)) !== null) {
      const fieldName = m[1];
      const openIdx = m.index + m[0].length - 1;
      const closeIdx = findMatchingDelimiter(file.content, openIdx, '(', ')');
      if (closeIdx === -1) continue;
      const args = splitTopLevelArgs(file.content.slice(openIdx + 1, closeIdx));
      if (args.length < 2) continue;

      const rawId = resolveJavaStringExpr(args[0]);
      if (!rawId) continue;
      const sfId = rawId.toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
      const fullId = `${modNamespace}:${sfId}`;
      fieldToItemId[fieldName] = fullId;

      let iconUrl: string | undefined;
      let displayName = titleCaseRaw(sfId);
      const arg1 = args[1];

      // Determine icon & display name position across SlimefunItemStack overloads
      const headRef = arg1.match(/HeadTexture\.([A-Z0-9_]+)/);
      const matRef = arg1.match(/Material\.([A-Z0-9_]+)/);
      const strTex = resolveJavaStringExpr(arg1);

      if (headRef && headTextures[headRef[1]]) {
        iconUrl = `/api/icon/head/${headTextures[headRef[1]]}`;
      } else if (strTex) {
        const hash = extractHashFromBase64OrHex(strTex);
        if (hash) iconUrl = `/api/icon/head/${hash}`;
      } else if (matRef) {
        const mcId = materialToMinecraftId(matRef[1]);
        const [, mcName] = mcId.split(':');
        iconUrl = `/api/icon/minecraft/${mcName}`;
      } else if (arg1.includes('Color.')) {
        const colorMatch = arg1.match(/Color\.([A-Z0-9_]+)/);
        const potionType = COLOR_TO_POTION[colorMatch?.[1] ?? ''] ?? 'water';
        iconUrl = `/api/icon/minecraft/potion__${potionType}`;
      }

      // Find display name argument (first string arg after texture/material/potionEffect)
      for (let idx = 2; idx < Math.min(args.length, 5); idx++) {
        const candidate = resolveJavaStringExpr(args[idx]);
        if (candidate && candidate.length > 0 && !candidate.startsWith('LoreBuilder')) {
          const stripped = stripMcColorCodes(candidate);
          if (stripped) {
            displayName = stripped;
            break;
          }
        }
      }

      // If no icon found yet, scan remaining args for Material or HeadTexture
      if (!iconUrl) {
        const joined = args.slice(1, 4).join(' ');
        const fallbackMat = joined.match(/Material\.([A-Z0-9_]+)/);
        if (fallbackMat) {
          const mcId = materialToMinecraftId(fallbackMat[1]);
          iconUrl = `/api/icon/minecraft/${mcId.split(':')[1]}`;
        }
      }

      itemsById.set(fullId, {
        id: fullId,
        name: displayName,
        mod: modNamespace,
        packId,
        category: classifySlimefunItem(sfId, displayName),
        tags: [`#${modNamespace}:items`],
        stackSize: 64,
        rarity: 'common',
        isBlock: false,
        iconUrl,
      });
    }
  }

  // Helper to resolve an ItemStack expression inside a recipe array
  const resolveSlotExpr = (expr: string): { id: string | null; count: number } => {
    const trimmed = expr.trim();
    if (!trimmed || trimmed === 'null') return { id: null, count: 0 };

    // Tag support: new ItemStack(Tag.PLANKS.getValues()...) or Tag.LOGS
    const tagMatch = trimmed.match(/Tag\.([A-Z0-9_]+)/);
    if (tagMatch && BUKKIT_TAG_TO_MC_TAG[tagMatch[1]]) {
      return { id: BUKKIT_TAG_TO_MC_TAG[tagMatch[1]], count: 1 };
    }

    // HeadTexture.<NAME> (e.g. SlimefunUtils.getCustomHead(HeadTexture.IRON_GOLEM.getTexture()))
    const headExprMatch = trimmed.match(/HeadTexture\.([A-Z0-9_]+)/);
    if (headExprMatch) {
      const hName = headExprMatch[1];
      if (hName === 'PIGLIN_HEAD') {
        return { id: 'minecraft:piglin_head', count: 1 };
      }
      const mobItemId = `${modNamespace}:mob_${hName.toLowerCase()}`;
      if (!itemsById.has(mobItemId) && headTextures[hName]) {
        const cleanLabelMatch = trimmed.match(/,\s*"([^"]+)"\s*\)$/);
        const label = cleanLabelMatch
          ? stripMcColorCodes(cleanLabelMatch[1])
          : titleCaseRaw(hName);
        itemsById.set(mobItemId, {
          id: mobItemId,
          name: `${label} (Mob)`,
          mod: modNamespace,
          packId,
          category: 'materials',
          tags: [`#${modNamespace}:mobs`],
          stackSize: 1,
          rarity: 'common',
          isBlock: false,
          iconUrl: `/api/icon/head/${headTextures[hName]}`,
        });
      }
      if (itemsById.has(mobItemId)) {
        return { id: mobItemId, count: 1 };
      }
      return { id: 'minecraft:player_head', count: 1 };
    }

    const extractTrailingCount = (s: string): number => {
      if (s.includes('OrganicFood.OUTPUT') || s.includes('OrganicFertilizer.OUTPUT')) {
        return 2;
      }
      const m = s.match(/,\s*(\d+)\s*\)$/);
      return m ? Math.max(1, Number(m[1])) : 1;
    };

    // new SlimefunItemStack(SlimefunItems.X, count) or SlimefunItems.X
    const sfRef = trimmed.match(/(?:[A-Za-z0-9_]+\.)?([A-Z0-9_]+)(?:\s*,\s*(\d+))?/);
    const allSfRefs = [...trimmed.matchAll(/\b[A-Za-z0-9_]*Items\.([A-Z0-9_]+)/g)];
    if (allSfRefs.length > 0) {
      const field = allSfRefs[0][1];
      const count = extractTrailingCount(trimmed);
      const mapped = fieldToItemId[field] ?? `slimefun:${field.toLowerCase()}`;
      return { id: mapped, count };
    }

    // new ItemStack(Material.X, count) or Material.X
    const matMatch = trimmed.match(/Material\.([A-Z0-9_]+)/);
    if (matMatch) {
      const mcId = materialToMinecraftId(matMatch[1]);
      const countMatch = trimmed.match(/Material\.[A-Z0-9_]+\s*,\s*(\d+)/);
      const count = countMatch ? Math.max(1, Number(countMatch[1])) : extractTrailingCount(trimmed);
      return { id: mcId, count };
    }

    // Direct local field reference e.g. MY_INGOT
    if (/^[A-Z0-9_]+$/.test(trimmed) && fieldToItemId[trimmed]) {
      return { id: fieldToItemId[trimmed], count: 1 };
    }

    if (trimmed.includes('PIGLIN')) {
      return { id: 'minecraft:piglin_head', count: 1 };
    }

    if (sfRef && fieldToItemId[sfRef[1]]) {
      return { id: fieldToItemId[sfRef[1]], count: 1 };
    }

    return { id: null, count: 0 };
  };

  const resolveWorkstation = (rtExpr: string, className = ''): { id: string; label: string; isGrid: boolean } => {
    const rtMatch = rtExpr.match(/RecipeType\.([A-Z0-9_]+)/);
    if (rtMatch && RECIPE_TYPE_WORKSTATIONS[rtMatch[1]]) {
      const key = rtMatch[1];
      const ws = RECIPE_TYPE_WORKSTATIONS[key];
      const isGrid =
        key === 'ENHANCED_CRAFTING_TABLE' ||
        key === 'MAGIC_WORKBENCH' ||
        key === 'ARMOR_FORGE' ||
        key === 'ANCIENT_ALTAR' ||
        key === 'PRESSURE_CHAMBER';
      return { ...ws, isGrid };
    }
    // Custom addon RecipeType (e.g. InfinityWorkbench.TYPE or MyMachine.RECIPE_TYPE)
    const customMatch = rtExpr.match(/([A-Za-z0-9_]+)\.(?:TYPE|RECIPE_TYPE)/);
    if (customMatch) {
      const machineName = customMatch[1]
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();
      const guessedId = `${modNamespace}:${customMatch[1]
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toLowerCase()}`;
      return {
        id: itemsById.has(guessedId) ? guessedId : 'minecraft:crafting_table',
        label: machineName,
        isGrid: true,
      };
    }
    if (className === 'AlloyIngot') {
      return { id: 'slimefun:smeltery', label: 'Smeltery', isGrid: false };
    }
    if (
      className === 'Talisman' ||
      className === 'EnderTalisman' ||
      className === 'ExplosiveBow' ||
      className === 'IcyBow' ||
      className === 'SlimefunBow'
    ) {
      return { id: 'slimefun:magic_workbench', label: 'Magic Workbench', isGrid: true };
    }
    return { id: 'slimefun:enhanced_crafting_table', label: 'Enhanced Crafting Table', isGrid: true };
  };

  // Pass 3: Parse recipe registrations across Java files
  for (const file of cleanFiles) {
    const stmts = file.content.split(/\.register\s*\([^)]*\)\s*;/);
    for (let sIdx = 0; sIdx < stmts.length - 1; sIdx++) {
      const stmt = stmts[sIdx];
      const itemStackArrIdx = stmt.lastIndexOf('new ItemStack[]');
      if (itemStackArrIdx === -1) continue;

      const openBrace = stmt.indexOf('{', itemStackArrIdx);
      if (openBrace === -1) continue;
      const closeBrace = findMatchingDelimiter(stmt, openBrace, '{', '}');
      if (closeBrace === -1) continue;

      // Look backward from new ItemStack[] for the enclosing constructor args
      const beforeArr = stmt.slice(0, itemStackArrIdx);
      const lastNewIdx = beforeArr.lastIndexOf('new ');
      if (lastNewIdx === -1) continue;
      const classMatch = beforeArr.slice(lastNewIdx + 4).match(/^([A-Za-z0-9_]+)/);
      const className = classMatch ? classMatch[1] : '';
      const openParen = stmt.indexOf('(', lastNewIdx);
      if (openParen === -1 || openParen > itemStackArrIdx) continue;
      const closeParen = findMatchingDelimiter(stmt, openParen, '(', ')');
      if (closeParen === -1) continue;

      const ctorArgs = splitTopLevelArgs(stmt.slice(openParen + 1, closeParen));
      const arrArgIdx = ctorArgs.findIndex((a) => a.includes('new ItemStack[]'));
      if (arrArgIdx < 1) continue;

      // Determine whether arg right before new ItemStack[] is a RecipeType
      const prevArg = ctorArgs[arrArgIdx - 1];
      const hasExplicitRecipeType =
        /RecipeType\.[A-Z0-9_]+/.test(prevArg) ||
        /[A-Za-z0-9_]+\.(?:TYPE|RECIPE_TYPE)/.test(prevArg);

      let itemArg = prevArg;
      let recipeTypeArg = '';
      if (hasExplicitRecipeType) {
        if (arrArgIdx < 2) continue;
        recipeTypeArg = prevArg;
        itemArg = ctorArgs[arrArgIdx - 2];
      }

      let outputId: string | null = null;
      let outputCount = 1;

      const inlineSf = itemArg.match(/new\s+SlimefunItemStack\s*\(\s*"([^"]+)"/);
      if (inlineSf) {
        const sfId = inlineSf[1].toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
        outputId = `${modNamespace}:${sfId}`;
        if (!itemsById.has(outputId)) {
          const innerOpen = itemArg.indexOf('(');
          const innerClose = findMatchingDelimiter(itemArg, innerOpen, '(', ')');
          const innerArgs =
            innerClose !== -1 ? splitTopLevelArgs(itemArg.slice(innerOpen + 1, innerClose)) : [];
          let name = titleCaseRaw(sfId);
          let iconUrl: string | undefined;
          const matM = itemArg.match(/Material\.([A-Z0-9_]+)/);
          if (matM) iconUrl = `/api/icon/minecraft/${materialToMinecraftId(matM[1]).split(':')[1]}`;
          for (let i = 2; i < innerArgs.length; i++) {
            const s = resolveJavaStringExpr(innerArgs[i]);
            if (s) {
              name = stripMcColorCodes(s) || name;
              break;
            }
          }
          itemsById.set(outputId, {
            id: outputId,
            name,
            mod: modNamespace,
            packId,
            category: classifySlimefunItem(sfId, name),
            tags: [`#${modNamespace}:items`],
            stackSize: 64,
            rarity: 'common',
            isBlock: false,
            iconUrl,
          });
        }
      } else {
        const outResolved = resolveSlotExpr(itemArg);
        outputId = outResolved.id;
      }

      if (!outputId) continue;

      // Check arg immediately after recipe array for explicit recipeOutput
      if (arrArgIdx + 1 < ctorArgs.length) {
        const outArg = ctorArgs[arrArgIdx + 1];
        const countM = outArg.match(/,\s*(\d+)\s*\)$/);
        if (countM) {
          outputCount = Math.max(1, Number(countM[1]));
        }
      }

      const workstation = resolveWorkstation(recipeTypeArg, className);
      const arrContent = stmt.slice(openBrace + 1, closeBrace);
      const rawSlots = splitTopLevelArgs(arrContent);

      const grid: RecipeSlot[] = Array(9).fill(null);
      const ingMap = new Map<string, IngredientReq>();
      for (let i = 0; i < Math.min(9, rawSlots.length); i++) {
        const slotRes = resolveSlotExpr(rawSlots[i]);
        if (slotRes.id) {
          grid[i] = slotRes.id;
          addIng(ingMap, [slotRes.id], slotRes.count);
        }
      }

      if (ingMap.size === 0) continue;

      const sig = `${outputId}__${workstation.id}__${outputCount}__${Array.from(ingMap.values())
        .map((g) => `${g.id}x${g.count}`)
        .join(',')}`;
      if (seenRecipeKeys.has(sig)) continue;
      seenRecipeKeys.add(sig);

      recipes.push({
        id: `${packId}:r_${recipes.length}`,
        packId,
        type: 'slimefun',
        customTypeLabel: workstation.label,
        workstationId: workstation.id,
        outputId,
        outputCount,
        grid: workstation.isGrid ? grid : undefined,
        ingredients: Array.from(ingMap.values()),
      });

      // PostSetup equivalents: Smeltery alloys -> Electric Smeltery; Dust smelts -> Electric Ingot Factory / Makeshift Smeltery
      if (workstation.id === 'slimefun:smeltery') {
        const ings = Array.from(ingMap.values());
        if (ings.length === 1 && ings[0].count === 1 && ings[0].id.endsWith('_dust')) {
          const dustId = ings[0].id;
          for (const eq of [
            { id: 'slimefun:electric_ingot_factory', label: 'Electric Ingot Factory', sec: 8 },
            { id: 'slimefun:makeshift_smeltery', label: 'Makeshift Smeltery', sec: undefined },
          ]) {
            const eqSig = `${outputId}__${eq.id}__${dustId}`;
            if (!seenRecipeKeys.has(eqSig)) {
              seenRecipeKeys.add(eqSig);
              recipes.push({
                id: `${packId}:r_${recipes.length}`,
                packId,
                type: 'slimefun',
                customTypeLabel: eq.label,
                workstationId: eq.id,
                outputId,
                outputCount,
                cookTimeSec: eq.sec,
                note: 'Electric equivalent',
                ingredients: [{ id: dustId, choices: [dustId], count: 1 }],
              });
            }
          }
          // Reverse: Electric Ingot Pulverizer (Ingot -> Dust)
          const revSig = `${dustId}__slimefun:electric_ingot_pulverizer__${outputId}`;
          if (!seenRecipeKeys.has(revSig)) {
            seenRecipeKeys.add(revSig);
            recipes.push({
              id: `${packId}:r_${recipes.length}`,
              packId,
              type: 'slimefun',
              customTypeLabel: 'Electric Ingot Pulverizer',
              workstationId: 'slimefun:electric_ingot_pulverizer',
              outputId: dustId,
              outputCount: 1,
              cookTimeSec: 3,
              note: 'Pulverizes ingot back to dust',
              ingredients: [{ id: outputId, choices: [outputId], count: 1 }],
            });
          }
        } else {
          const esSig = `${outputId}__slimefun:electric_smeltery__${ings.map((g) => `${g.id}x${g.count}`).join(',')}`;
          if (!seenRecipeKeys.has(esSig)) {
            seenRecipeKeys.add(esSig);
            recipes.push({
              id: `${packId}:r_${recipes.length}`,
              packId,
              type: 'slimefun',
              customTypeLabel: 'Electric Smeltery',
              workstationId: 'slimefun:electric_smeltery',
              outputId,
              outputCount,
              cookTimeSec: 12,
              note: 'Electric equivalent',
              ingredients: ings,
            });
          }
        }
      } else if (
        workstation.id === 'slimefun:ore_crusher' ||
        workstation.id === 'slimefun:grind_stone'
      ) {
        const ings = Array.from(ingMap.values());
        const egSig = `${outputId}__slimefun:electric_ore_grinder__${ings.map((g) => `${g.id}x${g.count}`).join(',')}`;
        if (!seenRecipeKeys.has(egSig)) {
          seenRecipeKeys.add(egSig);
          recipes.push({
            id: `${packId}:r_${recipes.length}`,
            packId,
            type: 'slimefun',
            customTypeLabel: 'Electric Ore Grinder',
            workstationId: 'slimefun:electric_ore_grinder',
            outputId,
            outputCount,
            cookTimeSec: 4,
            note: 'Electric equivalent',
            ingredients: ings,
          });
        }
      } else if (workstation.id === 'slimefun:ore_washer') {
        const ings = Array.from(ingMap.values());
        const dwSig = `${outputId}__slimefun:electric_dust_washer__${ings.map((g) => `${g.id}x${g.count}`).join(',')}`;
        if (!seenRecipeKeys.has(dwSig)) {
          seenRecipeKeys.add(dwSig);
          recipes.push({
            id: `${packId}:r_${recipes.length}`,
            packId,
            type: 'slimefun',
            customTypeLabel: 'Electric Dust Washer',
            workstationId: 'slimefun:electric_dust_washer',
            outputId,
            outputCount,
            cookTimeSec: 4,
            note: 'Electric equivalent',
            ingredients: ings,
          });
        }
      }
    }

    // Handle SlimefunItemSetup.registerArmorSet(...) helper calls
    const armorRegex = /registerArmorSet\s*\(/g;
    let am: RegExpExecArray | null;
    while ((am = armorRegex.exec(file.content)) !== null) {
      const openP = am.index + am[0].length - 1;
      const closeP = findMatchingDelimiter(file.content, openP, '(', ')');
      if (closeP === -1) continue;
      const args = splitTopLevelArgs(file.content.slice(openP + 1, closeP));
      if (args.length < 4) continue;
      const baseRes = resolveSlotExpr(args[1]);
      const idPrefix = resolveJavaStringExpr(args[3]);
      if (!baseRes.id || !idPrefix) continue;

      const pieces = [
        {
          suffix: '_HELMET',
          grid: [baseRes.id, baseRes.id, baseRes.id, baseRes.id, null, baseRes.id, null, null, null],
          count: 5,
        },
        {
          suffix: '_CHESTPLATE',
          grid: [baseRes.id, null, baseRes.id, baseRes.id, baseRes.id, baseRes.id, baseRes.id, baseRes.id, baseRes.id],
          count: 8,
        },
        {
          suffix: '_LEGGINGS',
          grid: [baseRes.id, baseRes.id, baseRes.id, baseRes.id, null, baseRes.id, baseRes.id, null, baseRes.id],
          count: 7,
        },
        {
          suffix: '_BOOTS',
          grid: [null, null, null, baseRes.id, null, baseRes.id, baseRes.id, null, baseRes.id],
          count: 4,
        },
      ];

      for (const piece of pieces) {
        const outId = `${modNamespace}:${idPrefix.toLowerCase()}${piece.suffix.toLowerCase()}`;
        if (!itemsById.has(outId)) continue;
        recipes.push({
          id: `${packId}:armor_${outId}`,
          packId,
          type: 'slimefun',
          customTypeLabel: 'Armor Forge',
          workstationId: 'slimefun:armor_forge',
          outputId: outId,
          outputCount: 1,
          grid: piece.grid,
          ingredients: [{ id: baseRes.id, choices: [baseRes.id], count: piece.count }],
        });
      }
    }
  }

  // Pass 4: Extract machine-internal recipes (registerRecipe / addRecipe / recipes.add pairs / GoldPanDrop)
  for (const file of cleanFiles) {
    const fileBase = file.path.split('/').pop()?.replace(/\.java$/, '') || '';
    const machineWorkstations: Record<string, { id: string; label: string; elecId?: string; elecLabel?: string; elecSec?: number }> = {
      CarbonPress: { id: 'slimefun:carbon_press', label: 'Carbon Press' },
      ElectricFurnace: { id: 'slimefun:electric_furnace', label: 'Electric Furnace' },
      ElectricOreGrinder: { id: 'slimefun:electric_ore_grinder', label: 'Electric Ore Grinder' },
      ElectricDustWasher: { id: 'slimefun:electric_dust_washer', label: 'Electric Dust Washer' },
      ElectricIngotFactory: { id: 'slimefun:electric_ingot_factory', label: 'Electric Ingot Factory' },
      ElectricIngotPulverizer: { id: 'slimefun:electric_ingot_pulverizer', label: 'Electric Ingot Pulverizer' },
      ElectricPress: { id: 'slimefun:electric_press', label: 'Electric Press' },
      ElectricSmeltery: { id: 'slimefun:electric_smeltery', label: 'Electric Smeltery' },
      ElectrifiedCrucible: { id: 'slimefun:electrified_crucible', label: 'Electrified Crucible' },
      FluidPump: { id: 'slimefun:fluid_pump', label: 'Fluid Pump' },
      FoodComposter: { id: 'slimefun:food_composter', label: 'Food Composter' },
      FoodFabricator: { id: 'slimefun:food_fabricator', label: 'Food Fabricator' },
      Freezer: { id: 'slimefun:freezer', label: 'Freezer' },
      HeatedPressureChamber: { id: 'slimefun:heated_pressure_chamber', label: 'Heated Pressure Chamber' },
      Refinery: { id: 'slimefun:refinery', label: 'Oil Refinery' },
      AutoDrier: { id: 'slimefun:auto_drier', label: 'Auto Drier' },
      GrindStone: { id: 'slimefun:grind_stone', label: 'Grind Stone', elecId: 'slimefun:electric_ore_grinder', elecLabel: 'Electric Ore Grinder', elecSec: 4 },
      Compressor: { id: 'slimefun:compressor', label: 'Compressor' },
      OreCrusher: { id: 'slimefun:ore_crusher', label: 'Ore Crusher', elecId: 'slimefun:electric_ore_grinder', elecLabel: 'Electric Ore Grinder', elecSec: 4 },
      OreWasher: { id: 'slimefun:ore_washer', label: 'Ore Washer', elecId: 'slimefun:electric_dust_washer', elecLabel: 'Electric Dust Washer', elecSec: 4 },
      PressureChamber: { id: 'slimefun:pressure_chamber', label: 'Pressure Chamber' },
      Smeltery: { id: 'slimefun:smeltery', label: 'Smeltery' },
      GoldPan: { id: 'slimefun:gold_pan', label: 'Gold Pan', elecId: 'slimefun:electric_gold_pan', elecLabel: 'Electric Gold Pan', elecSec: 6 },
      NetherGoldPan: { id: 'slimefun:nether_gold_pan', label: 'Nether Gold Pan', elecId: 'slimefun:electric_gold_pan', elecLabel: 'Electric Gold Pan', elecSec: 6 },
    };

    const ws = machineWorkstations[fileBase];
    if (!ws) continue;

    const addMachineRecipe = (
      inputs: IngredientReq[],
      outputId: string,
      outputCount: number,
      cookTimeSec?: number,
      note?: string
    ) => {
      if (inputs.length === 0 || !outputId) return;
      const pushOne = (wId: string, wLabel: string, sec?: number, n?: string) => {
        const sig = `${outputId}__${wId}__${outputCount}__${inputs.map((i) => `${i.id}x${i.count}`).join(',')}`;
        if (seenRecipeKeys.has(sig)) return;
        seenRecipeKeys.add(sig);
        recipes.push({
          id: `${packId}:m_${recipes.length}`,
          packId,
          type: 'slimefun',
          customTypeLabel: wLabel,
          workstationId: wId,
          outputId,
          outputCount,
          cookTimeSec: sec,
          note: n,
          ingredients: inputs,
        });
      };

      pushOne(ws.id, ws.label, cookTimeSec, note);
      if (ws.elecId && ws.elecLabel) {
        pushOne(ws.elecId, ws.elecLabel, ws.elecSec, 'Electric equivalent');
      }
      if (fileBase === 'GoldPan' || fileBase === 'NetherGoldPan') {
        pushOne('slimefun:automated_panning_machine', 'Automated Panning Machine', undefined, 'Multiblock equivalent');
      }
    };

    const parseItemExprList = (expr: string): { id: string; count: number }[] => {
      const trimmed = expr.trim();
      if (trimmed.startsWith('new ItemStack[]')) {
        const ob = trimmed.indexOf('{');
        const cb = findMatchingDelimiter(trimmed, ob, '{', '}');
        if (ob !== -1 && cb !== -1) {
          return splitTopLevelArgs(trimmed.slice(ob + 1, cb))
            .map((e) => resolveSlotExpr(e))
            .filter((x): x is { id: string; count: number } => Boolean(x.id));
        }
      }
      const single = resolveSlotExpr(trimmed);
      return single.id ? [{ id: single.id, count: single.count }] : [];
    };

    // 4a. registerRecipe(sec, inputs, outputs) and addRecipe(sec, in, out)
    const regRecRegex = /\b(?:registerRecipe|addRecipe)\s*\(/g;
    let rm: RegExpExecArray | null;
    while ((rm = regRecRegex.exec(file.content)) !== null) {
      const openP = rm.index + rm[0].length - 1;
      const closeP = findMatchingDelimiter(file.content, openP, '(', ')');
      if (closeP === -1) continue;
      const args = splitTopLevelArgs(file.content.slice(openP + 1, closeP));
      if (args.length < 3 || !/^\d+$/.test(args[0].trim())) continue;
      const sec = Number(args[0].trim());
      const ins = parseItemExprList(args[1]);
      const outs = parseItemExprList(args[2]);
      if (ins.length === 0 || outs.length === 0) continue;
      const ingMap = new Map<string, IngredientReq>();
      for (const item of ins) addIng(ingMap, [item.id], item.count);
      const out = outs[0];
      addMachineRecipe(Array.from(ingMap.values()), out.id, out.count, sec);
    }

    // 4b. recipes.add(in); recipes.add(out); (Multiblocks & AutoDrier)
    const defStart = file.content.indexOf('registerDefaultRecipes');
    if (defStart !== -1) {
      const braceStart = file.content.indexOf('{', defStart);
      const braceEnd = braceStart !== -1 ? findMatchingDelimiter(file.content, braceStart, '{', '}') : -1;
      if (braceStart !== -1 && braceEnd !== -1) {
        const body = file.content.slice(braceStart + 1, braceEnd);
        const addCalls: { id: string; count: number }[] = [];
        const addRegex = /\b(?:recipes|recipeList)\.add\s*\(/g;
        let adm: RegExpExecArray | null;
        while ((adm = addRegex.exec(body)) !== null) {
          const op = adm.index + adm[0].length - 1;
          const cp = findMatchingDelimiter(body, op, '(', ')');
          if (cp === -1) continue;
          const parsed = resolveSlotExpr(body.slice(op + 1, cp));
          if (parsed.id) addCalls.push({ id: parsed.id, count: parsed.count });
        }
        for (let i = 0; i + 1 < addCalls.length; i += 2) {
          const inp = addCalls[i];
          const outp = addCalls[i + 1];
          addMachineRecipe(
            [{ id: inp.id, choices: [inp.id], count: inp.count }],
            outp.id,
            outp.count,
            fileBase === 'AutoDrier' ? 6 : undefined
          );
        }
      }
    }

    // 4c. GoldPanDrop(this, "chance.X", weight, output)
    if (fileBase === 'GoldPan' || fileBase === 'NetherGoldPan') {
      const inputId = fileBase === 'NetherGoldPan' ? 'minecraft:soul_sand' : 'minecraft:gravel';
      const gpRegex = /new\s+GoldPanDrop\s*\(/g;
      let gm: RegExpExecArray | null;
      while ((gm = gpRegex.exec(file.content)) !== null) {
        const op = gm.index + gm[0].length - 1;
        const cp = findMatchingDelimiter(file.content, op, '(', ')');
        if (cp === -1) continue;
        const args = splitTopLevelArgs(file.content.slice(op + 1, cp));
        if (args.length < 4) continue;
        const weight = args[2].trim();
        const out = resolveSlotExpr(args[3]);
        if (!out.id) continue;
        addMachineRecipe(
          [{ id: inputId, choices: [inputId], count: 1 }],
          out.id,
          out.count,
          undefined,
          `Drop weight ${weight}`
        );
      }
    }
  }

  return {
    id: packId,
    name: packName,
    version,
    items: Array.from(itemsById.values()),
    recipes,
    tags: {},
    fieldToItemId,
  };
}

export async function buildSlimefunCorePack(): Promise<SlimefunPackPayload> {
  const machineFiles = [
    'implementation/items/electric/machines/CarbonPress.java',
    'implementation/items/electric/machines/ElectricFurnace.java',
    'implementation/items/electric/machines/ElectricIngotPulverizer.java',
    'implementation/items/electric/machines/ElectricPress.java',
    'implementation/items/electric/machines/ElectrifiedCrucible.java',
    'implementation/items/electric/machines/FluidPump.java',
    'implementation/items/electric/machines/FoodComposter.java',
    'implementation/items/electric/machines/FoodFabricator.java',
    'implementation/items/electric/machines/Freezer.java',
    'implementation/items/electric/machines/HeatedPressureChamber.java',
    'implementation/items/electric/machines/Refinery.java',
    'implementation/items/electric/machines/AutoDrier.java',
    'implementation/items/multiblocks/GrindStone.java',
    'implementation/items/multiblocks/Compressor.java',
    'implementation/items/multiblocks/OreCrusher.java',
    'implementation/items/multiblocks/OreWasher.java',
    'implementation/items/multiblocks/PressureChamber.java',
    'implementation/items/multiblocks/Smeltery.java',
    'implementation/items/tools/GoldPan.java',
    'implementation/items/tools/NetherGoldPan.java',
  ];

  const [itemsTxt, setupTxt, headTxt, ...machineContents] = await Promise.all([
    fetch(`${SLIMEFUN_GITHUB_BASE}/implementation/SlimefunItems.java`).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch SlimefunItems.java: ${r.status}`);
      return r.text();
    }),
    fetch(`${SLIMEFUN_GITHUB_BASE}/implementation/setup/SlimefunItemSetup.java`).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch SlimefunItemSetup.java: ${r.status}`);
      return r.text();
    }),
    fetch(`${SLIMEFUN_GITHUB_BASE}/utils/HeadTexture.java`).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch HeadTexture.java: ${r.status}`);
      return r.text();
    }),
    ...machineFiles.map((relPath) =>
      fetch(`${SLIMEFUN_GITHUB_BASE}/${relPath}`)
        .then((r) => (r.ok ? r.text() : ''))
        .catch(() => '')
    ),
  ]);

  const parsed = parseSlimefunJavaSource({
    modNamespace: 'slimefun',
    packId: 'slimefun4-core',
    packName: 'Slimefun4 Core',
    version: 'RC-37',
    javaFiles: [
      { path: 'HeadTexture.java', content: headTxt },
      { path: 'SlimefunItems.java', content: itemsTxt },
      { path: 'SlimefunItemSetup.java', content: setupTxt },
      ...machineFiles
        .map((relPath, idx) => ({ path: relPath, content: machineContents[idx] }))
        .filter((f) => f.content.length > 0),
    ],
  });

  // Add official Slimefun4 GEO Resources (GEO Miner / Oil Pump)
  const geoEntries: Array<{ outputId: string; workstationId: string; label: string; note: string }> = [
    {
      outputId: 'slimefun:bucket_of_oil',
      workstationId: 'slimefun:oil_pump',
      label: 'Oil Pump',
      note: 'Requires GEO Scan + Empty Bucket',
    },
    {
      outputId: 'slimefun:uranium',
      workstationId: 'slimefun:geo_miner',
      label: 'GEO Miner',
      note: 'Extracted from scanned chunks',
    },
    {
      outputId: 'slimefun:salt',
      workstationId: 'slimefun:geo_miner',
      label: 'GEO Miner',
      note: 'Extracted from Ocean/Beach chunks',
    },
    {
      outputId: 'slimefun:nether_ice',
      workstationId: 'slimefun:geo_miner',
      label: 'GEO Miner',
      note: 'Extracted from Nether chunks',
    },
  ];
  const parsedItemIds = new Set(parsed.items.map((i) => i.id));
  for (const geo of geoEntries) {
    if (!parsedItemIds.has(geo.outputId)) continue;
    const ingId =
      geo.outputId === 'slimefun:bucket_of_oil' ? 'minecraft:bucket' : geo.workstationId;
    parsed.recipes.push({
      id: `slimefun4-core:geo_${geo.outputId.replace('slimefun:', '')}`,
      packId: 'slimefun4-core',
      type: 'slimefun',
      customTypeLabel: geo.label,
      workstationId: geo.workstationId,
      outputId: geo.outputId,
      outputCount: 1,
      note: geo.note,
      ingredients: [{ id: ingId, choices: [ingId], count: 1 }],
    });
  }

  // Add official Slimefun4 Multiblock structure recipes for core workstations
  const multiblocks: Array<{
    outputId: string;
    grid: RecipeSlot[];
    ingredients: IngredientReq[];
    note: string;
  }> = [
    {
      outputId: 'slimefun:enhanced_crafting_table',
      grid: [
        null, null, null,
        null, 'minecraft:crafting_table', null,
        null, 'minecraft:dispenser', null,
      ],
      ingredients: [
        { id: 'minecraft:crafting_table', choices: ['minecraft:crafting_table'], count: 1 },
        { id: 'minecraft:dispenser', choices: ['minecraft:dispenser'], count: 1 },
      ],
      note: 'Build in world (Crafting Table above Dispenser)',
    },
    {
      outputId: 'slimefun:grind_stone',
      grid: [
        null, null, null,
        null, 'minecraft:oak_fence', null,
        null, 'minecraft:dispenser', null,
      ],
      ingredients: [
        { id: '#minecraft:fences', choices: ['#minecraft:fences'], count: 1 },
        { id: 'minecraft:dispenser', choices: ['minecraft:dispenser'], count: 1 },
      ],
      note: 'Build in world (Fence above Dispenser)',
    },
    {
      outputId: 'slimefun:armor_forge',
      grid: [
        null, null, null,
        null, 'minecraft:anvil', null,
        null, 'minecraft:dispenser', null,
      ],
      ingredients: [
        { id: 'minecraft:anvil', choices: ['minecraft:anvil'], count: 1 },
        { id: 'minecraft:dispenser', choices: ['minecraft:dispenser'], count: 1 },
      ],
      note: 'Build in world (Anvil above Dispenser)',
    },
    {
      outputId: 'slimefun:ore_crusher',
      grid: [
        null, null, null,
        null, 'minecraft:nether_brick_fence', null,
        'minecraft:iron_bars', 'minecraft:dispenser', 'minecraft:iron_bars',
      ],
      ingredients: [
        { id: 'minecraft:nether_brick_fence', choices: ['minecraft:nether_brick_fence'], count: 1 },
        { id: 'minecraft:iron_bars', choices: ['minecraft:iron_bars'], count: 2 },
        { id: 'minecraft:dispenser', choices: ['minecraft:dispenser'], count: 1 },
      ],
      note: 'Build in world (Multiblock)',
    },
    {
      outputId: 'slimefun:compressor',
      grid: [
        null, null, null,
        null, 'minecraft:nether_brick_fence', null,
        'minecraft:piston', 'minecraft:dispenser', 'minecraft:piston',
      ],
      ingredients: [
        { id: 'minecraft:nether_brick_fence', choices: ['minecraft:nether_brick_fence'], count: 1 },
        { id: 'minecraft:piston', choices: ['minecraft:piston'], count: 2 },
        { id: 'minecraft:dispenser', choices: ['minecraft:dispenser'], count: 1 },
      ],
      note: 'Build in world (Multiblock)',
    },
    {
      outputId: 'slimefun:smeltery',
      grid: [
        null, 'minecraft:nether_brick_fence', null,
        'minecraft:nether_bricks', 'minecraft:dispenser', 'minecraft:nether_bricks',
        'minecraft:nether_bricks', 'minecraft:flint_and_steel', 'minecraft:nether_bricks',
      ],
      ingredients: [
        { id: 'minecraft:nether_brick_fence', choices: ['minecraft:nether_brick_fence'], count: 1 },
        { id: 'minecraft:nether_bricks', choices: ['minecraft:nether_bricks'], count: 4 },
        { id: 'minecraft:dispenser', choices: ['minecraft:dispenser'], count: 1 },
        { id: 'minecraft:flint_and_steel', choices: ['minecraft:flint_and_steel'], count: 1 },
      ],
      note: 'Build in world (Fire inside Nether Bricks)',
    },
    {
      outputId: 'slimefun:magic_workbench',
      grid: [
        null, null, null,
        null, null, null,
        'minecraft:bookshelf', 'minecraft:crafting_table', 'minecraft:dispenser',
      ],
      ingredients: [
        { id: 'minecraft:bookshelf', choices: ['minecraft:bookshelf'], count: 1 },
        { id: 'minecraft:crafting_table', choices: ['minecraft:crafting_table'], count: 1 },
        { id: 'minecraft:dispenser', choices: ['minecraft:dispenser'], count: 1 },
      ],
      note: 'Build in world (Bookshelf + Crafting Table + Dispenser)',
    },
    {
      outputId: 'slimefun:ore_washer',
      grid: [
        null, null, null,
        null, 'minecraft:oak_fence', null,
        null, 'minecraft:cauldron', null,
      ],
      ingredients: [
        { id: '#minecraft:fences', choices: ['#minecraft:fences'], count: 1 },
        { id: 'minecraft:cauldron', choices: ['minecraft:cauldron'], count: 1 },
      ],
      note: 'Build in world (Dispenser + Fence + Cauldron)',
    },
    {
      outputId: 'slimefun:juicer',
      grid: [
        null, 'minecraft:glass', null,
        null, 'minecraft:nether_brick_fence', null,
        null, 'minecraft:dispenser', null,
      ],
      ingredients: [
        { id: 'minecraft:glass', choices: ['minecraft:glass'], count: 1 },
        { id: 'minecraft:nether_brick_fence', choices: ['minecraft:nether_brick_fence'], count: 1 },
        { id: 'minecraft:dispenser', choices: ['minecraft:dispenser'], count: 1 },
      ],
      note: 'Build in world (Multiblock)',
    },
    {
      outputId: 'slimefun:pressure_chamber',
      grid: [
        'minecraft:smooth_stone_slab', 'minecraft:nether_brick_fence', 'minecraft:smooth_stone_slab',
        'minecraft:piston', 'minecraft:glass', 'minecraft:piston',
        'minecraft:piston', 'minecraft:cauldron', 'minecraft:piston',
      ],
      ingredients: [
        { id: 'minecraft:smooth_stone_slab', choices: ['minecraft:smooth_stone_slab'], count: 2 },
        { id: 'minecraft:nether_brick_fence', choices: ['minecraft:nether_brick_fence'], count: 1 },
        { id: 'minecraft:piston', choices: ['minecraft:piston'], count: 4 },
        { id: 'minecraft:glass', choices: ['minecraft:glass'], count: 1 },
        { id: 'minecraft:cauldron', choices: ['minecraft:cauldron'], count: 1 },
      ],
      note: 'Build in world (Multiblock)',
    },
    {
      outputId: 'slimefun:ancient_altar',
      grid: [
        'slimefun:ancient_pedestal', 'minecraft:stone_brick_stairs', 'slimefun:ancient_pedestal',
        'minecraft:stone_brick_stairs', 'minecraft:enchanting_table', 'minecraft:stone_brick_stairs',
        'slimefun:ancient_pedestal', 'minecraft:stone_brick_stairs', 'slimefun:ancient_pedestal',
      ],
      ingredients: [
        { id: 'slimefun:ancient_pedestal', choices: ['slimefun:ancient_pedestal'], count: 4 },
        { id: 'minecraft:stone_brick_stairs', choices: ['minecraft:stone_brick_stairs'], count: 4 },
        { id: 'minecraft:enchanting_table', choices: ['minecraft:enchanting_table'], count: 1 },
      ],
      note: 'Build in world (Enchanting Table + 4 Pedestals)',
    },
    {
      outputId: 'slimefun:makeshift_smeltery',
      grid: [
        null, 'minecraft:oak_fence', null,
        'minecraft:bricks', 'minecraft:dispenser', 'minecraft:bricks',
        null, 'minecraft:flint_and_steel', null,
      ],
      ingredients: [
        { id: '#minecraft:fences', choices: ['#minecraft:fences'], count: 1 },
        { id: 'minecraft:bricks', choices: ['minecraft:bricks'], count: 2 },
        { id: 'minecraft:dispenser', choices: ['minecraft:dispenser'], count: 1 },
        { id: 'minecraft:flint_and_steel', choices: ['minecraft:flint_and_steel'], count: 1 },
      ],
      note: 'Build in world (Multiblock)',
    },
    {
      outputId: 'slimefun:table_saw',
      grid: [
        null, null, null,
        'minecraft:smooth_stone_slab', 'minecraft:stonecutter', 'minecraft:smooth_stone_slab',
        null, 'minecraft:iron_block', null,
      ],
      ingredients: [
        { id: 'minecraft:smooth_stone_slab', choices: ['minecraft:smooth_stone_slab'], count: 2 },
        { id: 'minecraft:stonecutter', choices: ['minecraft:stonecutter'], count: 1 },
        { id: 'minecraft:iron_block', choices: ['minecraft:iron_block'], count: 1 },
      ],
      note: 'Build in world (Multiblock)',
    },
    {
      outputId: 'slimefun:automated_panning_machine',
      grid: [
        null, null, null,
        null, 'minecraft:oak_trapdoor', null,
        null, 'minecraft:cauldron', null,
      ],
      ingredients: [
        { id: '#minecraft:trapdoors', choices: ['#minecraft:trapdoors'], count: 1 },
        { id: 'minecraft:cauldron', choices: ['minecraft:cauldron'], count: 1 },
      ],
      note: 'Build in world (Trapdoor above Cauldron)',
    },
    {
      outputId: 'slimefun:industrial_miner',
      grid: [
        null, null, null,
        'minecraft:piston', 'minecraft:chest', 'minecraft:piston',
        'minecraft:iron_block', 'minecraft:blast_furnace', 'minecraft:iron_block',
      ],
      ingredients: [
        { id: 'minecraft:piston', choices: ['minecraft:piston'], count: 2 },
        { id: 'minecraft:chest', choices: ['minecraft:chest'], count: 1 },
        { id: 'minecraft:iron_block', choices: ['minecraft:iron_block'], count: 2 },
        { id: 'minecraft:blast_furnace', choices: ['minecraft:blast_furnace'], count: 1 },
      ],
      note: 'Build in world (Multiblock)',
    },
    {
      outputId: 'slimefun:advanced_industrial_miner',
      grid: [
        null, null, null,
        'minecraft:piston', 'minecraft:chest', 'minecraft:piston',
        'minecraft:diamond_block', 'minecraft:blast_furnace', 'minecraft:diamond_block',
      ],
      ingredients: [
        { id: 'minecraft:piston', choices: ['minecraft:piston'], count: 2 },
        { id: 'minecraft:chest', choices: ['minecraft:chest'], count: 1 },
        { id: 'minecraft:diamond_block', choices: ['minecraft:diamond_block'], count: 2 },
        { id: 'minecraft:blast_furnace', choices: ['minecraft:blast_furnace'], count: 1 },
      ],
      note: 'Build in world (Multiblock)',
    },
  ];

  const itemIds = new Set(parsed.items.map((i) => i.id));
  for (const mb of multiblocks) {
    if (!itemIds.has(mb.outputId)) continue;
    parsed.recipes.push({
      id: `slimefun4-core:mb_${mb.outputId.replace('slimefun:', '')}`,
      packId: 'slimefun4-core',
      type: 'slimefun',
      customTypeLabel: 'Multiblock Structure',
      workstationId: 'minecraft:crafting_table',
      outputId: mb.outputId,
      outputCount: 1,
      grid: mb.grid,
      ingredients: mb.ingredients,
      note: mb.note,
    });
  }

  return parsed;
}

export async function importSlimefunFromGithubRepo(
  repoInput: string,
  coreFieldToItemId: Record<string, string>
): Promise<SlimefunPackPayload> {
  // Strictly allow only github.com/<owner>/<repo> or <owner>/<repo> (SSRF protection)
  const clean = repoInput
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
  const parts = clean.split('/');
  if (parts.length < 2 || !/^[a-z0-9_.-]+$/i.test(parts[0]) || !/^[a-z0-9_.-]+$/i.test(parts[1])) {
    throw new Error('Masukkan link GitHub valid, contoh: Mooy1/InfinityExpansion');
  }
  const owner = parts[0];
  const repo = parts[1];

  const branchCandidates: string[] = [];
  try {
    const repoMetaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'User-Agent': 'EMI-Web-Slimefun-Importer' },
      signal: AbortSignal.timeout(8000),
    });
    if (repoMetaRes.ok) {
      const meta = (await repoMetaRes.json()) as { default_branch?: string };
      if (meta.default_branch) branchCandidates.push(meta.default_branch);
    }
  } catch {
    // Fall back to standard branches
  }
  for (const fallback of ['master', 'main']) {
    if (!branchCandidates.includes(fallback)) branchCandidates.push(fallback);
  }

  let branch = branchCandidates[0];
  let treeData: { tree?: Array<{ path: string; type: string }> } | null = null;
  for (const candidateBranch of branchCandidates) {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${candidateBranch}?recursive=1`,
      {
        headers: { 'User-Agent': 'EMI-Web-Slimefun-Importer' },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (res.ok) {
      branch = candidateBranch;
      treeData = (await res.json()) as { tree?: Array<{ path: string; type: string }> };
      break;
    }
  }

  if (!treeData?.tree) {
    throw new Error(`Repositori GitHub ${owner}/${repo} tidak ditemukan atau tidak publik.`);
  }

  const javaPaths = treeData.tree
    .filter((n) => n.type === 'blob' && n.path.endsWith('.java'))
    .map((n) => n.path)
    .slice(0, 120);

  if (javaPaths.length === 0) {
    throw new Error(`Tidak ditemukan file .java di repositori ${owner}/${repo}.`);
  }

  // Fetch plugin.yml or pom.xml for version metadata if present
  let addonVersion = 'GitHub';
  const pluginYml = treeData.tree.find((n) => n.path.endsWith('plugin.yml'));
  if (pluginYml) {
    try {
      const ymlRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${pluginYml.path}`
      );
      if (ymlRes.ok) {
        const ymlText = await ymlRes.text();
        const verM = ymlText.match(/^version:\s*([^\r\n]+)/m);
        if (verM && !verM[1].includes('$')) addonVersion = verM[1].trim();
      }
    } catch {
      // Ignore metadata error
    }
  }

  const fetchedFiles: { path: string; content: string }[] = [];
  const BATCH_SIZE = 12;
  for (let i = 0; i < javaPaths.length; i += BATCH_SIZE) {
    const batch = javaPaths.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (p) => {
        try {
          const r = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${p}`,
            { signal: AbortSignal.timeout(8000) }
          );
          if (!r.ok) return null;
          const content = await r.text();
          if (
            content.includes('SlimefunItemStack') ||
            content.includes('RecipeType') ||
            content.includes('HeadTexture') ||
            content.includes('ItemStack[]')
          ) {
            return { path: p, content };
          }
          return null;
        } catch {
          return null;
        }
      })
    );
    for (const item of results) {
      if (item) fetchedFiles.push(item);
    }
  }

  const modNamespace = repo.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const packId = `sf-gh-${owner.toLowerCase()}-${modNamespace}-${Date.now().toString(36)}`;
  return parseSlimefunJavaSource({
    modNamespace,
    packId,
    packName: repo,
    version: addonVersion,
    javaFiles: fetchedFiles,
    externalFieldToItemId: coreFieldToItemId,
  });
}

// --- JVM Classfile Constant Pool + Bytecode Extractor for Slimefun Plugin .jar Files ---

interface CpEntry {
  tag: number;
  str?: string;
  nameIdx?: number;
  strIdx?: number;
  classIdx?: number;
  nameAndTypeIdx?: number;
}

function parseJvmConstantPool(buf: Buffer): {
  cp: (CpEntry | null)[];
  methodsOffset: number;
} | null {
  if (buf.length < 16 || buf.readUInt32BE(0) !== 0xcafebabe) return null;
  const cpCount = buf.readUInt16BE(8);
  const cp: (CpEntry | null)[] = Array(cpCount).fill(null);
  let off = 10;

  for (let i = 1; i < cpCount; i++) {
    if (off >= buf.length) return null;
    const tag = buf[off++];
    switch (tag) {
      case 1: {
        // Utf8
        const len = buf.readUInt16BE(off);
        off += 2;
        const str = buf.subarray(off, off + len).toString('utf8');
        off += len;
        cp[i] = { tag, str };
        break;
      }
      case 3:
      case 4:
        off += 4;
        cp[i] = { tag };
        break;
      case 5:
      case 6:
        off += 8;
        cp[i] = { tag };
        i++; // 8-byte constants occupy two CP slots
        break;
      case 7:
        cp[i] = { tag, nameIdx: buf.readUInt16BE(off) };
        off += 2;
        break;
      case 8:
        cp[i] = { tag, strIdx: buf.readUInt16BE(off) };
        off += 2;
        break;
      case 9:
      case 10:
      case 11:
        cp[i] = {
          tag,
          classIdx: buf.readUInt16BE(off),
          nameAndTypeIdx: buf.readUInt16BE(off + 2),
        };
        off += 4;
        break;
      case 12:
        cp[i] = {
          tag,
          nameIdx: buf.readUInt16BE(off),
          strIdx: buf.readUInt16BE(off + 2),
        };
        off += 4;
        break;
      case 15:
        off += 3;
        cp[i] = { tag };
        break;
      case 16:
      case 19:
      case 20:
        off += 2;
        cp[i] = { tag };
        break;
      case 17:
      case 18:
        off += 4;
        cp[i] = { tag };
        break;
      default:
        return null;
    }
  }

  // Skip access_flags(2), this_class(2), super_class(2)
  off += 6;
  if (off + 2 > buf.length) return null;
  const ifacesCount = buf.readUInt16BE(off);
  off += 2 + ifacesCount * 2;
  if (off + 2 > buf.length) return null;

  // Skip fields
  const fieldsCount = buf.readUInt16BE(off);
  off += 2;
  for (let f = 0; f < fieldsCount; f++) {
    if (off + 8 > buf.length) return null;
    off += 6;
    const attrCount = buf.readUInt16BE(off);
    off += 2;
    for (let a = 0; a < attrCount; a++) {
      if (off + 6 > buf.length) return null;
      const attrLen = buf.readUInt32BE(off + 2);
      off += 6 + attrLen;
    }
  }

  return { cp, methodsOffset: off };
}

function getCpUtf8(cp: (CpEntry | null)[], idx: number | undefined): string {
  if (!idx) return '';
  return cp[idx]?.str ?? '';
}

function getCpClassName(cp: (CpEntry | null)[], idx: number | undefined): string {
  if (!idx) return '';
  return getCpUtf8(cp, cp[idx]?.nameIdx);
}

function getCpMember(
  cp: (CpEntry | null)[],
  idx: number | undefined
): { cls: string; name: string; desc: string } | null {
  if (!idx) return null;
  const e = cp[idx];
  if (!e?.classIdx || !e?.nameAndTypeIdx) return null;
  const nat = cp[e.nameAndTypeIdx];
  return {
    cls: getCpClassName(cp, e.classIdx),
    name: getCpUtf8(cp, nat?.nameIdx),
    desc: getCpUtf8(cp, nat?.strIdx),
  };
}

export async function parseSlimefunPluginJar(
  jarBuffer: Buffer,
  fileName: string,
  coreFieldToItemId: Record<string, string>
): Promise<SlimefunPackPayload> {
  const zip = await JSZip.loadAsync(jarBuffer);

  let pluginName = fileName.replace(/\.(jar|zip)$/i, '');
  let pluginVersion = 'JAR Plugin';
  const pluginYmlFile = zip.file('plugin.yml') ?? zip.file('paper-plugin.yml');
  if (pluginYmlFile) {
    const yml = await pluginYmlFile.async('string');
    const nameM = yml.match(/^name:\s*['"]?([^'"\r\n]+)/m);
    const verM = yml.match(/^version:\s*['"]?([^'"\r\n]+)/m);
    if (nameM) pluginName = nameM[1].trim();
    if (verM) pluginVersion = verM[1].trim();
  }

  const modNamespace = pluginName.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'slimefun_addon';
  const packId = `sf-jar-${modNamespace}-${Date.now().toString(36)}`;
  const itemsById = new Map<string, ItemDef>();
  const fieldToItemId: Record<string, string> = { ...coreFieldToItemId };
  const recipes: RecipeDef[] = [];

  const classPaths = Object.keys(zip.files).filter(
    (p) => !zip.files[p].dir && p.endsWith('.class')
  );

  // Pass 1: Extract SlimefunItemStack definitions & constants from .class constant pools + bytecode
  const parsedClasses: {
    cp: (CpEntry | null)[];
    buf: Buffer;
    methodsOffset: number;
  }[] = [];

  for (const p of classPaths) {
    try {
      const buf = Buffer.from(await zip.files[p].async('nodebuffer'));
      const parsed = parseJvmConstantPool(buf);
      if (!parsed) continue;

      // Quick check if class references Slimefun
      const hasSfRef = parsed.cp.some(
        (e) =>
          e?.str &&
          (e.str.includes('SlimefunItemStack') ||
            e.str.includes('RecipeType') ||
            e.str.includes('SlimefunItem'))
      );
      if (!hasSfRef) continue;
      parsedClasses.push({ ...parsed, buf });

      const { cp, methodsOffset } = parsed;
      let off = methodsOffset;
      if (off + 2 > buf.length) continue;
      const methodsCount = buf.readUInt16BE(off);
      off += 2;

      for (let m = 0; m < methodsCount; m++) {
        if (off + 8 > buf.length) break;
        off += 6;
        const attrCount = buf.readUInt16BE(off);
        off += 2;
        for (let a = 0; a < attrCount; a++) {
          if (off + 6 > buf.length) break;
          const attrName = getCpUtf8(cp, buf.readUInt16BE(off));
          const attrLen = buf.readUInt32BE(off + 2);
          const attrBody = buf.subarray(off + 6, off + 6 + attrLen);
          off += 6 + attrLen;

          if (attrName === 'Code' && attrBody.length > 8) {
            const codeLen = attrBody.readUInt32BE(4);
            const code = attrBody.subarray(8, 8 + codeLen);
            // Lightweight linear opcode scan for SlimefunItemStack.<init> + putstatic
            type StackToken =
              | { kind: 'str'; val: string }
              | { kind: 'mat'; val: string }
              | { kind: 'sf'; val: string }
              | { kind: 'int'; val: number }
              | { kind: 'null' }
              | { kind: 'arr'; slots: (string | null)[] }
              | { kind: 'other' };

            const stack: StackToken[] = [];
            let pc = 0;
            let lastConstructedId: string | null = null;

            while (pc < code.length) {
              const op = code[pc++];
              if (op === 0x01) {
                stack.push({ kind: 'null' });
              } else if (op >= 0x02 && op <= 0x08) {
                stack.push({ kind: 'int', val: op - 0x03 });
              } else if (op === 0x10) {
                const v = code.readInt8(pc++);
                stack.push({ kind: 'int', val: v });
              } else if (op === 0x11) {
                const v = code.readInt16BE(pc);
                pc += 2;
                stack.push({ kind: 'int', val: v });
              } else if (op === 0x12 || op === 0x13) {
                const cpIdx = op === 0x12 ? code[pc++] : (code.readUInt16BE(pc));
                if (op === 0x13) pc += 2;
                const entry = cp[cpIdx];
                if (entry?.tag === 8) {
                  stack.push({ kind: 'str', val: getCpUtf8(cp, entry.strIdx) });
                } else {
                  stack.push({ kind: 'other' });
                }
              } else if (op === 0xb2) {
                // getstatic
                const mem = getCpMember(cp, code.readUInt16BE(pc));
                pc += 2;
                if (mem?.cls === 'org/bukkit/Material') {
                  stack.push({ kind: 'mat', val: materialToMinecraftId(mem.name) });
                } else if (mem?.cls.endsWith('SlimefunItems') || mem?.desc.includes('SlimefunItemStack')) {
                  const mapped =
                    fieldToItemId[mem.name] ??
                    (coreFieldToItemId[mem.name]
                      ? coreFieldToItemId[mem.name]
                      : `${modNamespace}:${mem.name.toLowerCase()}`);
                  stack.push({ kind: 'sf', val: mapped });
                } else if (mem?.cls.endsWith('RecipeType')) {
                  stack.push({ kind: 'str', val: `RecipeType.${mem.name}` });
                } else {
                  stack.push({ kind: 'other' });
                }
              } else if (op === 0xb3) {
                // putstatic
                const mem = getCpMember(cp, code.readUInt16BE(pc));
                pc += 2;
                const top = stack.pop();
                if (mem && top?.kind === 'sf') {
                  fieldToItemId[mem.name] = top.val;
                } else if (mem && lastConstructedId && mem.desc.includes('SlimefunItemStack')) {
                  fieldToItemId[mem.name] = lastConstructedId;
                }
              } else if (op === 0xbd) {
                // anewarray
                pc += 2;
                stack.pop(); // array size
                stack.push({ kind: 'arr', slots: Array(9).fill(null) });
              } else if (op === 0x59) {
                // dup
                const top = stack[stack.length - 1];
                if (top) stack.push(top);
              } else if (op === 0x53) {
                // aastore: arrayref, index, value
                const val = stack.pop();
                const idx = stack.pop();
                const arr = stack.pop();
                if (arr?.kind === 'arr' && idx?.kind === 'int' && idx.val >= 0 && idx.val < 9) {
                  if (val?.kind === 'sf' || val?.kind === 'mat') {
                    arr.slots[idx.val] = val.val;
                  }
                }
              } else if (op === 0xb7 || op === 0xb8 || op === 0xb6) {
                // invokespecial / invokestatic / invokevirtual
                const mem = getCpMember(cp, code.readUInt16BE(pc));
                pc += 2;
                if (mem?.cls.endsWith('SlimefunItemStack') && mem.name === '<init>') {
                  // Inspect recent tokens on stack for (id, texture/material, displayName)
                  const recent = stack.slice(-8);
                  const strArgs = recent.filter((t): t is { kind: 'str'; val: string } => t.kind === 'str');
                  const matArg = recent.find((t): t is { kind: 'mat'; val: string } => t.kind === 'mat');
                  const rawId = strArgs[0]?.val;
                  if (rawId && /^[A-Z0-9_]{2,}$/.test(rawId)) {
                    const sfId = rawId.toLowerCase();
                    const fullId = `${modNamespace}:${sfId}`;
                    lastConstructedId = fullId;
                    let iconUrl: string | undefined;
                    let displayName = titleCaseRaw(sfId);

                    for (let si = 1; si < strArgs.length; si++) {
                      const hash = extractHashFromBase64OrHex(strArgs[si].val);
                      if (hash && !iconUrl) {
                        iconUrl = `/api/icon/head/${hash}`;
                      } else if (!hash && displayName === titleCaseRaw(sfId)) {
                        const cleaned = stripMcColorCodes(strArgs[si].val);
                        if (cleaned) displayName = cleaned;
                      }
                    }
                    if (!iconUrl && matArg) {
                      iconUrl = `/api/icon/minecraft/${matArg.val.split(':')[1]}`;
                    }

                    if (!itemsById.has(fullId)) {
                      itemsById.set(fullId, {
                        id: fullId,
                        name: displayName,
                        mod: modNamespace,
                        packId,
                        category: classifySlimefunItem(sfId, displayName),
                        tags: [`#${modNamespace}:items`],
                        stackSize: 64,
                        rarity: 'common',
                        isBlock: false,
                        iconUrl,
                      });
                    }
                    stack.push({ kind: 'sf', val: fullId });
                  }
                } else if (mem?.cls === 'org/bukkit/inventory/ItemStack' && mem.name === '<init>') {
                  const top2 = stack.slice(-2);
                  const matTok = top2.find((t): t is { kind: 'mat'; val: string } => t.kind === 'mat');
                  if (matTok) {
                    stack.push({ kind: 'mat', val: matTok.val });
                  }
                } else if (mem?.name === '<init>' && !mem.cls.startsWith('java/')) {
                  // Possible SlimefunItem(..., item, recipeType, ItemStack[] recipe)
                  const recent = stack.slice(-8);
                  const arrTok = [...recent].reverse().find((t): t is { kind: 'arr'; slots: (string | null)[] } => t.kind === 'arr');
                  const sfTok = [...recent].reverse().find((t): t is { kind: 'sf'; val: string } => t.kind === 'sf');
                  const rtTok = [...recent].reverse().find(
                    (t): t is { kind: 'str'; val: string } =>
                      t.kind === 'str' && t.val.startsWith('RecipeType.')
                  );
                  if (arrTok && sfTok && arrTok.slots.some(Boolean)) {
                    const rtKey = rtTok?.val.replace('RecipeType.', '') ?? 'ENHANCED_CRAFTING_TABLE';
                    const ws = RECIPE_TYPE_WORKSTATIONS[rtKey] ?? {
                      id: 'slimefun:enhanced_crafting_table',
                      label: titleCaseRaw(rtKey),
                    };
                    const ingMap = new Map<string, IngredientReq>();
                    for (const slotId of arrTok.slots) {
                      if (slotId) addIng(ingMap, [slotId], 1);
                    }
                    if (ingMap.size > 0) {
                      recipes.push({
                        id: `${packId}:jar_r_${recipes.length}`,
                        packId,
                        type: 'slimefun',
                        customTypeLabel: ws.label,
                        workstationId: ws.id,
                        outputId: sfTok.val,
                        outputCount: 1,
                        grid: arrTok.slots,
                        ingredients: Array.from(ingMap.values()),
                      });
                    }
                  }
                }
              } else {
                // Skip variable-length / standard instruction operands safely
                if (op === 0x15 || op === 0x16 || op === 0x17 || op === 0x18 || op === 0x19 ||
                    op === 0x36 || op === 0x37 || op === 0x38 || op === 0x39 || op === 0x3a ||
                    op === 0xbc || op === 0xa9) {
                  pc += 1;
                } else if (
                  op === 0x14 || op === 0xb4 || op === 0xb5 || op === 0xbb || op === 0xc0 || op === 0xc1 ||
                  (op >= 0x99 && op <= 0xa8) || op === 0xc6 || op === 0xc7
                ) {
                  pc += 2;
                } else if (op === 0x84) {
                  pc += 2;
                } else if (op === 0xb9 || op === 0xba || op === 0xc8 || op === 0xc9) {
                  pc += 4;
                } else if (op === 0xc5) {
                  pc += 3;
                } else if (op === 0xaa || op === 0xab || op === 0xc4) {
                  // tableswitch / lookupswitch / wide — abort method scan cleanly
                  break;
                }
              }
            }
          }
        }
      }
    } catch {
      // Ignore malformed class entries
    }
  }

  return {
    id: packId,
    name: pluginName,
    version: pluginVersion,
    items: Array.from(itemsById.values()),
    recipes,
    tags: {},
    fieldToItemId,
  };
}
