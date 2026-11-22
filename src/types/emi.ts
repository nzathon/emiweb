export type RecipeCategory =
  | 'crafting_shaped'
  | 'crafting_shapeless'
  | 'smelting'
  | 'blasting'
  | 'smoking'
  | 'campfire_cooking'
  | 'stonecutting'
  | 'smithing_transform'
  | 'smithing_trim'
  | 'brewing'
  | 'transmute'
  | 'slimefun'
  | 'special';

export type ItemCategory =
  | 'blocks'
  | 'materials'
  | 'redstone'
  | 'tools'
  | 'combat'
  | 'food'
  | 'alchemy';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface ItemDef {
  id: string; // e.g. "minecraft:diamond_pickaxe"
  name: string; // Official en_us name
  mod: string; // e.g. "minecraft" or imported mod namespace
  packId: string; // e.g. "vanilla-26.3" or imported pack ID
  category: ItemCategory;
  tags: string[]; // e.g. ["#minecraft:planks", "#minecraft:logs"]
  stackSize: number;
  rarity: ItemRarity;
  isBlock: boolean;
  iconModel?: string;
  iconUrl?: string;
}

/**
 * A recipe slot can hold:
 * - null (empty)
 * - single item ID ("minecraft:oak_planks")
 * - tag reference ("#minecraft:planks")
 * - array of alternative item IDs/tags (["minecraft:coal", "minecraft:charcoal"])
 */
export type RecipeSlot = string | string[] | null;

export interface IngredientReq {
  /** Normalized key: single item ID, tag ID, or joined alternatives */
  id: string;
  /** Possible item IDs or tags that satisfy this ingredient */
  choices: string[];
  count: number;
}

export interface RecipeDef {
  id: string;
  packId: string;
  type: RecipeCategory;
  workstationId: string;
  outputId: string;
  outputCount: number;
  /** 3x3 slot layout for shaped crafting (9 entries) */
  grid?: RecipeSlot[];
  /** Explicit ingredient counts (used for shapeless, smelting, smithing, brewing, etc.) */
  ingredients?: IngredientReq[];
  cookTimeSec?: number;
  xp?: number;
  note?: string;
  customTypeLabel?: string;
}

export interface ModPackMeta {
  id: string;
  name: string;
  version: string;
  itemCount: number;
  recipeCount: number;
  isBuiltin?: boolean;
  enabled: boolean;
}

export interface VanillaDatasetPayload {
  version: string;
  generatedAt: string;
  items: ItemDef[];
  recipes: RecipeDef[];
  tags: Record<string, string[]>; // "#minecraft:planks" -> ["minecraft:oak_planks", ...]
}

export type CenterMode = 'recipes' | 'uses' | 'tree' | 'workbench';

export interface CraftTreeNode {
  nodeKey: string;
  itemId: string; // Resolved concrete item ID or tag
  displayLabel?: string;
  requiredCount: number;
  producedCount: number;
  leftoverCount: number;
  recipeId: string | null;
  availableRecipeIds: string[];
  craftBatches: number;
  isBase: boolean;
  isTag?: boolean;
  tagId?: string;
  tagChoices?: string[];
  children: CraftTreeNode[];
}

export interface RawMaterialTotal {
  itemId: string;
  count: number;
}

export interface CraftingStep {
  stepNumber: number;
  recipe: RecipeDef;
  batches: number;
  totalOutput: number;
}

export interface CraftPlanSummary {
  tree: CraftTreeNode;
  rawMaterials: RawMaterialTotal[];
  leftovers: RawMaterialTotal[];
  steps: CraftingStep[];
  totalCrafts: number;
}
