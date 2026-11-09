import { FileText } from 'lucide-react';

type DocumentPreviewProps = { filename: string; url?: string | null; page?: number | null; field?: string; value?: string | null };

/** A source document. Highlighted field boxes arrive with S16 (Section 18 #39). */
export function DocumentPreview({ filename, url, page, field, value }: DocumentPreviewProps) {
  const isImage = /\.(png|jpe?g)$/i.test(filename);
  return (
    <div data-testid="document-preview" className="overflow-hidden rounded-input border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-muted px-3 py-2">
        <span className="inline-flex items-center gap-1 text-small font-medium text-text">
          <FileText aria-hidden className="size-icon-sm" />
          <span>{filename}</span>
        </span>
        <span className="rounded-chip bg-warning-tint px-2 text-small font-semibold text-warning">SAMPLE</span>
      </div>
      {field ? (
        <div className="border-t border-border px-3 py-2">
          <p className="text-small text-text-secondary">{page ? `${field} · Page ${page}` : field}</p>
          {value ? <p className="font-mono text-mono text-primary">{value}</p> : null}
        </div>
      ) : null}
      {url && isImage ? <img src={url} alt={filename} className="max-h-96 w-full object-contain" /> : null}
      {url && !isImage ? <iframe src={`${url}${page ? `#page=${page}` : ''}`} title={filename} className="h-96 w-full border-t border-border" /> : null}
    </div>
  );
}
