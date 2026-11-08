import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Toast, ToastProvider, useToast } from '@/components/ui/Toast';
import { TXT } from '@/lib/format/messages';

describe('T-C-20 Toast', () => {
  it.each([
    ['success', 'status'],
    ['info', 'status'],
    ['warning', 'status'],
    ['error', 'alert'],
  ] as const)('T-C-20 %s toast uses role %s with an icon', (tone, role) => {
    render(<Toast tone={tone} message="Profile updated." onDismiss={() => {}} />);
    const toast = screen.getByRole(role);
    expect(toast).toHaveAttribute('data-tone', tone);
    expect(toast).toHaveTextContent('Profile updated.');
    expect(toast.querySelector('svg')).not.toBeNull();
  });

  it('T-C-20 toast can be dismissed', () => {
    const onDismiss = vi.fn();
    render(<Toast tone="info" message="Checks updated." onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('T-C-20 useToast shows a toast through the provider and it auto-dismisses', () => {
    vi.useFakeTimers();
    function Trigger() {
      const toast = useToast();
      return <button onClick={() => toast.show({ tone: 'success', message: TXT[13] })}>Save</button>;
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(TXT[13])).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.queryByText(TXT[13])).toBeNull();
    vi.useRealTimers();
  });
});
