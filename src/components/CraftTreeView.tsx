import React from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useRegistry } from '../context/RegistryContext';
import { CraftTreeNode } from '../types/emi';
import { buildCraftPlan, formatStackCount, getCategoryLabel } from '../utils/craftTree';
import { ItemSlot } from './ItemSlot';
import { ItemSprite } from './ItemSprite';

interface CraftTreeViewProps {
  targetItemId: string;
  quantity: number;
  onChangeQuantity: (qty: number) => void;
  selectedRecipesByItem: Record<string, string>;
  onSelectRecipeForItem: (itemId: string, recipeId: string) => void;
  markedAsBaseIds: Set<string>;
  onToggleMarkedAsBase: (itemId: string) => void;
  preferredTagChoice: Record<string, string>;
  onCycleTagChoice: (tagId: string, nextItemId: string) => void;
  onResetOverrides: () => void;
  bookmarks: Set<string>;
  onSelectItem: (itemId: string) => void;
  onViewUses: (itemId: string) => void;
  onHoverItem: (itemId: string | null, rect?: DOMRect, x?: number, y?: number) => void;
}

interface TreeNodeRowProps {
  node: CraftTreeNode;
  depth: number;
  isRoot?: boolean;
  markedAsBaseIds: Set<string>;
  onToggleMarkedAsBase: (itemId: string) => void;
  onSelectRecipeForItem: (itemId: string, recipeId: string) => void;
  onCycleTagChoice: (tagId: string, nextItemId: string) => void;
  bookmarks: Set<string>;
  onSelectItem: (itemId: string) => void;
  onViewUses: (itemId: string) => void;
  onHoverItem: (itemId: string | null, rect?: DOMRect, x?: number, y?: number) => void;
}

const TreeNodeRow: React.FC<TreeNodeRowProps> = ({
  node,
  depth,
  isRoot = false,
  markedAsBaseIds,
  onToggleMarkedAsBase,
  onSelectRecipeForItem,
  onCycleTagChoice,
  bookmarks,
  onSelectItem,
  onViewUses,
  onHoverItem,
}) => {
  const registry = useRegistry();
  const [expanded, setExpanded] = React.useState(true);
  const item = registry.itemMap[node.itemId];
  const recipe = node.recipeId ? registry.recipeMap[node.recipeId] : null;
  const hasAlternatives = node.availableRecipeIds.length > 1;
  const isMarkedHave = markedAsBaseIds.has(node.itemId);
  const hasTagChoices = Boolean(node.isTag && node.tagId && node.tagChoices && node.tagChoices.length > 1);

  const cycleRecipe = () => {
    if (!hasAlternatives || !node.recipeId) return;
    const idx = node.availableRecipeIds.indexOf(node.recipeId);
    const nextId =
      node.availableRecipeIds[(idx + 1) % node.availableRecipeIds.length];
    onSelectRecipeForItem(node.itemId, nextId);
  };

  const cycleTag = () => {
    if (!hasTagChoices || !node.tagId || !node.tagChoices) return;
    const idx = node.tagChoices.indexOf(node.itemId);
    const nextId = node.tagChoices[(idx + 1) % node.tagChoices.length];
    onCycleTagChoice(node.tagId, nextId);
  };

  return (
    <div className="select-none">
      <div
        style={{ paddingLeft: `${Math.min(depth, 5) * 16}px` }}
        className="group flex flex-wrap items-center justify-between gap-2 rounded-md py-1.5 pr-2 transition-colors hover:bg-slate-100/80 dark:hover:bg-[#1B222E]"
      >
        <div className="flex items-center gap-2 min-w-0">
          {node.children.length > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-label={expanded ? 'Collapse branch' : 'Expand branch'}
              className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-[#263040] dark:hover:text-slate-200 cursor-pointer shrink-0"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="inline-block w-8 text-center font-mono text-xs text-slate-400 shrink-0">
              ·
            </span>
          )}

          <ItemSlot
            itemId={node.itemId}
            count={node.requiredCount}
            size="sm"
            isSelected={isRoot}
            isBookmarked={bookmarks.has(node.itemId)}
            isDimmed={isMarkedHave && !isRoot}
            onSelect={onSelectItem}
            onViewUses={onViewUses}
            onHover={onHoverItem}
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {item?.name ?? node.itemId}
              </span>
              <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                ×{node.requiredCount}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500 dark:text-slate-400">
              {node.isBase ? (
                <span>{isMarkedHave ? 'Marked as already owned' : 'Raw resource'}</span>
              ) : (
                <span>
                  {recipe
                    ? getCategoryLabel(recipe.type, recipe.customTypeLabel)
                    : 'Craft'}{' '}
                  ·{' '}
                  {node.craftBatches} batch{node.craftBatches > 1 ? 'es' : ''}
                  {node.leftoverCount > 0 ? ` · +${node.leftoverCount} surplus` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {hasTagChoices && (
            <button
              type="button"
              onClick={cycleTag}
              title={`Cycle variant (${node.tagChoices?.length ?? 0} options)`}
              className="inline-flex min-h-[34px] items-center gap-1 rounded border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[11px] font-medium text-sky-700 dark:text-sky-300 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Variant</span>
            </button>
          )}
          {hasAlternatives && !isMarkedHave && (
            <button
              type="button"
              onClick={cycleRecipe}
              title="Switch to alternative recipe"
              className="inline-flex min-h-[34px] items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-emerald-500/60 hover:text-emerald-600 dark:border-[#2C3545] dark:bg-[#191F29] dark:text-slate-300 dark:hover:text-emerald-300 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Alt ({node.availableRecipeIds.length})</span>
            </button>
          )}
          {!isRoot && (node.children.length > 0 || isMarkedHave) && (
            <button
              type="button"
              onClick={() => onToggleMarkedAsBase(node.itemId)}
              className={`min-h-[34px] rounded border px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isMarkedHave
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                  : 'border-slate-300 bg-white text-slate-600 hover:text-slate-900 dark:border-[#2C3545] dark:bg-[#191F29] dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {isMarkedHave ? 'Expand' : 'Have'}
            </button>
          )}
        </div>
      </div>

      {expanded &&
        node.children.map((child) => (
          <TreeNodeRow
            key={child.nodeKey}
            node={child}
            depth={depth + 1}
            markedAsBaseIds={markedAsBaseIds}
            onToggleMarkedAsBase={onToggleMarkedAsBase}
            onSelectRecipeForItem={onSelectRecipeForItem}
            onCycleTagChoice={onCycleTagChoice}
            bookmarks={bookmarks}
            onSelectItem={onSelectItem}
            onViewUses={onViewUses}
            onHoverItem={onHoverItem}
          />
        ))}
    </div>
  );
};

export const CraftTreeView: React.FC<CraftTreeViewProps> = ({
  targetItemId,
  quantity,
  onChangeQuantity,
  selectedRecipesByItem,
  onSelectRecipeForItem,
  markedAsBaseIds,
  onToggleMarkedAsBase,
  preferredTagChoice,
  onCycleTagChoice,
  onResetOverrides,
  bookmarks,
  onSelectItem,
  onViewUses,
  onHoverItem,
}) => {
  const registry = useRegistry();
  const [checkedRaw, setCheckedRaw] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    setCheckedRaw(new Set());
  }, [targetItemId]);

  const plan = React.useMemo(
    () =>
      buildCraftPlan(
        registry,
        targetItemId,
        quantity,
        selectedRecipesByItem,
        markedAsBaseIds,
        preferredTagChoice
      ),
    [
      registry,
      targetItemId,
      quantity,
      selectedRecipesByItem,
      markedAsBaseIds,
      preferredTagChoice,
    ]
  );

  const targetItem = registry.itemMap[targetItemId];

  const toggleCheckedRaw = (itemId: string) => {
    setCheckedRaw((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const gatheredCount = plan.rawMaterials.filter((m) =>
    checkedRaw.has(m.itemId)
  ).length;

  const hasOverrides =
    markedAsBaseIds.size > 0 ||
    Object.keys(selectedRecipesByItem).length > 0 ||
    Object.keys(preferredTagChoice).length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-[#242C3A] dark:bg-[#141921]">
        <div className="flex items-center gap-3.5 min-w-0">
          <ItemSlot
            itemId={targetItemId}
            count={quantity}
            size="lg"
            isSelected
            isBookmarked={bookmarks.has(targetItemId)}
            onSelect={onSelectItem}
            onViewUses={onViewUses}
            onHover={onHoverItem}
          />
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              {targetItem?.name ?? targetItemId}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {plan.rawMaterials.length} raw material types · {plan.totalCrafts} craft ops
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 dark:border-[#2C3545] dark:bg-[#191F29]">
            <button
              type="button"
              onClick={() => onChangeQuantity(Math.max(1, quantity - 1))}
              aria-label="Decrease quantity"
              className="flex h-10 w-10 items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min={1}
              max={9999}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onChangeQuantity(Number.isNaN(val) ? 1 : Math.max(1, Math.min(9999, val)));
              }}
              aria-label="Target craft quantity"
              className="w-16 bg-transparent py-1 text-center font-mono text-sm font-semibold text-slate-900 focus:outline-none dark:text-slate-100 tabular-nums"
            />
            <button
              type="button"
              onClick={() => onChangeQuantity(Math.min(9999, quantity + 1))}
              aria-label="Increase quantity"
              className="flex h-10 w-10 items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-[#252E3D] dark:bg-[#0F131A]">
            {[1, 4, 16, 64].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChangeQuantity(preset)}
                className={`min-h-[34px] rounded px-2.5 py-1 font-mono text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  quantity === preset
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-[#1E2634] dark:hover:text-slate-100'
                }`}
              >
                ×{preset}
              </button>
            ))}
          </div>

          {hasOverrides && (
            <button
              type="button"
              onClick={onResetOverrides}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:border-[#2C3545] dark:text-slate-300 dark:hover:text-white cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Tree</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-xl border border-slate-200 bg-white p-4 dark:border-[#242C3A] dark:bg-[#141921]">
          <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-[#222A37]">
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Dependency Tree
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Tap "Have" to skip owned items
            </span>
          </div>

          <div className="max-h-[460px] overflow-y-auto pr-1">
            <TreeNodeRow
              node={plan.tree}
              depth={0}
              isRoot
              markedAsBaseIds={markedAsBaseIds}
              onToggleMarkedAsBase={onToggleMarkedAsBase}
              onSelectRecipeForItem={onSelectRecipeForItem}
              onCycleTagChoice={onCycleTagChoice}
              bookmarks={bookmarks}
              onSelectItem={onSelectItem}
              onViewUses={onViewUses}
              onHoverItem={onHoverItem}
            />
          </div>
        </div>

        <div className="xl:col-span-5 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#242C3A] dark:bg-[#141921]">
            <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2.5 dark:border-[#222A37]">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-500" />
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Total Raw Materials
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {gatheredCount}/{plan.rawMaterials.length} ready
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#1F2735]">
              {plan.rawMaterials.map((mat) => {
                const item = registry.itemMap[mat.itemId];
                const isDone = checkedRaw.has(mat.itemId);
                return (
                  <div
                    key={mat.itemId}
                    className={`flex min-h-[48px] items-center justify-between gap-2 py-2 transition-opacity ${
                      isDone ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleCheckedRaw(mat.itemId)}
                        aria-label={`Mark ${item?.name ?? mat.itemId} gathered`}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer ${
                          isDone
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 bg-white hover:border-emerald-500 dark:border-[#344054] dark:bg-[#191F29]'
                        }`}
                      >
                        {isDone && <Check className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectItem(mat.itemId)}
                        onMouseEnter={(e) =>
                          onHoverItem(
                            mat.itemId,
                            e.currentTarget.getBoundingClientRect(),
                            e.clientX,
                            e.clientY
                          )
                        }
                        onMouseLeave={() => onHoverItem(null)}
                        className="flex min-h-[40px] items-center gap-2 min-w-0 text-left hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                      >
                        <ItemSprite itemId={mat.itemId} size={24} />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {item?.name ?? mat.itemId}
                        </span>
                      </button>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {mat.count}
                      </div>
                      {mat.count > (item?.stackSize ?? 64) && (
                        <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {formatStackCount(mat.count, item?.stackSize ?? 64)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {plan.leftovers.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#242C3A] dark:bg-[#141921]">
              <h3 className="mb-2.5 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Leftover Byproducts
              </h3>
              <div className="flex flex-wrap gap-2">
                {plan.leftovers.map((left) => (
                  <div
                    key={left.itemId}
                    className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-[#252E3D] dark:bg-[#0F131A]"
                  >
                    <ItemSprite itemId={left.itemId} size={20} />
                    <span className="text-xs text-slate-700 dark:text-slate-300">
                      {registry.itemMap[left.itemId]?.name ?? left.itemId}
                    </span>
                    <span className="font-mono text-xs font-semibold text-amber-500 tabular-nums">
                      +{left.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {plan.steps.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#242C3A] dark:bg-[#141921]">
          <h3 className="mb-3 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Crafting Order
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[...plan.steps].reverse().map((step, idx) => {
              const outItem = registry.itemMap[step.recipe.outputId];
              return (
                <button
                  key={step.recipe.id}
                  type="button"
                  onClick={() => onSelectItem(step.recipe.outputId)}
                  className="flex min-h-[48px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition-colors hover:border-emerald-500/50 dark:border-[#252E3D] dark:bg-[#0F131A] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs text-slate-400 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <ItemSprite itemId={step.recipe.outputId} size={24} />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {outItem?.name ?? step.recipe.outputId}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {getCategoryLabel(step.recipe.type, step.recipe.customTypeLabel)}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                    ×{step.totalOutput}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
