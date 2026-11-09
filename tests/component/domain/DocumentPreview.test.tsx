import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DocumentPreview } from '@/components/domain/DocumentPreview';

describe('T-C-31 DocumentPreview', () => {
  it('T-C-31 shows the SAMPLE label, document and referenced field', () => {
    render(<DocumentPreview filename="accident_report_SAMPLE.pdf" url={null} page={1} field="Accident date" value="2026-03-12" />);
    expect(screen.getByText('SAMPLE')).toBeInTheDocument();
    expect(screen.getByText('accident_report_SAMPLE.pdf')).toBeInTheDocument();
    expect(screen.getByText('Accident date · Page 1')).toBeInTheDocument();
    expect(screen.getByText('2026-03-12')).toBeInTheDocument();
  });

  it('T-C-31 a PDF opens at the referenced page', () => {
    render(<DocumentPreview filename="a.pdf" url="https://example.com/a.pdf" page={2} />);
    expect(screen.getByTitle('a.pdf')).toHaveAttribute('src', 'https://example.com/a.pdf#page=2');
  });

  it('T-C-31 an image is shown as an image', () => {
    render(<DocumentPreview filename="a.png" url="https://example.com/a.png" />);
    expect(screen.getByRole('img', { name: 'a.png' })).toHaveAttribute('src', 'https://example.com/a.png');
  });
});
