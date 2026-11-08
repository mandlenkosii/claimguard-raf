import { ACCEPTED_EXTENSIONS } from '@rules/fileValidation';
import { Check, FileText, LoaderCircle, UploadCloud, X } from 'lucide-react';
import { useId, useState, type DragEvent } from 'react';
import { cn } from '@/lib/cn';

/** Drop zone for M1, S15 and S22. */
export function FileDropzone({ onFiles, disabled }: { onFiles: (files: File[]) => void; disabled?: boolean }) {
  const id = useId();
  const [over, setOver] = useState(false);

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    if (!disabled) onFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div
      data-testid="dropzone"
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn('flex flex-col items-center gap-2 rounded-card border border-dashed p-6 text-center', over ? 'border-accent bg-surface-muted' : 'border-border', disabled && 'opacity-60')}
    >
      <UploadCloud aria-hidden className="size-icon text-accent" />
      <p className="text-body text-text">
        Drag and drop files here, or{' '}
        <label htmlFor={id} className="cursor-pointer font-semibold text-accent underline">
          Browse files
        </label>
      </p>
      <p className="text-small text-text-secondary">PDF, JPG or PNG, up to 10 MB per file.</p>
      <input
        id={id}
        type="file"
        multiple
        disabled={disabled}
        accept={ACCEPTED_EXTENSIONS.join(',')}
        className="sr-only"
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = '';
        }}
      />
    </div>
  );
}

export type UploadState =
  | { kind: 'queued' }
  | { kind: 'uploading'; percent: number }
  | { kind: 'scanning' }
  | { kind: 'confirmed' }
  | { kind: 'rejected'; reason: string };

/** One file's progress. "Confirmed" only ever appears after the server confirms the upload (BR28). */
export function FileUploadItem({ name, state }: { name: string; state: UploadState }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border p-3">
      <FileText aria-hidden className="size-icon shrink-0 text-text-secondary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium text-text">{name}</p>
        {state.kind === 'uploading' ? (
          <>
            <p className="text-small text-text-secondary">{`Uploading ${state.percent}%`}</p>
            <progress aria-label={`Uploading ${name}`} aria-valuenow={state.percent} max={100} value={state.percent} className="mt-1 h-1 w-full accent-accent" />
          </>
        ) : null}
        {state.kind === 'scanning' ? (
          <p className="flex items-center gap-1 text-small text-text-secondary">
            <LoaderCircle aria-hidden className="size-icon-sm animate-spin" />
            Scanning for malware
          </p>
        ) : null}
        {state.kind === 'confirmed' ? (
          <p className="flex items-center gap-1 text-small font-medium text-success">
            <Check aria-hidden className="size-icon-sm" />
            Confirmed ✓
          </p>
        ) : null}
        {state.kind === 'rejected' ? (
          <p className="flex items-center gap-1 text-small text-error">
            <X aria-hidden className="size-icon-sm" />
            <span>{state.reason}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
