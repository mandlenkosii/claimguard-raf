import { useQuery } from '@tanstack/react-query';
import { validateFile } from '@rules/fileValidation';
import { useRef, useState } from 'react';
import { FileDropzone, FileUploadItem, type UploadState } from '@/components/domain/Upload';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Choice';
import { Modal } from '@/components/ui/Overlay';
import { Select } from '@/components/ui/Select';
import { useOnlineStatus } from '@/components/ui/States';
import * as api from '@/features/documents/api';
import { fillMessage, TXT } from '@/lib/format/messages';

type Item = { id: number; file: File; state: UploadState };
type Props = { open: boolean; claimId: string; reference: string; onClose: () => void; onUploaded: (document: { id: string; filename: string }) => void };

function rejection(file: File): string | null {
  const check = validateFile(file);
  if (check.ok) return null;
  if (check.code === 'type') return fillMessage(TXT[24], { extension: check.extension });
  return check.code === 'too_large' ? TXT[23] : TXT[2];
}

/** M1. Files are checked here and again on the server (BR29). */
export function UploadDocumentModal({ open, claimId, reference, onClose, onUploaded }: Props) {
  const online = useOnlineStatus();
  const categories = useQuery({ queryKey: ['document-categories'], queryFn: api.getDocumentCategories, enabled: open });
  const [category, setCategory] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);

  const update = (id: number, state: UploadState) => setItems((current) => current.map((item) => (item.id === id ? { ...item, state } : item)));

  function addFiles(files: File[]) {
    setItems((current) => [
      ...current,
      ...files.map((file): Item => {
        const reason = rejection(file);
        return { id: nextId.current++, file, state: reason ? { kind: 'rejected', reason } : { kind: 'queued' } };
      }),
    ]);
  }

  async function uploadAll() {
    setBusy(true);
    for (const item of items.filter((candidate) => candidate.state.kind === 'queued')) {
      try {
        update(item.id, { kind: 'uploading', percent: 0 });
        const { documentId, versionId } = await api.uploadDocument({ claimId, category, file: item.file, onProgress: (percent) => update(item.id, { kind: 'uploading', percent }) });
        const result = await api.confirmUpload(versionId);
        if (result.ok) {
          update(item.id, { kind: 'confirmed' });
          onUploaded({ id: documentId, filename: item.file.name });
        } else {
          update(item.id, { kind: 'rejected', reason: result.code === 'rate_limited' ? TXT[56] : TXT[25] });
        }
      } catch {
        update(item.id, { kind: 'rejected', reason: TXT[25] });
      }
    }
    setBusy(false);
  }

  function close() {
    setItems([]);
    setCategory('');
    onClose();
  }

  const canUpload = Boolean(category) && online && items.some((item) => item.state.kind === 'queued');

  return (
    <Modal
      open={open}
      title="Upload document"
      description={`Add a document to claim ${reference}.`}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button disabled={!canUpload} loading={busy} onClick={() => void uploadAll()}>
            Upload
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Document category" name="category" required placeholder="" value={category} options={(categories.data ?? []).map((item) => ({ value: item.key, label: item.name }))} onChange={setCategory} />
        <FileDropzone onFiles={addFiles} disabled={busy} />
        {items.length ? (
          <div className="space-y-2">
            {items.map((item) => (
              <FileUploadItem key={item.id} name={item.file.name} state={item.state} />
            ))}
          </div>
        ) : null}
        {/* Document versions arrive in Phase 11 (Section 18 #12). */}
        <Checkbox label="This replaces an existing document (keeps the previous version)" checked={false} disabled onChange={() => {}} />
      </div>
    </Modal>
  );
}
