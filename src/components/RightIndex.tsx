import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  GitBranch,
  LayoutGrid,
  List,
  Search,
  X,
} from 'lucide-react';
import { useRegistry } from '../context/RegistryContext';
import { searchItems } from '../utils/craftTree';
import { ItemSlot } from './ItemSlot';
import { ItemSprite } from './ItemSprite';

interface RightIndexProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  query: string;
  onChangeQuery: (q: string) => void;
  categoryFilter: string;
  onChangeCategoryFilter: (cat: string) => void;
  modFilter: string;
  onChangeModFilter: (mod: string) => void;
  selectedItemId: string;
  bookmarks: Set<string>;
  workbenchBrushMode: boolean;
  onSelectItem: (itemId: string) => void;
  onViewUses: (itemId: string) => void;
  onOpenCraftTree: (itemId: string) => void;
  onHoverItem: (itemId: string | null, rect?: DOMRect, x?: number, y?: number) => void;
}

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'blocks', label: 'Blocks' },
  { id: 'materials', label: 'Materials' },
  { id: 'redstone', label: 'Redstone' },
  { id: 'tools', label: 'Tools' },
  { id: 'combat', label: 'Combat' },
  { id: 'food', label: 'Food' },
  { id: 'alchemy', label: 'Alchemy' },
];

export const RightIndex: React.FC<RightIndexProps> = ({
  searchInputRef,
  query,
  onChangeQuery,
  categoryFilter,
  onChangeCategoryFilter,
  modFilter,
  onChangeModFilter,
  selectedItemId,
  bookmarks,
  workbenchBrushMode,
  onSelectItem,
  onViewUses,
  onOpenCraftTree,
  onHoverItem,
}) => {
  const registry = useRegistry();
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 1024 ? 'list' : 'grid'
  );
  const [page, setPage] = React.useState(0);

  const availableMods = React.useMemo(() => {
    const mods = new Set<string>();
    for (const item of registry.items) mods.add(item.mod);
    return Array.from(mods);
  }, [registry.items]);

  const itemsPerPage = viewMode === 'list' ? 18 : 40;

  const filteredItems = React.useMemo(
    () => searchItems(registry.items, query, modFilter, categoryFilter),
    [registry.items, query, modFilter, categoryFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const safePage = Math.min(page, totalPages - 1);

  React.useEffect(() => {
    setPage(0);
  }, [query, categoryFilter, modFilter, viewMode]);

  const pageItems = filteredItems.slice(
    safePage * itemsPerPage,
    (safePage + 1) * itemsPerPage
  );

  return (
    <aside className="flex flex-col rounded-xl border border-slate-200 bg-white p-3.5 dark:border-[#242C3A] dark:bg-[#141921]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            {workbenchBrushMode ? 'Pick Workbench Brush' : 'Item Index'}
          </h2>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {filteredItems.length} items · MC {registry.version}
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-[#252E3D] dark:bg-[#0F131A]">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label="List view with item names"
            title="List view (with names)"
            className={`flex h-9 w-9 items-center justify-center rounded transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white text-emerald-600 shadow-xs dark:bg-[#1E2634] dark:text-emerald-300'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label="Compact icon grid view"
            title="Icon grid view"
            className={`flex h-9 w-9 items-center justify-center rounded transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-emerald-600 shadow-xs dark:bg-[#1E2634] dark:text-emerald-300'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={query}
          onChange={(e) => onChangeQuery(e.target.value)}
          placeholder="Search item, #tag, @mod..."
          aria-label="Search Minecraft items"
          className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pr-10 pl-9 font-sans text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-[#2C3545] dark:bg-[#0F131A] dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => onChangeQuery('')}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Mod Filter (only shown when extra mods are imported) */}
      {availableMods.length > 1 && (
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onChangeModFilter('all')}
            className={`min-h-[32px] rounded px-2.5 py-1 font-mono text-[11px] font-medium cursor-pointer whitespace-nowrap shrink-0 ${
              modFilter === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 dark:bg-[#1A202B] dark:text-slate-400'
            }`}
          >
            All Mods
          </button>
          {availableMods.map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => onChangeModFilter(mod)}
              className={`min-h-[32px] rounded px-2.5 py-1 font-mono text-[11px] font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                modFilter === mod
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 dark:bg-[#1A202B] dark:text-slate-400'
              }`}
            >
              @{mod}
            </button>
          ))}
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeCategoryFilter(tab.id)}
            className={`min-h-[36px] rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              categoryFilter === tab.id
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#1A202B] dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Item Browser Area */}
      <div className="mt-2.5 min-h-[280px]">
        {pageItems.length === 0 ? (
          <div className="flex h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 p-4 text-center dark:border-[#2A3343]">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No items match "{query}"
            </p>
            <button
              type="button"
              onClick={() => {
                onChangeQuery('');
                onChangeCategoryFilter('all');
                onChangeModFilter('all');
              }}
              className="mt-2 min-h-[40px] px-3 text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400 cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="divide-y divide-slate-100 dark:divide-[#1F2735]">
            {pageItems.map((item) => {
              const isSelected = item.id === selectedItemId;
              return (
                <div
                  key={item.id}
                  className={`flex min-h-[52px] items-center justify-between gap-2 py-1.5 px-1.5 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/12 dark:bg-emerald-500/15'
                      : 'hover:bg-slate-100/80 dark:hover:bg-[#1B222E]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectItem(item.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onViewUses(item.id);
                    }}
                    className="flex min-h-[44px] flex-1 items-center gap-3 min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-100 dark:border-[#2C3545] dark:bg-[#191F29]">
                      <ItemSprite itemId={item.id} size={28} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.name}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.id}
                        {bookmarks.has(item.id) ? ' · Saved' : ''}
                      </div>
                    </div>
                  </button>

                  {!workbenchBrushMode && (
                    <button
                      type="button"
                      onClick={() => onOpenCraftTree(item.id)}
                      aria-label={`Craft tree for ${item.name}`}
                      title="Open Craft Tree"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 hover:border-emerald-500/50 hover:text-emerald-600 dark:border-[#2C3545] dark:bg-[#191F29] dark:text-slate-300 dark:hover:text-emerald-400 cursor-pointer"
                    >
                      <GitBranch className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {pageItems.map((item) => (
              <ItemSlot
                key={item.id}
                itemId={item.id}
                size="md"
                isSelected={item.id === selectedItemId}
                isBookmarked={bookmarks.has(item.id)}
                onSelect={onSelectItem}
                onViewUses={onViewUses}
                onHover={onHoverItem}
                className="w-full"
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2.5 dark:border-[#222A37]">
        <button
          type="button"
          disabled={safePage === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          aria-label="Previous page"
          className="inline-flex min-h-[40px] items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-35 hover:bg-slate-100 dark:border-[#2C3545] dark:text-slate-300 dark:hover:bg-[#1B222E] cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Prev</span>
        </button>

        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {safePage + 1} / {totalPages}
        </span>

        <button
          type="button"
          disabled={safePage >= totalPages - 1}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          aria-label="Next page"
          className="inline-flex min-h-[40px] items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-35 hover:bg-slate-100 dark:border-[#2C3545] dark:text-slate-300 dark:hover:bg-[#1B222E] cursor-pointer disabled:cursor-not-allowed"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};
