import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  GitBranch,
  Grid3x3,
  Moon,
  RefreshCw,
  Search,
  Sun,
  Wrench,
} from 'lucide-react';
import { CraftTreeView } from './components/CraftTreeView';
import { ItemSlot } from './components/ItemSlot';
import { LeftSidebar } from './components/LeftSidebar';
import { RecipeCard } from './components/RecipeCard';
import { RightIndex } from './components/RightIndex';
import { TooltipOverlay } from './components/TooltipOverlay';
import { WorkbenchView } from './components/WorkbenchView';
import { RegistryContext } from './context/RegistryContext';
import {
  CenterMode,
  RecipeDef,
  VanillaDatasetPayload,
} from './types/emi';
import {
  getRecipesForOutput,
  getUsesForIngredient,
  resolveSlotCandidates,
} from './utils/craftTree';
import {
  buildMergedRegistry,
  BuiltinSlimefunCoreData,
  deleteImportedPack,
  ImportedPackData,
  importSlimefunGithubPack,
  loadImportedPacks,
  MergedRegistry,
  parseModPackFile,
  saveImportedPack,
  toggleImportedPackEnabled,
} from './utils/packRegistry';

type MobileTab = 'index' | 'recipes' | 'tree' | 'saved';

const INITIAL_BOOKMARKS = [
  'minecraft:beacon',
  'minecraft:crafter',
  'minecraft:netherite_pickaxe',
  'minecraft:ender_chest',
  'minecraft:straw_bed',
];

export default function App() {
  const [darkMode, setDarkMode] = React.useState(true);
  const [vanillaData, setVanillaData] = React.useState<VanillaDatasetPayload | null>(null);
  const [slimefunCore, setSlimefunCore] = React.useState<BuiltinSlimefunCoreData | null>(null);
  const [slimefunEnabled, setSlimefunEnabled] = React.useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('emi_web_slimefun_enabled');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [importedPacks, setImportedPacks] = React.useState<ImportedPackData[]>([]);
  const [loadingDataset, setLoadingDataset] = React.useState(true);
  const [datasetError, setDatasetError] = React.useState<string | null>(null);
  const [importStatus, setImportStatus] = React.useState<string | null>(null);

  const [centerMode, setCenterMode] = React.useState<CenterMode>('recipes');
  const [mobileTab, setMobileTab] = React.useState<MobileTab>('index');
  const [selectedItemId, setSelectedItemId] = React.useState<string>('minecraft:crafter');

  const [navStack, setNavStack] = React.useState<string[]>(['minecraft:crafter']);
  const [navIndex, setNavIndex] = React.useState<number>(0);

  const [bookmarks, setBookmarks] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('emi_web_bookmarks_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return INITIAL_BOOKMARKS;
  });

  const [searchQuery, setSearchQuery] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [modFilter, setModFilter] = React.useState('all');
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const [treeQuantity, setTreeQuantity] = React.useState<number>(1);
  const [selectedRecipesByItem, setSelectedRecipesByItem] = React.useState<
    Record<string, string>
  >({});
  const [markedAsBaseIds, setMarkedAsBaseIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [preferredTagChoice, setPreferredTagChoice] = React.useState<
    Record<string, string>
  >({});

  const [workbenchGrid, setWorkbenchGrid] = React.useState<(string | null)[]>(
    () => Array(9).fill(null)
  );
  const [workbenchBrush, setWorkbenchBrush] = React.useState<string | null>(
    'minecraft:oak_planks'
  );

  const [hovered, setHovered] = React.useState<{
    itemId: string | null;
    x: number;
    y: number;
  }>({ itemId: null, x: 0, y: 0 });
  const [showAllUses, setShowAllUses] = React.useState(false);

  React.useEffect(() => {
    setShowAllUses(false);
  }, [selectedItemId]);

  React.useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [darkMode]);

  const fetchInitialData = React.useCallback(async () => {
    setLoadingDataset(true);
    setDatasetError(null);
    try {
      const [res, sfRes, packs] = await Promise.all([
        fetch('/api/dataset?v=26.3-potions', { cache: 'no-store' }),
        fetch('/api/slimefun-core', { cache: 'no-store' }).catch(() => null),
        loadImportedPacks(),
      ]);
      if (!res.ok) {
        throw new Error(`Dataset server responded with ${res.status}`);
      }
      const data = (await res.json()) as VanillaDatasetPayload;
      setVanillaData(data);
      if (sfRes && sfRes.ok) {
        const sfData = (await sfRes.json()) as BuiltinSlimefunCoreData;
        setSlimefunCore(sfData);
      }
      setImportedPacks(packs);
    } catch (err) {
      setDatasetError(
        err instanceof Error ? err.message : 'Failed to load Minecraft 26.3 data'
      );
    } finally {
      setLoadingDataset(false);
    }
  }, []);

  React.useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  React.useEffect(() => {
    try {
      localStorage.setItem('emi_web_slimefun_enabled', String(slimefunEnabled));
    } catch {
      // Ignore storage errors
    }
  }, [slimefunEnabled]);

  const registry: MergedRegistry | null = React.useMemo(() => {
    if (!vanillaData) return null;
    return buildMergedRegistry(
      vanillaData,
      importedPacks,
      slimefunCore ? { data: slimefunCore, enabled: slimefunEnabled } : null
    );
  }, [vanillaData, importedPacks, slimefunCore, slimefunEnabled]);

  React.useEffect(() => {
    if (!registry) return;
    setBookmarks((prev) => {
      const valid = prev.filter((id) => Boolean(registry.itemMap[id]));
      return valid.length > 0 ? valid : INITIAL_BOOKMARKS.filter((id) => Boolean(registry.itemMap[id]));
    });
  }, [registry]);

  React.useEffect(() => {
    try {
      localStorage.setItem('emi_web_bookmarks_v2', JSON.stringify(bookmarks));
    } catch {
      // Ignore
    }
  }, [bookmarks]);

  const bookmarkSet = React.useMemo(() => new Set(bookmarks), [bookmarks]);

  const syncMobileTabFromMode = React.useCallback((mode: CenterMode) => {
    if (mode === 'tree') setMobileTab('tree');
    else if (mode === 'workbench') setMobileTab('saved');
    else setMobileTab('recipes');
  }, []);

  const navigateToItem = React.useCallback(
    (itemId: string, nextMode?: CenterMode) => {
      if (!registry?.itemMap[itemId]) return;
      setSelectedItemId(itemId);
      const resolvedMode = nextMode ?? 'recipes';
      if (nextMode) setCenterMode(nextMode);
      syncMobileTabFromMode(resolvedMode);
      setNavStack((prev) => {
        const sliced = prev.slice(0, navIndex + 1);
        if (sliced[sliced.length - 1] === itemId) return sliced;
        const updated = [...sliced, itemId];
        setNavIndex(updated.length - 1);
        return updated;
      });
    },
    [registry, navIndex, syncMobileTabFromMode]
  );

  const handleBack = React.useCallback(() => {
    if (navIndex > 0) {
      const nextIdx = navIndex - 1;
      setNavIndex(nextIdx);
      setSelectedItemId(navStack[nextIdx]);
    }
  }, [navIndex, navStack]);

  const handleForward = React.useCallback(() => {
    if (navIndex < navStack.length - 1) {
      const nextIdx = navIndex + 1;
      setNavIndex(nextIdx);
      setSelectedItemId(navStack[nextIdx]);
    }
  }, [navIndex, navStack]);

  const handleToggleBookmark = React.useCallback((itemId: string) => {
    setBookmarks((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [itemId, ...prev]
    );
  }, []);

  const handleOpenCraftTree = React.useCallback(
    (itemId: string, recipeId?: string) => {
      if (recipeId) {
        setSelectedRecipesByItem((prev) => ({ ...prev, [itemId]: recipeId }));
      }
      navigateToItem(itemId, 'tree');
    },
    [navigateToItem]
  );

  const handleFillWorkbench = React.useCallback(
    (recipe: RecipeDef) => {
      if (!registry) return;
      if ((recipe.type === 'crafting_shaped' || recipe.type === 'slimefun') && recipe.grid) {
        setWorkbenchGrid(
          recipe.grid.map((slot) => {
            if (!slot) return null;
            const cands = resolveSlotCandidates(slot, registry.tags);
            return cands[0] ?? (typeof slot === 'string' ? slot : null);
          })
        );
      } else if (recipe.type === 'crafting_shapeless' && recipe.ingredients) {
        const nextGrid: (string | null)[] = Array(9).fill(null);
        let idx = 0;
        for (const ing of recipe.ingredients) {
          const cands = resolveSlotCandidates(ing.choices, registry.tags);
          const pick = cands[0] ?? ing.choices[0] ?? null;
          for (let i = 0; i < ing.count && idx < 9; i++) {
            nextGrid[idx++] = pick;
          }
        }
        setWorkbenchGrid(nextGrid);
      }
      setCenterMode('workbench');
      setMobileTab('saved');
    },
    [registry]
  );

  const handleLoadQuickRecipeInWorkbench = React.useCallback(
    (outputId: string) => {
      if (!registry) return;
      const recipe = registry.recipes.find(
        (r) =>
          r.outputId === outputId &&
          (r.type === 'crafting_shaped' ||
            r.type === 'crafting_shapeless' ||
            (r.type === 'slimefun' && Boolean(r.grid)))
      );
      if (recipe) handleFillWorkbench(recipe);
    },
    [registry, handleFillWorkbench]
  );

  const handleIndexItemSelect = React.useCallback(
    (itemId: string) => {
      if (centerMode === 'workbench') {
        setWorkbenchBrush(itemId);
        setMobileTab('saved');
      } else {
        navigateToItem(itemId, centerMode === 'tree' ? 'tree' : 'recipes');
      }
    },
    [centerMode, navigateToItem]
  );

  const handleImportModPack = React.useCallback(
    async (file: File) => {
      if (!registry) return;
      setImportStatus(`Importing ${file.name}...`);
      try {
        const existingIds = new Set(Object.keys(registry.itemMap));
        const pack = await parseModPackFile(file, existingIds);
        await saveImportedPack(pack);
        const updated = await loadImportedPacks();
        setImportedPacks(updated);
        setImportStatus(
          `Loaded ${pack.meta.name} (${pack.meta.recipeCount} recipes)`
        );
      } catch (err) {
        setImportStatus(
          err instanceof Error ? err.message : 'Failed to parse mod pack'
        );
      }
    },
    [registry]
  );

  const handleImportSlimefunGithub = React.useCallback(async (repoUrl: string) => {
    const clean = repoUrl.trim();
    if (!clean) return;
    setImportStatus(`Fetching ${clean} from GitHub...`);
    try {
      const pack = await importSlimefunGithubPack(clean);
      await saveImportedPack(pack);
      const updated = await loadImportedPacks();
      setImportedPacks(updated);
      setImportStatus(
        `Loaded ${pack.meta.name} (${pack.meta.itemCount} items, ${pack.meta.recipeCount} recipes)`
      );
    } catch (err) {
      setImportStatus(
        err instanceof Error ? err.message : 'Failed to import Slimefun GitHub addon'
      );
    }
  }, []);

  const handleTogglePackEnabled = React.useCallback(
    async (packId: string, enabled: boolean) => {
      if (packId === 'slimefun4-core') {
        setSlimefunEnabled(enabled);
        if (!enabled && modFilter === 'slimefun') {
          setModFilter('all');
        }
        return;
      }
      await toggleImportedPackEnabled(packId, enabled);
      setImportedPacks(await loadImportedPacks());
    },
    [modFilter]
  );

  const handleDeletePack = React.useCallback(async (packId: string) => {
    await deleteImportedPack(packId);
    setImportedPacks(await loadImportedPacks());
    setModFilter('all');
  }, []);

  const handleHoverItem = React.useCallback(
    (itemId: string | null, _rect?: DOMRect, x = 0, y = 0) => {
      if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
        setHovered({ itemId: null, x: 0, y: 0 });
        return;
      }
      setHovered({ itemId, x, y });
    },
    []
  );

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;

      if (e.key === 'Escape') {
        if (isTyping) target?.blur();
        else handleBack();
        return;
      }
      if (isTyping) return;

      if (e.key === '/') {
        e.preventDefault();
        setMobileTab('index');
        searchInputRef.current?.focus();
        return;
      }

      const activeId = hovered.itemId ?? selectedItemId;
      const lower = e.key.toLowerCase();

      if (lower === 'r') {
        e.preventDefault();
        navigateToItem(activeId, 'recipes');
      } else if (lower === 'u') {
        e.preventDefault();
        navigateToItem(activeId, 'uses');
      } else if (lower === 't') {
        e.preventDefault();
        navigateToItem(activeId, 'tree');
      } else if (lower === 'a') {
        e.preventDefault();
        handleToggleBookmark(activeId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hovered.itemId, selectedItemId, navigateToItem, handleToggleBookmark, handleBack]);

  const currentItem = registry?.itemMap[selectedItemId];
  const recipesForSelected = React.useMemo(
    () => (registry ? getRecipesForOutput(registry, selectedItemId) : []),
    [registry, selectedItemId]
  );
  const usesForSelected = React.useMemo(
    () => (registry ? getUsesForIngredient(registry, selectedItemId) : []),
    [registry, selectedItemId]
  );
  const machineUsesForSelected = React.useMemo(
    () => usesForSelected.filter((r) => r.workstationId === selectedItemId),
    [usesForSelected, selectedItemId]
  );
  const ingredientUsesForSelected = React.useMemo(
    () => usesForSelected.filter((r) => r.workstationId !== selectedItemId),
    [usesForSelected, selectedItemId]
  );
  const recentItems = React.useMemo(
    () => [...new Set([...navStack].reverse())],
    [navStack]
  );

  if (loadingDataset || !registry) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-[#0D1015] dark:text-slate-100">
        {datasetError ? (
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-[#242C3A] dark:bg-[#141921]">
            <h1 className="font-display text-lg font-bold">
              Could not load Minecraft 26.3 data
            </h1>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {datasetError}
            </p>
            <button
              type="button"
              onClick={fetchInitialData}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md space-y-4">
            <div className="text-center">
              <div className="font-display text-lg font-bold">EMI Web</div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Loading official Minecraft Java 26.3 items & recipes...
              </p>
            </div>
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-[#242C3A] dark:bg-[#141921]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-11 animate-pulse rounded-lg bg-slate-200/70 dark:bg-[#1C2330]"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <RegistryContext.Provider value={registry}>
      <div className="min-h-screen bg-slate-50 pb-20 text-slate-900 dark:bg-[#0D1015] dark:text-slate-100 lg:pb-6">
        {/* Three-Zone Top Bar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur-md dark:border-[#222A37] dark:bg-[#11151C]/95 lg:px-6 lg:py-3">
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8">
            <button
              type="button"
              onClick={() => {
                navigateToItem('minecraft:crafter', 'recipes');
                setMobileTab('index');
              }}
              className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              EMI Web
            </button>

            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
              {(
                [
                  { id: 'recipes', label: 'Recipes' },
                  { id: 'uses', label: 'Uses' },
                  { id: 'tree', label: 'Craft Tree' },
                  { id: 'workbench', label: 'Workbench' },
                ] as { id: CenterMode; label: string }[]
              ).map((nav) => (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setCenterMode(nav.id)}
                  className={`border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    centerMode === nav.id
                      ? 'border-emerald-500 text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  {nav.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => setDarkMode((d) => !d)}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                className="inline-flex min-h-[38px] items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-[#2C3545] dark:bg-[#181E28] dark:text-slate-200 dark:hover:bg-[#212937] whitespace-nowrap shrink-0 cursor-pointer"
              >
                {darkMode ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-slate-600" />
                    <span className="hidden sm:inline">Dark Mode</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Responsive Workspace */}
        <main className="mx-auto max-w-[1440px] px-3 py-4 sm:px-4 lg:px-6 lg:py-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)_348px] items-start">
            {/* Left Panel: Bookmarks, Mod Packs & History */}
            <div className={mobileTab === 'saved' ? 'block lg:block' : 'hidden lg:block'}>
              <LeftSidebar
                bookmarks={bookmarks}
                history={recentItems}
                selectedItemId={selectedItemId}
                onSelectItem={(id) => navigateToItem(id, 'recipes')}
                onViewUses={(id) => navigateToItem(id, 'uses')}
                onOpenCraftTree={(id) => handleOpenCraftTree(id)}
                onToggleBookmark={handleToggleBookmark}
                onImportModPack={handleImportModPack}
                onImportSlimefunGithub={handleImportSlimefunGithub}
                onTogglePackEnabled={handleTogglePackEnabled}
                onDeletePack={handleDeletePack}
                importStatus={importStatus}
                onHoverItem={handleHoverItem}
              />
            </div>

            {/* Center Panel */}
            <section
              className={`min-w-0 space-y-4 ${
                mobileTab === 'recipes' ||
                mobileTab === 'tree' ||
                mobileTab === 'saved'
                  ? 'block'
                  : 'hidden lg:block'
              }`}
            >
              <div
                className={`rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 dark:border-[#242C3A] dark:bg-[#141921] ${
                  mobileTab === 'saved' ? 'hidden lg:block' : 'block'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={navIndex <= 0}
                        onClick={handleBack}
                        aria-label="Back in recipe history"
                        className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-35 dark:border-[#2C3545] dark:text-slate-300 dark:hover:bg-[#1B222E] cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={navIndex >= navStack.length - 1}
                        onClick={handleForward}
                        aria-label="Forward in recipe history"
                        className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-35 dark:border-[#2C3545] dark:text-slate-300 dark:hover:bg-[#1B222E] cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                    <ItemSlot
                      itemId={selectedItemId}
                      size="md"
                      isSelected
                      isBookmarked={bookmarkSet.has(selectedItemId)}
                      onHover={handleHoverItem}
                    />

                    <div className="min-w-0">
                      <h1 className="font-display text-base font-bold text-slate-900 dark:text-white truncate">
                        {currentItem?.name ?? selectedItemId}
                      </h1>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono truncate">{selectedItemId}</span>
                        <span aria-hidden="true">·</span>
                        <span>Stack {currentItem?.stackSize ?? 64}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleBookmark(selectedItemId)}
                    className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      bookmarkSet.has(selectedItemId)
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-[#2C3545] dark:bg-[#191F29] dark:text-slate-300'
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>{bookmarkSet.has(selectedItemId) ? 'Saved' : 'Save'}</span>
                  </button>
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-[#252E3D] dark:bg-[#0F131A]">
                  <button
                    type="button"
                    onClick={() => {
                      setCenterMode('recipes');
                      setMobileTab('recipes');
                    }}
                    className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      centerMode === 'recipes'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-[#1E2634] dark:text-emerald-300'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Recipes ({recipesForSelected.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCenterMode('uses');
                      setMobileTab('recipes');
                    }}
                    className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      centerMode === 'uses'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-[#1E2634] dark:text-emerald-300'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    <span>Uses ({usesForSelected.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCenterMode('tree');
                      setMobileTab('tree');
                    }}
                    className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      centerMode === 'tree'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-[#1E2634] dark:text-emerald-300'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                    <span>Craft Tree</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCenterMode('workbench');
                      setMobileTab('saved');
                    }}
                    className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      centerMode === 'workbench'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-[#1E2634] dark:text-emerald-300'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Grid3x3 className="h-3.5 w-3.5" />
                    <span>3×3 Grid</span>
                  </button>
                </div>
              </div>

              {/* Recipes View */}
              <div
                className={
                  centerMode === 'recipes'
                    ? mobileTab === 'recipes'
                      ? 'block space-y-4'
                      : 'hidden lg:block space-y-4'
                    : 'hidden'
                }
              >
                {recipesForSelected.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-[#242C3A] dark:bg-[#141921]">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {currentItem?.name ?? selectedItemId} has no crafting recipe
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      Obtained directly in the world via mining, looting, trading, or mob drops.
                    </p>
                    {usesForSelected.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCenterMode('uses')}
                        className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 cursor-pointer"
                      >
                        <Wrench className="h-3.5 w-3.5" />
                        <span>View {usesForSelected.length} Uses</span>
                      </button>
                    )}
                  </div>
                ) : (
                  recipesForSelected.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      bookmarks={bookmarkSet}
                      onSelectItem={(id) => navigateToItem(id, 'recipes')}
                      onViewUses={(id) => navigateToItem(id, 'uses')}
                      onHoverItem={handleHoverItem}
                      onOpenCraftTree={handleOpenCraftTree}
                      onFillWorkbench={handleFillWorkbench}
                    />
                  ))
                )}
              </div>

              {/* Uses View */}
              <div
                className={
                  centerMode === 'uses'
                    ? mobileTab === 'recipes'
                      ? 'block space-y-4'
                      : 'hidden lg:block space-y-4'
                    : 'hidden'
                }
              >
                {usesForSelected.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-[#242C3A] dark:bg-[#141921]">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      No downstream crafting uses indexed
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {currentItem?.name ?? selectedItemId} is not an ingredient in another recipe.
                    </p>
                    {recipesForSelected.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenCraftTree(selectedItemId)}
                        className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 cursor-pointer"
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                        <span>Open Craft Tree</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {machineUsesForSelected.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            Processed in {currentItem?.name ?? selectedItemId} ({machineUsesForSelected.length})
                          </h2>
                        </div>
                        {(showAllUses
                          ? machineUsesForSelected
                          : machineUsesForSelected.slice(0, 40)
                        ).map((recipe) => (
                          <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            bookmarks={bookmarkSet}
                            onSelectItem={(id) => navigateToItem(id, 'recipes')}
                            onViewUses={(id) => navigateToItem(id, 'uses')}
                            onHoverItem={handleHoverItem}
                            onOpenCraftTree={handleOpenCraftTree}
                            onFillWorkbench={handleFillWorkbench}
                          />
                        ))}
                      </div>
                    )}

                    {ingredientUsesForSelected.length > 0 && (
                      <div className="space-y-3">
                        {machineUsesForSelected.length > 0 && (
                          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Used as Ingredient ({ingredientUsesForSelected.length})
                          </h2>
                        )}
                        {(showAllUses
                          ? ingredientUsesForSelected
                          : ingredientUsesForSelected.slice(
                              0,
                              Math.max(10, 40 - machineUsesForSelected.length)
                            )
                        ).map((recipe) => (
                          <RecipeCard
                            key={recipe.id}
                            recipe={recipe}
                            bookmarks={bookmarkSet}
                            onSelectItem={(id) => navigateToItem(id, 'recipes')}
                            onViewUses={(id) => navigateToItem(id, 'uses')}
                            onHoverItem={handleHoverItem}
                            onOpenCraftTree={handleOpenCraftTree}
                            onFillWorkbench={handleFillWorkbench}
                          />
                        ))}
                      </div>
                    )}

                    {!showAllUses && usesForSelected.length > 40 && (
                      <button
                        type="button"
                        onClick={() => setShowAllUses(true)}
                        className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-[#2C3545] dark:bg-[#141921] dark:text-slate-200 dark:hover:bg-[#1B222E] cursor-pointer"
                      >
                        Show all {usesForSelected.length} recipes
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Craft Tree View */}
              <div
                className={
                  mobileTab === 'tree'
                    ? 'block'
                    : centerMode === 'tree'
                    ? 'hidden lg:block'
                    : 'hidden'
                }
              >
                <CraftTreeView
                  targetItemId={selectedItemId}
                  quantity={treeQuantity}
                  onChangeQuantity={setTreeQuantity}
                  selectedRecipesByItem={selectedRecipesByItem}
                  onSelectRecipeForItem={(itemId, recipeId) =>
                    setSelectedRecipesByItem((prev) => ({
                      ...prev,
                      [itemId]: recipeId,
                    }))
                  }
                  markedAsBaseIds={markedAsBaseIds}
                  onToggleMarkedAsBase={(itemId) =>
                    setMarkedAsBaseIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(itemId)) next.delete(itemId);
                      else next.add(itemId);
                      return next;
                    })
                  }
                  preferredTagChoice={preferredTagChoice}
                  onCycleTagChoice={(tagId, nextItemId) =>
                    setPreferredTagChoice((prev) => ({
                      ...prev,
                      [tagId]: nextItemId,
                    }))
                  }
                  onResetOverrides={() => {
                    setSelectedRecipesByItem({});
                    setMarkedAsBaseIds(new Set());
                    setPreferredTagChoice({});
                  }}
                  bookmarks={bookmarkSet}
                  onSelectItem={(id) => navigateToItem(id, 'recipes')}
                  onViewUses={(id) => navigateToItem(id, 'uses')}
                  onHoverItem={handleHoverItem}
                />
              </div>

              {/* 3x3 Workbench View */}
              <div
                className={
                  mobileTab === 'saved'
                    ? 'block'
                    : centerMode === 'workbench'
                    ? 'hidden lg:block'
                    : 'hidden'
                }
              >
                <WorkbenchView
                  grid={workbenchGrid}
                  activeBrushItemId={workbenchBrush}
                  onSetGridSlot={(idx, itemId) =>
                    setWorkbenchGrid((prev) => {
                      const next = [...prev];
                      next[idx] = itemId;
                      return next;
                    })
                  }
                  onClearGrid={() => setWorkbenchGrid(Array(9).fill(null))}
                  onLoadQuickRecipe={handleLoadQuickRecipeInWorkbench}
                  bookmarks={bookmarkSet}
                  onSelectItem={(id) => navigateToItem(id, 'recipes')}
                  onViewUses={(id) => navigateToItem(id, 'uses')}
                  onHoverItem={handleHoverItem}
                />
              </div>
            </section>

            {/* Right Panel: Complete Vanilla 26.3 Item Index */}
            <div className={mobileTab === 'index' ? 'block lg:block' : 'hidden lg:block'}>
              <RightIndex
                searchInputRef={searchInputRef}
                query={searchQuery}
                onChangeQuery={setSearchQuery}
                categoryFilter={categoryFilter}
                onChangeCategoryFilter={setCategoryFilter}
                modFilter={modFilter}
                onChangeModFilter={setModFilter}
                selectedItemId={
                  centerMode === 'workbench' && workbenchBrush
                    ? workbenchBrush
                    : selectedItemId
                }
                bookmarks={bookmarkSet}
                workbenchBrushMode={centerMode === 'workbench'}
                onSelectItem={handleIndexItemSelect}
                onViewUses={(id) => navigateToItem(id, 'uses')}
                onOpenCraftTree={(id) => handleOpenCraftTree(id)}
                onHoverItem={handleHoverItem}
              />
            </div>
          </div>
        </main>

        {/* Mobile Bottom Thumb-Zone Navigation (Android) */}
        <nav
          aria-label="Mobile workspace navigation"
          className="fixed bottom-0 left-0 right-0 z-40 grid h-15 grid-cols-4 border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-[#222A37] dark:bg-[#11151C]/95 lg:hidden"
        >
          <button
            type="button"
            onClick={() => setMobileTab('index')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
              mobileTab === 'index'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Search className="h-5 w-5" />
            <span>Index</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (centerMode !== 'recipes' && centerMode !== 'uses') {
                setCenterMode('recipes');
              }
              setMobileTab('recipes');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
              mobileTab === 'recipes'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span>Recipes</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCenterMode('tree');
              setMobileTab('tree');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
              mobileTab === 'tree'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <GitBranch className="h-5 w-5" />
            <span>Craft Tree</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCenterMode('workbench');
              setMobileTab('saved');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
              mobileTab === 'saved'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Bookmark className="h-5 w-5" />
            <span>Saved</span>
          </button>
        </nav>

        <TooltipOverlay itemId={hovered.itemId} x={hovered.x} y={hovered.y} />
      </div>
    </RegistryContext.Provider>
  );
}
