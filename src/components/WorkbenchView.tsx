import React from 'react';
import { ArrowRight, Eraser, Hammer, PackageCheck } from 'lucide-react';
import { useRegistry } from '../context/RegistryContext';
import { getCategoryLabel, matchWorkbenchGrid } from '../utils/craftTree';
import { ItemSlot } from './ItemSlot';

interface WorkbenchViewProps {
  grid: (string | null)[];
  activeBrushItemId: string | null;
  onSetGridSlot: (index: number, itemId: string | null) => void;
  onClearGrid: () => void;
  onLoadQuickRecipe: (outputId: string) => void;
  bookmarks: Set<string>;
  onSelectItem: (itemId: string) => void;
  onViewUses: (itemId: string) => void;
  onHoverItem: (itemId: string | null, rect?: DOMRect, x?: number, y?: number) => void;
}

const PRESET_RECIPES = [
  { id: 'minecraft:piston', label: 'Piston' },
  { id: 'minecraft:observer', label: 'Observer' },
  { id: 'minecraft:beacon', label: 'Beacon' },
  { id: 'minecraft:enchanting_table', label: 'Enchanting Table' },
  { id: 'minecraft:crafter', label: 'Crafter' },
];

export const WorkbenchView: React.FC<WorkbenchViewProps> = ({
  grid,
  activeBrushItemId,
  onSetGridSlot,
  onClearGrid,
  onLoadQuickRecipe,
  bookmarks,
  onSelectItem,
  onViewUses,
  onHoverItem,
}) => {
  const registry = useRegistry();
  const [craftedBag, setCraftedBag] = React.useState<{ id: string; count: number }[]>([]);

  const matchedRecipe = React.useMemo(
    () => matchWorkbenchGrid(registry, grid),
    [registry, grid]
  );
  const matchedItem = matchedRecipe ? registry.itemMap[matchedRecipe.outputId] : null;
  const brushItem = activeBrushItemId ? registry.itemMap[activeBrushItemId] : null;

  const handleSlotClick = (idx: number) => {
    if (grid[idx] && !activeBrushItemId) {
      onSetGridSlot(idx, null);
      return;
    }
    if (grid[idx] === activeBrushItemId) {
      onSetGridSlot(idx, null);
    } else if (activeBrushItemId) {
      onSetGridSlot(idx, activeBrushItemId);
    }
  };

  const handleCraftOutput = () => {
    if (!matchedRecipe) return;
    setCraftedBag((prev) => {
      const existing = prev.find((entry) => entry.id === matchedRecipe.outputId);
      if (existing) {
        return prev.map((entry) =>
          entry.id === matchedRecipe.outputId
            ? { ...entry, count: entry.count + matchedRecipe.outputCount }
            : entry
        );
      }
      return [...prev, { id: matchedRecipe.outputId, count: matchedRecipe.outputCount }];
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-[#242C3A] dark:bg-[#141921]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3.5 dark:border-[#222A37]">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              3×3 Crafting Workbench
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tap "Fill Grid" from any recipe or select an item from Index to place into slots.
            </p>
          </div>
          <button
            type="button"
            onClick={onClearGrid}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-[#2C3545] dark:bg-[#191F29] dark:text-slate-200 cursor-pointer whitespace-nowrap"
          >
            <Eraser className="h-3.5 w-3.5" />
            <span>Clear Grid</span>
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-[#252E3D] dark:bg-[#0F131A]">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Brush:
            </span>
            {brushItem ? (
              <div className="flex items-center gap-2">
                <ItemSlot itemId={brushItem.id} size="sm" onHover={onHoverItem} />
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {brushItem.name}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Select an item from Index
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">
              Presets:
            </span>
            {PRESET_RECIPES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onLoadQuickRecipe(preset.id)}
                className="min-h-[34px] rounded border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors hover:border-emerald-500/60 hover:text-emerald-600 dark:border-[#2C3545] dark:bg-[#191F29] dark:text-slate-300 dark:hover:text-emerald-300 cursor-pointer whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-6 sm:flex-row">
          <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-slate-300 bg-slate-100 p-2.5 dark:border-[#2B3444] dark:bg-[#0D1117]">
            {grid.map((cellItemId, idx) => (
              <div
                key={idx}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onSetGridSlot(idx, null);
                }}
              >
                <ItemSlot
                  itemId={cellItemId}
                  size="lg"
                  isBookmarked={cellItemId ? bookmarks.has(cellItemId) : false}
                  onSelect={() => handleSlotClick(idx)}
                  onEmptyClick={() => handleSlotClick(idx)}
                  onHover={onHoverItem}
                />
              </div>
            ))}
          </div>

          <ArrowRight className="h-6 w-6 text-slate-400 rotate-90 sm:rotate-0" />

          <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-6 py-4 dark:border-[#252E3D] dark:bg-[#0F131A] min-w-[200px]">
            <ItemSlot
              itemId={matchedRecipe ? matchedRecipe.outputId : null}
              count={matchedRecipe?.outputCount}
              size="lg"
              isSelected={Boolean(matchedRecipe)}
              onSelect={handleCraftOutput}
              onHover={onHoverItem}
            />

            {matchedRecipe && matchedItem ? (
              <div className="text-center">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {matchedItem.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {getCategoryLabel(matchedRecipe.type, matchedRecipe.customTypeLabel)} · ×
                  {matchedRecipe.outputCount}
                </div>
                <div className="mt-2.5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleCraftOutput}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 cursor-pointer whitespace-nowrap"
                  >
                    <Hammer className="h-3.5 w-3.5" />
                    <span>Craft</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectItem(matchedRecipe.outputId)}
                    className="min-h-[40px] rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:border-[#2C3545] dark:text-slate-300 dark:hover:bg-[#1E2634] cursor-pointer whitespace-nowrap"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-slate-500 dark:text-slate-400">
                No matching recipe
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[#242C3A] dark:bg-[#141921]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-emerald-500" />
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
              Crafted Output Tray
            </h3>
          </div>
          {craftedBag.length > 0 && (
            <button
              type="button"
              onClick={() => setCraftedBag([])}
              className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              Clear tray
            </button>
          )}
        </div>

        {craftedBag.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Craft items in the 3×3 workbench above to collect them here.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {craftedBag.map((entry) => (
              <ItemSlot
                key={entry.id}
                itemId={entry.id}
                count={entry.count}
                size="md"
                isBookmarked={bookmarks.has(entry.id)}
                onSelect={onSelectItem}
                onViewUses={onViewUses}
                onHover={onHoverItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
