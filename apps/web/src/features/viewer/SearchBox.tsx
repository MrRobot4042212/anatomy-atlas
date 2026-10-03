'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { Structure } from '@atlas/shared';
import { api } from '@/lib/api';
import { SYSTEM_LABELS } from './LayerPanel';
import { useViewerStore } from './store';

const SIDE: Record<string, string> = { left: 'izquierda', right: 'derecha', midline: '' };

/**
 * Accent-insensitive search over Latin, Spanish and English names. Choosing a result turns its
 * system on if needed, selects it and frames it. Only structures with geometry are offered.
 */
export function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Structure[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const select = useViewerStore((s) => s.select);
  const focus = useViewerStore((s) => s.focus);
  const showSystem = useViewerStore((s) => s.showSystem);

  const tooShort = query.trim().length < 2;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return; // the list is hidden below two characters; stale results never show
    let cancelled = false;
    const timer = setTimeout(() => {
      setStatus('loading');
      api
        .search({ q, pageSize: 12 })
        .then((page) => {
          if (cancelled) return;
          setResults(page.items.filter((s) => s.meshId));
          setTotal(page.total);
          setActive(0);
          setStatus('idle');
        })
        .catch(() => {
          if (!cancelled) setStatus('error');
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Keyboard shortcut: "/" focuses the search from anywhere outside an input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && ['INPUT', 'TEXTAREA'].includes(target.tagName);
      if (e.key === '/' && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const choose = (s: Structure) => {
    if (!s.meshId) return;
    showSystem(s.system);
    select(s.meshId);
    focus(s.bounds);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && !tooShort;
  const effectiveStatus = tooShort ? 'idle' : status;

  return (
    <div className="relative w-full max-w-xl">
      <label className="sr-only" htmlFor="structure-search">
        Buscar estructura
      </label>
      <div className="flex h-8 items-center gap-2 rounded-sm border border-hairline bg-ground px-2.5 focus-within:border-hairline-strong">
        <Search size={14} className="shrink-0 text-ink-faint" aria-hidden="true" />
        <input
          ref={inputRef}
          id="structure-search"
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Buscar en latín, español o inglés"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <kbd className="hidden rounded-xs border border-hairline px-1 font-mono text-[10px] text-ink-faint sm:inline">
          /
        </kbd>
      </div>

      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-80 overflow-y-auto rounded-sm border border-hairline bg-panel py-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          {effectiveStatus === 'error' ? (
            <li className="px-3 py-2 text-xs text-danger">
              La búsqueda no responde. Comprueba que el API esté en marcha.
            </li>
          ) : null}
          {effectiveStatus === 'idle' && results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-ink-muted">
              {total > 0
                ? `${total} grupos coinciden, pero ninguno tiene geometría. Prueba con un hueso o un vaso.`
                : 'Ninguna estructura coincide.'}
            </li>
          ) : null}
          {results.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(s)}
              className={`flex cursor-pointer items-baseline gap-2 px-3 py-1.5 ${i === active ? 'bg-accent-soft' : ''}`}
            >
              <span className="min-w-0 flex-1 truncate text-[13px]">
                {s.names.es || s.names.en}
                <span className="font-latin ml-1.5 text-ink-muted">{s.names.la}</span>
              </span>
              <span className="shrink-0 text-[11px] text-ink-faint">
                {SYSTEM_LABELS[s.system]}
                {SIDE[s.laterality] ? ` · ${SIDE[s.laterality]}` : ''}
              </span>
            </li>
          ))}
          {results.length > 0 && total > results.length ? (
            <li className="px-3 pt-1 text-[11px] text-ink-faint">
              {total} coincidencias; afina la búsqueda para ver más.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
