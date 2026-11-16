'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { Structure } from '@atlas/shared';
import { api } from '@/lib/api';
import { SYSTEM_LABELS } from './LayerPanel';
import { groupResults, type ResultGroup } from './searchResults';
import { useViewerStore } from './store';

const SIDE_CHIP: Record<string, string> = { left: 'Izq.', right: 'Der.' };
const SIDE_LONG: Record<string, string> = { left: 'lado izquierdo', right: 'lado derecho' };
const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'range', 'button', 'submit', 'reset']);

/**
 * Accent-insensitive search over Latin, Spanish and English names, ranked by the API. Choosing a
 * structure turns its system on if needed, selects it and frames it; choosing a group ("Corazón")
 * turns its system on and frames the group. The two sides of one structure are listed together,
 * each with a side chip.
 */
export function SearchBox() {
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<ResultGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const listId = useId();
  const optionId = (i: number) => `${listId}-option-${i}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

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
          setGroups(groupResults(page.items));
          setTotal(page.total);
          setMore(page.total > page.items.length);
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

  // Keyboard shortcut: "/" focuses the search from anywhere outside a text field (a checkbox or
  // a slider with focus does not count as typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type)) ||
        target?.isContentEditable === true;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Options in keyboard order, flattened from the groups.
  const results = groups.flatMap((g) => g.items);

  // Keep the active option in view inside the list only; `scrollIntoView` would also move the page.
  useEffect(() => {
    const list = listRef.current;
    const option = list?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]');
    if (!list || !option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [active, groups]);

  const choose = (s: Structure) => {
    showSystem(s.system);
    // A group has no mesh to select: clear the selection so nothing else stays highlighted
    // (or dims the group) and frame the group's bounds.
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
      <div className="flex h-10 items-center gap-2 rounded-sm border border-hairline-strong bg-panel px-3 transition-colors focus-within:border-[#4a90e2] focus-within:bg-raised-2">
        <Search size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />
        <input
          ref={inputRef}
          id="structure-search"
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList && results[active] ? optionId(active) : undefined}
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
          className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <kbd className="hidden rounded-xs border border-hairline px-1 font-sans text-xs text-ink-faint sm:inline">
          /
        </kbd>
      </div>

      {showList ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Resultados"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-80 overflow-y-auto rounded-md border border-hairline bg-raised py-1 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
        >
          {effectiveStatus === 'error' ? (
            <li role="presentation" className="px-3 py-2 text-sm text-danger">
              La búsqueda no responde. Comprueba que el API esté en marcha.
            </li>
          ) : null}
          {effectiveStatus === 'idle' && results.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-sm text-ink-muted">
              {total > 0
                ? `${total} grupos coinciden, pero ninguno tiene geometría. Prueba con un hueso o un vaso.`
                : 'Ninguna estructura coincide.'}
            </li>
          ) : null}
          {groups.map((g, gi) => {
            const first = results.indexOf(g.items[0]);
            const rows = g.items.map((s, k) => {
              const i = first + k;
              const name = s.names.es || s.names.en;
              const side = SIDE_CHIP[s.laterality];
              return (
                <li
                  key={s.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  aria-label={side ? `${name}, ${SIDE_LONG[s.laterality]}` : undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(s)}
                  className={`flex min-h-10 cursor-pointer items-center gap-2 px-3 ${i === active ? 'bg-accent-soft' : ''}`}
                >
                  <span
                    className={`min-w-0 flex-1 truncate text-sm ${k > 0 ? 'text-ink-muted' : ''}`}
                  >
                    {name}
                    <span className="font-latin ml-1.5 text-ink-muted">{s.names.la}</span>
                  </span>
                  {k === 0 ? (
                    <span className="shrink-0 text-xs text-ink-faint">
                      {SYSTEM_LABELS[s.system]}
                      {s.meshId ? '' : ' · grupo'}
                    </span>
                  ) : null}
                  {side ? (
                    <span className="w-10 shrink-0 rounded-full border border-hairline-strong bg-raised-2 text-center text-xs leading-5 font-medium text-ink-strong">
                      {side}
                    </span>
                  ) : null}
                </li>
              );
            });
            const divider = gi > 0 ? 'border-t border-hairline' : '';
            // Both sides of one structure form one visual block (and an ARIA group); a single row
            // stands alone.
            return g.items.length > 1 ? (
              <li key={g.termKey} role="presentation" className={divider}>
                <ul role="group" aria-label={g.items[0].names.es || g.items[0].names.en}>
                  {rows}
                </ul>
              </li>
            ) : (
              <li key={g.termKey} role="presentation" className={divider}>
                <ul role="presentation">{rows}</ul>
              </li>
            );
          })}
          {results.length > 0 && more ? (
            <li role="presentation" className="px-3 pt-2 pb-1 text-xs text-ink-faint">
              {total} coincidencias; afina la búsqueda para ver más.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
