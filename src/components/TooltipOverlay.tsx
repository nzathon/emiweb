import React from 'react';
import { useRegistry } from '../context/RegistryContext';
import { ItemRarity } from '../types/emi';

interface TooltipOverlayProps {
  itemId: string | null;
  x: number;
  y: number;
}

const RARITY_COLOR: Record<ItemRarity, string> = {
  common: 'text-slate-100',
  uncommon: 'text-amber-300',
  rare: 'text-cyan-300',
  epic: 'text-fuchsia-300',
};

export const TooltipOverlay: React.FC<TooltipOverlayProps> = ({ itemId, x, y }) => {
  const registry = useRegistry();
  if (!itemId) return null;
  const item = registry.itemMap[itemId];
  if (!item) return null;

  const rarityClass = RARITY_COLOR[item.rarity ?? 'common'];
  const modLabel = item.mod === 'minecraft' ? 'Minecraft' : item.mod;

  const estimatedWidth = 276;
  const estimatedHeight = 140;
  const left =
    typeof window !== 'undefined' && x + estimatedWidth + 24 > window.innerWidth
      ? Math.max(12, x - estimatedWidth - 14)
      : x + 16;
  const top =
    typeof window !== 'undefined' && y + estimatedHeight + 24 > window.innerHeight
      ? Math.max(12, y - estimatedHeight - 10)
      : y + 14;

  return (
    <div
      role="tooltip"
      style={{
        transform: `translate3d(${left}px, ${top}px, 0)`,
      }}
      className="pointer-events-none fixed top-0 left-0 z-50 w-[272px] rounded-md border border-[#3B2E58] bg-[#100D18]/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur-sm"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-display text-sm font-semibold ${rarityClass}`}>
          {item.name}
        </span>
        <span className="font-mono text-[10px] text-indigo-300/80 shrink-0 capitalize">
          {modLabel}
        </span>
      </div>

      <div className="mt-0.5 font-mono text-[11px] text-slate-400 truncate">
        {item.id}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
        <span>Stack: {item.stackSize}</span>
        <span aria-hidden="true">·</span>
        <span>{item.isBlock ? 'Block' : 'Item'}</span>
        {item.tags.length > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-400 truncate">
              {item.tags.slice(0, 2).join(' ')}
            </span>
          </>
        )}
      </div>

      <div className="mt-2 border-t border-white/10 pt-1.5 font-mono text-[10px] text-emerald-300/90">
        [L-Click / R] Recipes · [R-Click / U] Uses · [A] Save · [T] Tree
      </div>
    </div>
  );
};
