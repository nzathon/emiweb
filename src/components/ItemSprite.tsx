import React from 'react';
import { RegistryContext } from '../context/RegistryContext';

interface ItemSpriteProps {
  itemId: string;
  size?: number;
  className?: string;
}

function resolveIconSrc(itemId: string, customIconUrl?: string): string | null {
  if (customIconUrl) {
    if (customIconUrl.startsWith('/api/icon/head/') && !customIconUrl.includes('?')) {
      return `${customIconUrl}?v=3`;
    }
    return customIconUrl;
  }
  if (!itemId || itemId.startsWith('#')) return null;
  const [ns, name] = itemId.includes(':') ? itemId.split(':') : ['minecraft', itemId];
  if (!ns || !name) return null;
  return `/api/icon/${encodeURIComponent(ns)}/${encodeURIComponent(name)}`;
}

export const ItemSprite: React.FC<ItemSpriteProps> = ({
  itemId,
  size = 28,
  className = '',
}) => {
  const registry = React.useContext(RegistryContext);
  const item = registry?.itemMap[itemId];
  const src = resolveIconSrc(itemId, item?.iconUrl);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    const label = (item?.name || itemId.replace(/^[^:]+:/, ''))
      .slice(0, 2)
      .toUpperCase();
    return (
      <span
        style={{ width: size, height: size }}
        className={`inline-flex items-center justify-center rounded bg-slate-700/40 font-mono text-[10px] font-bold text-slate-300 select-none shrink-0 ${className}`}
        aria-hidden="true"
      >
        {label}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={item?.name ?? itemId}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`pixelated object-contain shrink-0 select-none ${className}`}
    />
  );
};
