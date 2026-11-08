import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Download, FileText, Lock, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useOutletContext, useParams } from 'react-router';
import { useAuth } from '@/app/auth';
import { StateChip } from '@/components/domain/StateChip';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { FilterBar } from '@/components/ui/FilterBar';
import { EmptyState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import * as api from '@/features/documents/api';
import { canUploadDocuments } from '@/lib/access/capabilities';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format/dates';
import { TXT } from '@/lib/format/messages';
import { UploadDocumentModal } from '@/modals/UploadDocumentModal';

const STATUS_OPTIONS = [
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'processing', label: 'Processing' },
  { value: 'processed', label: 'Processed' },
  { value: 'failed', label: 'Failed' },
  { value: 'review_required', label: 'Review required' },
];

/** S15. */
export function DocumentsTab() {
  const { id = '' } = useParams();
  const claim = useOutletContext<{ reference: string } | undefined>();
  const { session } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  const categories = useQuery({ queryKey: ['document-categories'], queryFn: api.getDocumentCategories });
  const documents = useQuery({
    queryKey: ['documents', id],
    queryFn: () => api.getClaimDocuments(id),
    // Keep the visible processing state current while the server works.
    refetchInterval: (query) => (query.state.data?.some((row) => row.processing_status === 'uploaded' || row.processing_status === 'processing') ? 3000 : false),
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['documents', id] });

  const retry = useMutation({ mutationFn: (documentId: string) => api.retryProcessing(documentId), onSuccess: refresh, onError: () => toast.show({ tone: 'error', message: TXT[2] }) });
  const review = useMutation({
    mutationFn: (documentId: string) => api.sendToManualReview(documentId),
    onSuccess: () => {
      toast.show({ tone: 'success', message: TXT[28] });
      refresh();
    },
    onError: () => toast.show({ tone: 'error', message: TXT[2] }),
  });

  async function download(row: api.ClaimDocumentRow) {
    try {
      window.open(await api.getDownloadUrl(row.storage_path), '_blank', 'noopener');
    } catch {
      toast.show({ tone: 'error', message: TXT[2] });
    }
  }

  const allowedToUpload = session ? canUploadDocuments(session) : false;
  const rows = documents.data ?? [];
  const visible = rows.filter((row) => (!category || row.category_key === category) && (!status || row.processing_status === status));
  const supplied = new Set(rows.map((row) => row.category_key));

  const columns: DataTableColumn<api.ClaimDocumentRow>[] = [
    { key: 'document', header: 'Document', render: (row) => row.filename },
    { key: 'category', header: 'Category', render: (row) => row.category_name },
    { key: 'uploader', header: 'Uploaded by', render: (row) => row.uploader_name },
    { key: 'uploaded', header: 'Uploaded', render: (row) => formatDate(row.uploaded_at) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div>
          <StateChip kind="document" state={row.processing_status} />
          {row.processing_error ? <p className="mt-1 max-w-xs text-small text-error">{row.processing_error}</p> : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <ul data-testid="required-documents" className="flex flex-wrap gap-2">
          {(categories.data ?? [])
            .filter((item) => item.is_required)
            .map((item) => {
              const present = supplied.has(item.key);
              return (
                <li key={item.key} data-supplied={present} className={cn('inline-flex items-center gap-1 rounded-chip px-2 py-1 text-small font-semibold', present ? 'bg-success-tint text-success' : 'bg-error-tint text-error')}>
                  {present ? <Check aria-hidden className="size-icon-sm" /> : <X aria-hidden className="size-icon-sm" />}
                  <span>{item.name}</span>
                </li>
              );
            })}
        </ul>
        {allowedToUpload ? (
          <Button icon={<Plus aria-hidden className="size-icon-sm" />} onClick={() => setUploading(true)}>
            Upload document
          </Button>
        ) : null}
      </div>

      <FilterBar
        selects={[
          { label: 'Category', value: category, onChange: setCategory, options: (categories.data ?? []).map((item) => ({ value: item.key, label: item.name })) },
          { label: 'Status', value: status, onChange: setStatus, options: STATUS_OPTIONS },
        ]}
        onClear={() => {
          setCategory('');
          setStatus('');
        }}
      />

      <DataTable
        caption="Documents"
        columns={columns}
        rows={visible}
        getRowId={(row) => row.document_id}
        getRowLabel={(row) => row.filename}
        status={documents.isPending ? 'loading' : documents.isError ? 'error' : 'ready'}
        onRetry={() => void documents.refetch()}
        empty={<EmptyState icon={FileText} message={TXT[49]} />}
        renderActions={(row) => (
          <div className="flex flex-wrap justify-end gap-2">
            {row.processing_status === 'failed' && allowedToUpload ? (
              <>
                <Button variant="secondary" onClick={() => retry.mutate(row.document_id)}>
                  Retry
                </Button>
                <Button variant="secondary" onClick={() => review.mutate(row.document_id)}>
                  Send to manual review
                </Button>
              </>
            ) : null}
            <Button variant="ghost" aria-label={`Download ${row.filename}`} icon={<Download aria-hidden className="size-icon-sm" />} onClick={() => void download(row)} />
          </div>
        )}
      />

      <p className="flex items-center gap-2 text-small text-text-secondary">
        <Lock aria-hidden className="size-icon-sm" />
        Documents are stored privately. Download links expire after 5 minutes.
      </p>

      <UploadDocumentModal open={uploading} claimId={id} reference={claim?.reference ?? ''} onClose={() => setUploading(false)} onUploaded={refresh} />
    </div>
  );
}

