import React from 'react';
import {
  Bookmark,
  GitBranch,
  History,
  PackagePlus,
  Star,
  Trash2,
} from 'lucide-react';
import { useRegistry } from '../context/RegistryContext';
import { ItemSlot } from './ItemSlot';
import { ItemSprite } from './ItemSprite';

interface LeftSidebarProps {
  bookmarks: string[];
  history: string[];
  selectedItemId: string;
  onSelectItem: (itemId: string) => void;
  onViewUses: (itemId: string) => void;
  onOpenCraftTree: (itemId: string) => void;
  onToggleBookmark: (itemId: string) => void;
  onImportModPack: (file: File) => void;
  onImportSlimefunGithub: (repoUrl: string) => Promise<void> | void;
  onTogglePackEnabled: (packId: string, enabled: boolean) => void;
  onDeletePack: (packId: string) => void;
  importStatus: string | null;
  onHoverItem: (itemId: string | null, rect?: DOMRect, x?: number, y?: number) => void;
}

const POPULAR_TARGETS = [
  'minecraft:beacon',
  'minecraft:crafter',
  'minecraft:netherite_pickaxe',
  'minecraft:enchanting_table',
  'minecraft:potion__healing',
  'minecraft:sticky_piston',
  'slimefun:enhanced_crafting_table',
  'slimefun:portable_crafter',
];

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  bookmarks,
  history,
  selectedItemId,
  onSelectItem,
  onViewUses,
  onOpenCraftTree,
  onToggleBookmark,
  onImportModPack,
  onImportSlimefunGithub,
  onTogglePackEnabled,
  onDeletePack,
  importStatus,
  onHoverItem,
}) => {
  const registry = useRegistry();
  const bookmarkSet = React.useMemo(() => new Set(bookmarks), [bookmarks]);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [githubRepoInput, setGithubRepoInput] = React.useState('');
  const [importingGithub, setImportingGithub] = React.useState(false);

  const handleGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = githubRepoInput.trim();
    if (!trimmed || importingGithub) return;
    setImportingGithub(true);
    try {
      await onImportSlimefunGithub(trimmed);
      setGithubRepoInput('');
    } finally {
      setImportingGithub(false);
    }
  };

  return (
    <aside className="flex flex-col gap-4">
      {/* Bookmarks Panel */}
      <section className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-[#242C3A] dark:bg-[#141921]">
        <div className="mb-2.5 flex items-center justify-between border-b border-slate-200 pb-2 dark:border-[#222A37]">
          <div className="flex items-center gap-1.5">
            <Bookmark className="h-4 w-4 text-amber-500" />
            <h2 className="font-display text-xs font-semibold tracking-wide text-slate-900 dark:text-slate-100">
              Bookmarks
            </h2>
          </div>
          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {bookmarks.length}
          </span>
        </div>

        {bookmarks.length === 0 ? (
          <p className="py-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Save any item to pin quick recipe and craft tree shortcuts here.
          </p>
        ) : (
          <div className="space-y-1 max-h-[260px] overflow-y-auto pr-0.5">
            {bookmarks.map((itemId) => {
              const item = registry.itemMap[itemId];
              if (!item) return null;
              const isSelected = itemId === selectedItemId;
              return (
                <div
                  key={itemId}
                  className={`group flex min-h-[44px] items-center justify-between gap-2 rounded-lg px-2 py-1 transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'hover:bg-slate-100 dark:hover:bg-[#1B222E]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectItem(itemId)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onViewUses(itemId);
                    }}
                    onMouseEnter={(e) =>
                      onHoverItem(
                        itemId,
                        e.currentTarget.getBoundingClientRect(),
                        e.clientX,
                        e.clientY
                      )
                    }
                    onMouseLeave={() => onHoverItem(null)}
                    className="flex min-h-[40px] items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <ItemSprite itemId={itemId} size={22} />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenCraftTree(itemId)}
                      title="Open Craft Tree"
                      aria-label={`Open craft tree for ${item.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-emerald-500/15 hover:text-emerald-500 cursor-pointer"
                    >
                      <GitBranch className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(itemId)}
                      title="Remove bookmark"
                      aria-label={`Remove ${item.name} bookmark`}
                      className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-rose-500/15 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Featured Craftables */}
      <section className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-[#242C3A] dark:bg-[#141921]">
        <div className="mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-2 dark:border-[#222A37]">
          <Star className="h-3.5 w-3.5 text-emerald-500" />
          <h2 className="font-display text-xs font-semibold tracking-wide text-slate-900 dark:text-slate-100">
            Featured Craft Trees
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {POPULAR_TARGETS.filter((id) => Boolean(registry.itemMap[id])).map((itemId) => (
            <ItemSlot
              key={itemId}
              itemId={itemId}
              size="md"
              isSelected={itemId === selectedItemId}
              isBookmarked={bookmarkSet.has(itemId)}
              onSelect={(id) => onOpenCraftTree(id)}
              onViewUses={onViewUses}
              onHover={onHoverItem}
              className="w-full"
            />
          ))}
        </div>
      </section>

      {/* Active Packs & Mod Importer */}
      <section className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-[#242C3A] dark:bg-[#141921]">
        <div className="mb-2.5 flex items-center justify-between border-b border-slate-200 pb-2 dark:border-[#222A37]">
          <div className="flex items-center gap-1.5">
            <PackagePlus className="h-3.5 w-3.5 text-emerald-500" />
            <h2 className="font-display text-xs font-semibold tracking-wide text-slate-900 dark:text-slate-100">
              Recipe Packs
            </h2>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[36px] rounded border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-300 cursor-pointer"
          >
            + Import JSON/JAR
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.zip,.jar"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportModPack(file);
              e.target.value = '';
            }}
          />
        </div>

        <div className="space-y-2">
          {registry.packs.map((pack) => {
            const canToggle = !pack.isBuiltin || pack.id === 'slimefun4-core';
            return (
              <div
                key={pack.id}
                className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-[#252E3D] dark:bg-[#0F131A]"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {pack.name}
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                    {pack.itemCount} items · {pack.recipeCount} recipes
                  </div>
                </div>
                {canToggle && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onTogglePackEnabled(pack.id, !pack.enabled)}
                      className={`min-h-[32px] rounded px-2.5 py-1 text-[10px] font-medium cursor-pointer ${
                        pack.enabled
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-600 dark:bg-[#1E2634] dark:text-slate-400'
                      }`}
                    >
                      {pack.enabled ? 'On' : 'Off'}
                    </button>
                    {!pack.isBuiltin && (
                      <button
                        type="button"
                        onClick={() => onDeletePack(pack.id)}
                        aria-label={`Remove ${pack.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form onSubmit={handleGithubSubmit} className="mt-3 border-t border-slate-200 pt-2.5 dark:border-[#222A37]">
          <label
            htmlFor="sf-github-addon"
            className="block text-[11px] font-medium text-slate-600 dark:text-slate-300"
          >
            Add Slimefun Addon (GitHub)
          </label>
          <div className="mt-1.5 flex items-center gap-1.5">
            <input
              id="sf-github-addon"
              type="text"
              value={githubRepoInput}
              onChange={(e) => setGithubRepoInput(e.target.value)}
              placeholder="Mooy1/InfinityExpansion"
              className="min-h-[44px] min-w-0 flex-1 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none dark:border-[#2C3545] dark:bg-[#0F131A] dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={!githubRepoInput.trim() || importingGithub}
              className="min-h-[44px] shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-45 cursor-pointer disabled:cursor-not-allowed"
            >
              {importingGithub ? '...' : 'Import'}
            </button>
          </div>
        </form>

        {importStatus && (
          <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
            {importStatus}
          </p>
        )}
      </section>

      {/* Navigation History */}
      <section className="rounded-xl border border-slate-200 bg-white p-3.5 dark:border-[#242C3A] dark:bg-[#141921]">
        <div className="mb-2.5 flex items-center gap-1.5 border-b border-slate-200 pb-2 dark:border-[#222A37]">
          <History className="h-3.5 w-3.5 text-slate-400" />
          <h2 className="font-display text-xs font-semibold tracking-wide text-slate-900 dark:text-slate-100">
            Recent Lookups
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {history.slice(0, 12).map((itemId) => (
            <ItemSlot
              key={itemId}
              itemId={itemId}
              size="sm"
              isSelected={itemId === selectedItemId}
              isBookmarked={bookmarkSet.has(itemId)}
              onSelect={onSelectItem}
              onViewUses={onViewUses}
              onHover={onHoverItem}
            />
          ))}
        </div>
      </section>
    </aside>
  );
};
