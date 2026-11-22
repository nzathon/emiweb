import React from 'react';
import { useRegistry } from '../context/RegistryContext';
import { RecipeSlot } from '../types/emi';
import { resolveSlotCandidates } from '../utils/craftTree';
import { ItemSprite } from './ItemSprite';

interface ItemSlotProps {
  itemId: RecipeSlot;
  count?: number;
  size?: 'sm' | 'md' | 'lg';
  isSelected?: boolean;
  isBookmarked?: boolean;
  isDimmed?: boolean;
  onSelect?: (itemId: string) => void;
  onViewUses?: (itemId: string) => void;
  onHover?: (itemId: string | null, rect?: DOMRect, clientX?: number, clientY?: number) => void;
  onEmptyClick?: () => void;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-10 h-10 sm:w-9 sm:h-9',
  md: 'w-11 h-11',
  lg: 'w-13 h-13',
};

const SPRITE_SIZES = {
  sm: 24,
  md: 28,
  lg: 34,
};

export const ItemSlot: React.FC<ItemSlotProps> = ({
  itemId,
  count,
  size = 'md',
  isSelected = false,
  isBookmarked = false,
  isDimmed = false,
  onSelect,
  onViewUses,
  onHover,
  onEmptyClick,
  className = '',
}) => {
  const registry = useRegistry();
  const candidates = React.useMemo(
    () => resolveSlotCandidates(itemId, registry.tags),
    [itemId, registry.tags]
  );

  const [cycleIndex, setCycleIndex] = React.useState(0);

  React.useEffect(() => {
    setCycleIndex(0);
    if (candidates.length <= 1) return;
    const timer = window.setInterval(() => {
      setCycleIndex((prev) => (prev + 1) % candidates.length);
    }, 1200);
    return () => window.clearInterval(timer);
  }, [candidates]);

  const activeItemId = candidates[cycleIndex] ?? (typeof itemId === 'string' ? itemId : null);
  const item = activeItemId ? registry.itemMap[activeItemId] : undefined;

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!activeItemId || !onHover) return;
    onHover(activeItemId, e.currentTarget.getBoundingClientRect(), e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!activeItemId || !onHover) return;
    onHover(activeItemId, e.currentTarget.getBoundingClientRect(), e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    if (onHover) onHover(null);
  };

  const handleClick = () => {
    if (activeItemId && onSelect) {
      onSelect(activeItemId);
    } else if (!activeItemId && onEmptyClick) {
      onEmptyClick();
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (activeItemId && onViewUses) {
      e.preventDefault();
      onViewUses(activeItemId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label={item ? `${item.name}${count && count > 1 ? ` (${count})` : ''}` : 'Empty slot'}
      className={`relative inline-flex items-center justify-center rounded border transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        SIZE_CLASSES[size]
      } ${
        isSelected
          ? 'border-emerald-500 bg-emerald-500/15 dark:bg-emerald-500/15'
          : 'border-slate-300 bg-slate-100/90 hover:border-slate-400 hover:bg-slate-200/70 dark:border-[#2C3545] dark:bg-[#191F29] dark:hover:border-emerald-500/60 dark:hover:bg-[#232B38]'
      } ${isDimmed ? 'opacity-45' : ''} ${
        !activeItemId && !onEmptyClick ? 'cursor-default' : 'cursor-pointer'
      } ${className}`}
    >
      {activeItemId && (
        <>
          <ItemSprite itemId={activeItemId} size={SPRITE_SIZES[size]} />
          {count !== undefined && count > 1 && (
            <span className="pointer-events-none absolute right-0.5 bottom-0 rounded bg-slate-950/75 px-1 font-mono text-[10px] font-semibold leading-tight text-white tabular-nums">
              {count}
            </span>
          )}
          {candidates.length > 1 && (
            <span
              className="pointer-events-none absolute top-0.5 left-0.5 h-1.5 w-1.5 rounded-xs bg-sky-400"
              aria-hidden="true"
            />
          )}
          {isBookmarked && (
            <span
              className="pointer-events-none absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-xs bg-amber-400"
              aria-hidden="true"
            />
          )}
        </>
      )}
    </button>
  );
};
