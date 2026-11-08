import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileDropzone, FileUploadItem } from '@/components/domain/Upload';

describe('T-C-23 FileDropzone and FileUploadItem', () => {
  it('T-C-23 the dropzone reports chosen and dropped files', () => {
    const onFiles = vi.fn();
    render(<FileDropzone onFiles={onFiles} />);
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Browse files'), { target: { files: [file] } });
    expect(onFiles).toHaveBeenCalledWith([file]);
    fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } });
    expect(onFiles).toHaveBeenCalledTimes(2);
  });

  it('T-C-23 a disabled dropzone ignores files', () => {
    const onFiles = vi.fn();
    render(<FileDropzone disabled onFiles={onFiles} />);
    fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [new File(['x'], 'a.pdf')] } });
    expect(onFiles).not.toHaveBeenCalled();
  });

  it('T-C-23 shows upload progress', () => {
    render(<FileUploadItem name="a.pdf" state={{ kind: 'uploading', percent: 64 }} />);
    expect(screen.getByText('Uploading 64%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '64');
  });

  it('T-C-23 shows the scanning state', () => {
    render(<FileUploadItem name="a.pdf" state={{ kind: 'scanning' }} />);
    expect(screen.getByText('Scanning for malware')).toBeInTheDocument();
  });

  it('T-C-23 shows confirmed with a tick', () => {
    render(<FileUploadItem name="a.pdf" state={{ kind: 'confirmed' }} />);
    expect(screen.getByText('Confirmed ✓')).toBeInTheDocument();
  });

  it('T-C-23 shows a rejected file with its reason', () => {
    render(<FileUploadItem name="a.exe" state={{ kind: 'rejected', reason: 'File type not supported (.exe)' }} />);
    expect(screen.getByText('File type not supported (.exe)')).toBeInTheDocument();
  });
});
