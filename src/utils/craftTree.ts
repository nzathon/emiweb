import {
  CraftingStep,
  CraftPlanSummary,
  CraftTreeNode,
  IngredientReq,
  ItemDef,
  RawMaterialTotal,
  RecipeDef,
  RecipeSlot,
} from '../types/emi';
import { MergedRegistry } from './packRegistry';

export function resolveSlotCandidates(
  slot: RecipeSlot,
  tags: Record<string, string[]>
): string[] {
  if (!slot) return [];
  const rawList = Array.isArray(slot) ? slot : [slot];
  const resolved: string[] = [];
  for (const entry of rawList) {
    if (entry.startsWith('#')) {
      const members = tags[entry];
      if (members && members.length > 0) {
        resolved.push(...members);
      }
    } else {
      resolved.push(entry);
    }
  }
  return Array.from(new Set(resolved));
}

export function getRecipeIngredients(recipe: RecipeDef): IngredientReq[] {
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    return recipe.ingredients;
  }
  if (!recipe.grid) return [];

  const counts = new Map<string, { choices: string[]; count: number }>();
  for (const slot of recipe.grid) {
    if (!slot) continue;
    const choices = Array.isArray(slot) ? slot : [slot];
    const key = choices.length === 1 ? choices[0] : choices.join('|');
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { choices, count: 1 });
  }
  return Array.from(counts.entries()).map(([id, data]) => ({
    id,
    choices: data.choices,
    count: data.count,
  }));
}

export function getRecipesForOutput(
  registry: MergedRegistry,
  itemId: string
): RecipeDef[] {
  return registry.recipes.filter((r) => r.outputId === itemId);
}

export function getUsesForIngredient(
  registry: MergedRegistry,
  itemId: string
): RecipeDef[] {
  const item = registry.itemMap[itemId];
  return registry.recipes.filter((r) => {
    if (r.workstationId === itemId) return true;
    const reqs = getRecipeIngredients(r);
    return reqs.some((req) =>
      req.choices.some((choice) => {
        if (choice === itemId) return true;
        if (choice.startsWith('#')) {
          if (item?.tags.includes(choice)) return true;
          const tagMembers = registry.tags[choice];
          if (tagMembers?.includes(itemId)) return true;
        }
        return false;
      })
    );
  });
}

export function getCategoryLabel(
  type: RecipeDef['type'],
  customTypeLabel?: string
): string {
  if (customTypeLabel) return customTypeLabel;
  switch (type) {
    case 'crafting_shaped':
      return 'Crafting (Shaped)';
    case 'crafting_shapeless':
      return 'Crafting (Shapeless)';
    case 'smelting':
      return 'Furnace Smelting';
    case 'blasting':
      return 'Blast Furnace';
    case 'smoking':
      return 'Smoker';
    case 'campfire_cooking':
      return 'Campfire Cooking';
    case 'stonecutting':
      return 'Stonecutting';
    case 'smithing_transform':
      return 'Smithing Upgrade';
    case 'smithing_trim':
      return 'Armor Trim';
    case 'brewing':
      return 'Brewing Stand';
    case 'transmute':
      return 'Dye / Transmute';
    case 'slimefun':
      return 'Slimefun Crafting';
    case 'special':
      return 'Special Crafting';
  }
}

export function formatStackCount(count: number, stackSize = 64): string {
  if (stackSize <= 1 || count < stackSize) {
    return `${count}`;
  }
  const stacks = Math.floor(count / stackSize);
  const rem = count % stackSize;
  if (rem === 0) {
    return `${stacks}×${stackSize}`;
  }
  return `${stacks}×${stackSize} + ${rem}`;
}

export function searchItems(
  items: ItemDef[],
  query: string,
  modFilter: string,
  categoryFilter: string
): ItemDef[] {
  const rawTokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return items.filter((item) => {
    if (modFilter !== 'all' && item.mod !== modFilter) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false;
    }

    for (const token of rawTokens) {
      if (token.startsWith('@')) {
        const modQuery = token.slice(1);
        if (!item.mod.toLowerCase().includes(modQuery)) return false;
      } else if (token.startsWith('#')) {
        const tagQuery = token.slice(1);
        const hasTag = item.tags.some((t) => t.toLowerCase().includes(tagQuery));
        if (!hasTag) return false;
      } else if (token.startsWith('$')) {
        const idQuery = token.slice(1);
        if (!item.id.toLowerCase().includes(idQuery)) return false;
      } else {
        const hay = `${item.name} ${item.id} ${item.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(token)) return false;
      }
    }
    return true;
  });
}

function pickDefaultConcreteItem(
  choices: string[],
  registry: MergedRegistry
): { resolvedId: string; isTag: boolean; tagId?: string; allMembers: string[] } {
  const members: string[] = [];
  let tagId: string | undefined;

  for (const c of choices) {
    if (c.startsWith('#')) {
      if (!tagId) tagId = c;
      const m = registry.tags[c];
      if (m) members.push(...m);
    } else {
      members.push(c);
    }
  }

  const unique = Array.from(new Set(members)).filter((id) => Boolean(registry.itemMap[id]));
  if (unique.length === 0) {
    const fallback = choices[0] ?? 'minecraft:stone';
    return {
      resolvedId: fallback,
      isTag: fallback.startsWith('#'),
      tagId,
      allMembers: [],
    };
  }

  // Prefer oak_* or cobblestone/coal for clean standard defaults over exotic variants
  const preferred =
    unique.find((id) => id === 'minecraft:oak_planks' || id === 'minecraft:oak_log') ||
    unique.find((id) => id === 'minecraft:cobblestone' || id === 'minecraft:coal') ||
    unique[0];

  return {
    resolvedId: preferred,
    isTag: Boolean(tagId) || choices.length > 1,
    tagId,
    allMembers: unique,
  };
}

/**
 * Resolves a full EMI crafting dependency tree down to raw base materials.
 */
export function buildCraftPlan(
  registry: MergedRegistry,
  targetItemId: string,
  targetQuantity: number,
  selectedRecipesByItem: Record<string, string> = {},
  markedAsBaseIds: Set<string> = new Set(),
  preferredTagChoice: Record<string, string> = {}
): CraftPlanSummary {
  const rawTotals = new Map<string, number>();
  const leftoverTotals = new Map<string, number>();
  const stepsMap = new Map<
    string,
    { recipe: RecipeDef; batches: number; totalOutput: number; order: number }
  >();
  let stepCounter = 0;

  function resolveNode(
    itemId: string,
    requiredCount: number,
    ancestors: Set<string>,
    pathKey: string,
    tagMeta?: { isTag: boolean; tagId?: string; choices: string[] }
  ): CraftTreeNode {
    const allRecipes = getRecipesForOutput(registry, itemId);
    const isForcedBase = markedAsBaseIds.has(itemId);
    const hasCycle = ancestors.has(itemId);

    // Filter out cyclic recipes (e.g., 9 ingots <-> 1 storage block)
    const validRecipes = allRecipes.filter((r) => {
      const reqs = getRecipeIngredients(r);
      // Skip 1-item unpacking recipes (e.g. 1 iron_block -> 9 iron_ingot) when crafting upwards
      if (
        r.type === 'crafting_shapeless' &&
        reqs.length === 1 &&
        reqs[0].count === 1 &&
        r.outputCount === 9
      ) {
        return false;
      }
      return !reqs.some((req) =>
        req.choices.some((c) => {
          if (ancestors.has(c)) return true;
          if (c.startsWith('#') && registry.tags[c]?.some((m) => ancestors.has(m))) {
            return true;
          }
          return false;
        })
      );
    });

    if (validRecipes.length === 0 || isForcedBase || hasCycle) {
      rawTotals.set(itemId, (rawTotals.get(itemId) ?? 0) + requiredCount);
      return {
        nodeKey: pathKey,
        itemId,
        requiredCount,
        producedCount: requiredCount,
        leftoverCount: 0,
        recipeId: null,
        availableRecipeIds: validRecipes.map((r) => r.id),
        craftBatches: 0,
        isBase: true,
        isTag: tagMeta?.isTag,
        tagId: tagMeta?.tagId,
        tagChoices: tagMeta?.choices,
        children: [],
      };
    }

    const chosenId = selectedRecipesByItem[itemId];
    const isVanillaTarget = itemId.startsWith('minecraft:');
    const hasNonSlimefunRecipe = validRecipes.some((r) => r.type !== 'slimefun');

    // If a Vanilla item only has Slimefun synthesis recipes (e.g. cobblestone from Stone Chunk),
    // treat it as a base material by default unless the user explicitly selected that recipe.
    if (isVanillaTarget && !hasNonSlimefunRecipe && !chosenId) {
      rawTotals.set(itemId, (rawTotals.get(itemId) ?? 0) + requiredCount);
      return {
        nodeKey: pathKey,
        itemId,
        requiredCount,
        producedCount: requiredCount,
        leftoverCount: 0,
        recipeId: null,
        availableRecipeIds: validRecipes.map((r) => r.id),
        craftBatches: 0,
        isBase: true,
        isTag: tagMeta?.isTag,
        tagId: tagMeta?.tagId,
        tagChoices: tagMeta?.choices,
        children: [],
      };
    }

    // Prefer crafting_shaped / crafting_shapeless / smelting over stonecutting/dyeing/nugget-compacting/recycling
    const sortedDefaults = [...validRecipes].sort((a, b) => {
      const rank = (r: RecipeDef) => {
        const t = r.type;
        const reqs = getRecipeIngredients(r);
        if (t === 'crafting_shaped') {
          // Prefer smelting raw ores over 9x nugget -> ingot compacting
          if (
            reqs.length === 1 &&
            reqs[0].count === 9 &&
            reqs[0].choices.some((c) => c.endsWith('_nugget'))
          ) {
            return 5.5;
          }
          return 0;
        }
        if (t === 'slimefun') {
          if (isVanillaTarget) return 6;
          if (r.grid) return 0.4;
          if (r.note?.includes('Electric equivalent')) return 0.9;
          return 0.6;
        }
        if (t === 'crafting_shapeless') return 1;
        if (t === 'blasting' || t === 'smoking') {
          // Deprioritize tool/armor recycling into nuggets
          if (
            r.outputId.endsWith('_nugget') &&
            reqs.some((q) => q.choices.length > 4)
          ) {
            return 8;
          }
          return 2;
        }
        if (t === 'smelting') {
          if (
            r.outputId.endsWith('_nugget') &&
            reqs.some((q) => q.choices.length > 4)
          ) {
            return 8.1;
          }
          return 3;
        }
        if (t === 'brewing') {
          if (r.id.includes('_gunpowder') || r.id.includes('_dragon_breath')) return 4;
          if (r.id.includes('_awkward_')) return 4.1;
          return 4.5;
        }
        if (t === 'smithing_transform') return 5;
        return 7;
      };
      return rank(a) - rank(b);
    });

    const chosenRecipe =
      validRecipes.find((r) => r.id === chosenId) ?? sortedDefaults[0];

    const batches = Math.ceil(requiredCount / chosenRecipe.outputCount);
    const producedCount = batches * chosenRecipe.outputCount;
    const leftoverCount = producedCount - requiredCount;

    if (leftoverCount > 0) {
      leftoverTotals.set(itemId, (leftoverTotals.get(itemId) ?? 0) + leftoverCount);
    }

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(itemId);

    const reqs = getRecipeIngredients(chosenRecipe);
    const children: CraftTreeNode[] = reqs.map((req, idx) => {
      const picked = pickDefaultConcreteItem(req.choices, registry);
      const override = preferredTagChoice[req.id];
      const concreteId =
        override && picked.allMembers.includes(override) ? override : picked.resolvedId;
      return resolveNode(
        concreteId,
        req.count * batches,
        nextAncestors,
        `${pathKey}>${concreteId}#${idx}`,
        picked.isTag
          ? {
              isTag: true,
              tagId: picked.tagId ?? req.id,
              choices: picked.allMembers,
            }
          : undefined
      );
    });

    const existingStep = stepsMap.get(chosenRecipe.id);
    if (existingStep) {
      existingStep.batches += batches;
      existingStep.totalOutput += producedCount;
    } else {
      stepsMap.set(chosenRecipe.id, {
        recipe: chosenRecipe,
        batches,
        totalOutput: producedCount,
        order: ++stepCounter,
      });
    }

    return {
      nodeKey: pathKey,
      itemId,
      requiredCount,
      producedCount,
      leftoverCount,
      recipeId: chosenRecipe.id,
      availableRecipeIds: sortedDefaults.map((r) => r.id),
      craftBatches: batches,
      isBase: false,
      isTag: tagMeta?.isTag,
      tagId: tagMeta?.tagId,
      tagChoices: tagMeta?.choices,
      children,
    };
  }

  const safeQty = Math.max(1, Math.min(9999, Math.floor(targetQuantity) || 1));
  const tree = resolveNode(targetItemId, safeQty, new Set(), targetItemId);

  const rawMaterials: RawMaterialTotal[] = Array.from(rawTotals.entries())
    .map(([itemId, count]) => ({ itemId, count }))
    .sort((a, b) => b.count - a.count);

  const leftovers: RawMaterialTotal[] = Array.from(leftoverTotals.entries())
    .map(([itemId, count]) => ({ itemId, count }))
    .sort((a, b) => b.count - a.count);

  const steps: CraftingStep[] = Array.from(stepsMap.values())
    .sort((a, b) => a.order - b.order)
    .map((entry, idx) => ({
      stepNumber: idx + 1,
      recipe: entry.recipe,
      batches: entry.batches,
      totalOutput: entry.totalOutput,
    }));

  const totalCrafts = steps.reduce((acc, s) => acc + s.batches, 0);

  return {
    tree,
    rawMaterials,
    leftovers,
    steps,
    totalCrafts,
  };
}

function slotMatchesInput(
  recipeSlot: RecipeSlot,
  inputItemId: string | null,
  tags: Record<string, string[]>
): boolean {
  if (!recipeSlot && !inputItemId) return true;
  if (!recipeSlot || !inputItemId) return false;
  const validCandidates = resolveSlotCandidates(recipeSlot, tags);
  return validCandidates.includes(inputItemId);
}

function trimGrid(grid: RecipeSlot[]): {
  width: number;
  height: number;
  cells: RecipeSlot[];
} {
  let minR = 3,
    maxR = -1,
    minC = 3,
    maxC = -1;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[r * 3 + c]) {
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
      }
    }
  }
  if (maxR === -1) return { width: 0, height: 0, cells: [] };
  const width = maxC - minC + 1;
  const height = maxR - minR + 1;
  const cells: RecipeSlot[] = [];
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      cells.push(grid[r * 3 + c]);
    }
  }
  return { width, height, cells };
}

export function matchWorkbenchGrid(
  registry: MergedRegistry,
  grid: (string | null)[]
): RecipeDef | null {
  const inputTrimmed = trimGrid(grid);
  if (inputTrimmed.cells.length === 0) return null;

  // 1. Shaped recipes (shift-invariant + tag-aware)
  for (const recipe of registry.recipes) {
    if (recipe.type !== 'crafting_shaped' || !recipe.grid) continue;
    const recipeTrimmed = trimGrid(recipe.grid);
    if (
      recipeTrimmed.width === inputTrimmed.width &&
      recipeTrimmed.height === inputTrimmed.height &&
      recipeTrimmed.cells.every((cell, i) =>
        slotMatchesInput(cell, inputTrimmed.cells[i] as string | null, registry.tags)
      )
    ) {
      return recipe;
    }
  }

  // 2. Shapeless recipes (tag-aware)
  const inputs = grid.filter((x): x is string => Boolean(x));
  for (const recipe of registry.recipes) {
    if (recipe.type !== 'crafting_shapeless' || !recipe.ingredients) continue;
    const expandedReqs: string[][] = [];
    for (const req of recipe.ingredients) {
      const candidates = resolveSlotCandidates(req.choices, registry.tags);
      for (let i = 0; i < req.count; i++) expandedReqs.push(candidates);
    }
    if (expandedReqs.length !== inputs.length) continue;

    const used = Array(inputs.length).fill(false);
    const canMatchAll = expandedReqs.every((candidates) => {
      const idx = inputs.findIndex((inp, i) => !used[i] && candidates.includes(inp));
      if (idx === -1) return false;
      used[idx] = true;
      return true;
    });
    if (canMatchAll) return recipe;
  }

  // 3. Slimefun 3x3 recipes (exact/trimmed grid matching)
  for (const recipe of registry.recipes) {
    if (recipe.type !== 'slimefun' || !recipe.grid) continue;
    const recipeTrimmed = trimGrid(recipe.grid);
    if (
      recipeTrimmed.width === inputTrimmed.width &&
      recipeTrimmed.height === inputTrimmed.height &&
      recipeTrimmed.cells.every((cell, i) =>
        slotMatchesInput(cell, inputTrimmed.cells[i] as string | null, registry.tags)
      )
    ) {
      return recipe;
    }
  }

  return null;
}
