import { Lock } from 'lucide-react';
import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

export type TabItem = {
  id: string;
  label: string;
  count?: number;
  /** Permission-controlled tab: shows a lock icon. */
  locked?: boolean;
  /** Not rendered at all (e.g. Risk or Audit for a role without access). */
  hidden?: boolean;
};

type TabsProps = {
  label: string;
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Prefix used to link each tab to its panel: `${idPrefix}-tab-${id}` / `${idPrefix}-panel-${id}`. */
  idPrefix?: string;
};

export function Tabs({ label, tabs, activeId, onChange, idPrefix = 'tabs' }: TabsProps) {
  const visible = tabs.filter((tab) => !tab.hidden);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    let nextIndex: number | null = null;
    if (event.key in keys) nextIndex = (index + (keys[event.key] ?? 0) + visible.length) % visible.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = visible.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = visible[nextIndex];
    if (!next) return;
    onChange(next.id);
    refs.current[next.id]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-border">
      {visible.map((tab, index) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              refs.current[tab.id] = element;
            }}
            id={`${idPrefix}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={active ? 0 : -1}
            data-locked={tab.locked ? 'true' : undefined}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-body font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
              active ? 'border-accent text-primary' : 'border-transparent text-text-secondary hover:text-text',
            )}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className="rounded-full bg-surface-sunken px-2 text-small font-semibold text-primary">{tab.count}</span>
            ) : null}
            {tab.locked ? <Lock aria-hidden className="size-icon-sm" /> : null}
          </button>
        );
      })}
    </div>
  );
}
