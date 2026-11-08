import { act, fireEvent, render, screen } from '@testing-library/react';
import { FileText } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, ErrorState, OfflineBanner, Skeleton } from '@/components/ui/States';
import { TXT } from '@/lib/format/messages';

describe('T-C-21 EmptyState, Skeleton, ErrorState and OfflineBanner', () => {
  it('T-C-21 empty state has an icon, one line of guidance and an action', () => {
    const onAction = vi.fn();
    const { container } = render(
      <EmptyState icon={FileText} message={TXT[49]} action={{ label: 'Upload document', onClick: onAction }} />,
    );
    expect(screen.getByText(TXT[49])).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Upload document' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it.each(['table', 'card'] as const)('T-C-21 %s skeleton is a busy placeholder', (variant) => {
    render(<Skeleton variant={variant} />);
    const skeleton = screen.getByTestId(`skeleton-${variant}`);
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  });

  it('T-C-21 error state shows TXT-3 and "Try again"', () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByText(TXT[3])).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('T-C-21 offline banner shows TXT-1 only while offline', () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    render(<OfflineBanner />);
    expect(screen.queryByText(TXT[1])).toBeNull();

    onLine.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(TXT[1]);

    onLine.mockReturnValue(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByText(TXT[1])).toBeNull();
    onLine.mockRestore();
  });
});
