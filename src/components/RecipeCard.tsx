import React from 'react';
import { ArrowRight, Flame, GitBranch, Grid3x3, Sparkles } from 'lucide-react';
import { useRegistry } from '../context/RegistryContext';
import { RecipeDef, RecipeSlot } from '../types/emi';
import { getCategoryLabel, getRecipeIngredients, resolveSlotCandidates } from '../utils/craftTree';
import { ItemSlot } from './ItemSlot';

interface RecipeCardProps {
  recipe: RecipeDef;
  bookmarks: Set<string>;
  onSelectItem: (itemId: string) => void;
  onViewUses: (itemId: string) => void;
  onHoverItem: (itemId: string | null, rect?: DOMRect, x?: number, y?: number) => void;
  onOpenCraftTree: (itemId: string, recipeId?: string) => void;
  onFillWorkbench: (recipe: RecipeDef) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  bookmarks,
  onSelectItem,
  onViewUses,
  onHoverItem,
  onOpenCraftTree,
  onFillWorkbench,
}) => {
  const registry = useRegistry();
  const workstation = registry.itemMap[recipe.workstationId];
  const outputItem = registry.itemMap[recipe.outputId];
  const ingredients = getRecipeIngredients(recipe);

  const isCraftingGrid =
    recipe.type === 'crafting_shaped' ||
    recipe.type === 'crafting_shapeless' ||
    (recipe.type === 'slimefun' && Boolean(recipe.grid));

  const displayGrid: RecipeSlot[] = React.useMemo(() => {
    if ((recipe.type === 'crafting_shaped' || recipe.type === 'slimefun') && recipe.grid) {
      return recipe.grid;
    }
    const slots: RecipeSlot[] = Array(9).fill(null);
    let idx = 0;
    for (const ing of ingredients) {
      for (let i = 0; i < ing.count && idx < 9; i++) {
        slots[idx++] = ing.choices.length === 1 ? ing.choices[0] : ing.choices;
      }
    }
    return slots;
  }, [recipe, ingredients]);

  const isSmeltingFamily =
    recipe.type === 'smelting' ||
    recipe.type === 'blasting' ||
    recipe.type === 'smoking' ||
    recipe.type === 'campfire_cooking';

  const isBrewing = recipe.type === 'brewing';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#242C3A] dark:bg-[#141921]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-[#222A37]">
        <div className="flex items-center gap-2.5 min-w-0">
          <ItemSlot
            itemId={recipe.workstationId}
            size="sm"
            isBookmarked={bookmarks.has(recipe.workstationId)}
            onSelect={onSelectItem}
            onViewUses={onViewUses}
            onHover={onHoverItem}
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {getCategoryLabel(recipe.type, recipe.customTypeLabel)}
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate">
              <button
                type="button"
                onClick={() => onViewUses(recipe.workstationId)}
                className="truncate text-left hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline cursor-pointer"
                title="View all recipes in this machine"
              >
                {workstation?.name ?? recipe.workstationId}
              </button>
              {recipe.note ? <span className="truncate">· {recipe.note}</span> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCraftingGrid && (
            <button
              type="button"
              onClick={() => onFillWorkbench(recipe)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-[#2D3748] dark:bg-[#1B222D] dark:text-slate-200 dark:hover:border-emerald-500/50 dark:hover:text-emerald-300 whitespace-nowrap shrink-0 cursor-pointer"
              title="Fill interactive 3x3 workbench grid"
            >
              <Grid3x3 className="h-3.5 w-3.5" />
              <span>Fill Grid</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenCraftTree(recipe.outputId, recipe.id)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <GitBranch className="h-3.5 w-3.5" />
            <span>Craft Tree</span>
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          {isCraftingGrid ? (
            <div className="grid grid-cols-3 gap-1 rounded-md border border-slate-200 bg-slate-50 p-1.5 dark:border-[#252E3D] dark:bg-[#0F131A]">
              {displayGrid.map((slotVal, index) => {
                const isSingle = typeof slotVal === 'string' && !slotVal.startsWith('#');
                return (
                  <ItemSlot
                    key={index}
                    itemId={slotVal}
                    size="md"
                    isBookmarked={isSingle ? bookmarks.has(slotVal) : false}
                    onSelect={onSelectItem}
                    onViewUses={onViewUses}
                    onHover={onHoverItem}
                  />
                );
              })}
            </div>
          ) : isSmeltingFamily ? (
            <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-[#252E3D] dark:bg-[#0F131A]">
              <div className="flex flex-col items-center gap-1.5">
                <ItemSlot
                  itemId={ingredients[0]?.choices ?? null}
                  count={ingredients[0]?.count}
                  size="md"
                  onSelect={onSelectItem}
                  onViewUses={onViewUses}
                  onHover={onHoverItem}
                />
                <div className="flex items-center gap-1 text-amber-500">
                  <Flame className="h-4 w-4" />
                </div>
                <ItemSlot
                  itemId="minecraft:coal"
                  size="sm"
                  isBookmarked={bookmarks.has('minecraft:coal')}
                  onSelect={onSelectItem}
                  onViewUses={onViewUses}
                  onHover={onHoverItem}
                />
              </div>
              <div className="flex flex-col gap-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                <span>{recipe.cookTimeSec ?? 10}s cook</span>
                {recipe.xp !== undefined && <span>+{recipe.xp} XP</span>}
              </div>
            </div>
          ) : isBrewing ? (
            <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-[#252E3D] dark:bg-[#0F131A]">
              <div className="flex flex-col items-center gap-1.5">
                <ItemSlot
                  itemId={ingredients[0]?.choices ?? null}
                  count={ingredients[0]?.count}
                  size="md"
                  onSelect={onSelectItem}
                  onViewUses={onViewUses}
                  onHover={onHoverItem}
                />
                <div className="flex items-center gap-1.5 text-amber-500">
                  <ItemSlot
                    itemId="minecraft:blaze_powder"
                    size="sm"
                    isBookmarked={bookmarks.has('minecraft:blaze_powder')}
                    onSelect={onSelectItem}
                    onViewUses={onViewUses}
                    onHover={onHoverItem}
                  />
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    ↓ brew
                  </span>
                </div>
                <ItemSlot
                  itemId={ingredients[1]?.choices ?? null}
                  count={ingredients[1]?.count}
                  size="md"
                  onSelect={onSelectItem}
                  onViewUses={onViewUses}
                  onHover={onHoverItem}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-[#252E3D] dark:bg-[#0F131A]">
              {ingredients.map((ing, i) => (
                <React.Fragment key={`${ing.id}-${i}`}>
                  {i > 0 && (
                    <span className="font-mono text-xs text-slate-400">+</span>
                  )}
                  <ItemSlot
                    itemId={ing.choices}
                    count={ing.count}
                    size="md"
                    onSelect={onSelectItem}
                    onViewUses={onViewUses}
                    onHover={onHoverItem}
                  />
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="flex flex-col items-center gap-1 text-slate-400">
            <ArrowRight className="h-5 w-5" />
            {recipe.cookTimeSec && !isCraftingGrid && (
              <span className="font-mono text-[10px] tabular-nums">
                {recipe.cookTimeSec}s
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ItemSlot
              itemId={recipe.outputId}
              count={recipe.outputCount}
              size="lg"
              isSelected
              isBookmarked={bookmarks.has(recipe.outputId)}
              onSelect={onSelectItem}
              onViewUses={onViewUses}
              onHover={onHoverItem}
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {outputItem?.name ?? recipe.outputId}
              </div>
              <div className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                Yields ×{recipe.outputCount}
              </div>
            </div>
          </div>
        </div>

        {/* Ingredient breakdown */}
        <div className="flex flex-col items-start sm:items-end gap-1 text-xs text-slate-500 dark:text-slate-400">
          <div className="font-medium text-slate-600 dark:text-slate-300">
            Ingredients per craft
          </div>
          <div className="flex flex-wrap sm:justify-end gap-x-2.5 gap-y-1">
            {ingredients.map((ing) => {
              const firstChoice = ing.choices[0] ?? ing.id;
              const candidates = resolveSlotCandidates(ing.choices, registry.tags);
              const targetClickId = candidates[0] ?? firstChoice;
              const displayName = firstChoice.startsWith('#')
                ? firstChoice.replace('#minecraft:', '#')
                : registry.itemMap[firstChoice]?.name ??
                  (ing.choices.length > 1
                    ? `${registry.itemMap[targetClickId]?.name ?? targetClickId} (+${ing.choices.length - 1})`
                    : firstChoice);

              return (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => targetClickId && onSelectItem(targetClickId)}
                  className="font-mono text-[11px] text-slate-600 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 cursor-pointer"
                >
                  {ing.count}× {displayName}
                </button>
              );
            })}
          </div>
          {recipe.xp !== undefined && (
            <div className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-500">
              <Sparkles className="h-3 w-3" />
              <span>{recipe.xp} XP / op</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
