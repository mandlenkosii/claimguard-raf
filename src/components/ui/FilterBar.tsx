import { FilterX, Search } from 'lucide-react';
import { useId } from 'react';
import { Button } from './Button';
import { Toggle } from './Choice';
import { Select, type SelectOption } from './Select';

type FilterBarProps = {
  search?: { label: string; value: string; onChange: (value: string) => void; placeholder?: string };
  selects?: Array<{ label: string; value: string; options: SelectOption[]; onChange: (value: string) => void; placeholder?: string }>;
  toggles?: Array<{ label: string; checked: boolean; onChange: (checked: boolean) => void }>;
  onClear: () => void;
};

export function FilterBar({ search, selects = [], toggles = [], onClear }: FilterBarProps) {
  const searchId = useId();
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-4">
      {search ? (
        <div className="relative min-w-60 flex-1">
          <label htmlFor={searchId} className="sr-only">
            {search.label}
          </label>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-icon-sm -translate-y-1/2 text-text-secondary" />
          <input
            id={searchId}
            type="search"
            value={search.value}
            placeholder={search.placeholder}
            onChange={(event) => search.onChange(event.target.value)}
            className="h-button w-full rounded-input border border-border bg-surface-muted pl-9 pr-3 text-body text-text placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
      ) : null}
      {selects.map((select) => (
        <Select
          key={select.label}
          label={select.label}
          name={select.label}
          hideLabel
          value={select.value}
          options={select.options}
          placeholder={select.placeholder ?? select.label}
          onChange={select.onChange}
          className="min-w-44"
        />
      ))}
      {toggles.map((toggle) => (
        <div key={toggle.label} className="flex h-button items-center">
          <Toggle label={toggle.label} checked={toggle.checked} onChange={toggle.onChange} />
        </div>
      ))}
      <Button variant="ghost" icon={<FilterX aria-hidden className="size-icon-sm" />} onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}
