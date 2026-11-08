import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog, Drawer, Modal } from '@/components/ui/Overlay';

describe('T-C-19 Modal, Drawer and ConfirmDialog', () => {
  it('T-C-19 closed modal renders nothing', () => {
    render(
      <Modal open={false} title="Change claim status" onClose={() => {}}>
        <p>Body</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('T-C-19 open modal is a labelled modal dialog', () => {
    render(
      <Modal open title="Change claim status" onClose={() => {}}>
        <p>Body</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Change claim status' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('T-C-19 Escape, the close icon and Cancel close the modal', () => {
    const onClose = vi.fn();
    render(
      <Modal open title="Change claim status" onClose={onClose} footer={<button onClick={onClose}>Cancel</button>}>
        <input aria-label="Reason" />
      </Modal>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('T-C-19 focus moves into the modal and is trapped', () => {
    render(
      <Modal open title="Change claim status" onClose={() => {}} footer={<button>Confirm</button>}>
        <input aria-label="Reason" />
      </Modal>,
    );
    const close = screen.getByRole('button', { name: 'Close' });
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);

    confirm.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(document.activeElement).toBe(close);

    close.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirm);
  });

  it('T-C-19 drawer opens, closes on Escape and is a dialog', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Drawer open={false} title="New request" onClose={onClose}>
        <p>Form</p>
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <Drawer open title="New request" onClose={onClose}>
        <p>Form</p>
      </Drawer>,
    );
    const drawer = screen.getByRole('dialog', { name: 'New request' });
    expect(drawer).toHaveAttribute('data-overlay', 'drawer');
    fireEvent.keyDown(drawer, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('T-C-19 confirm dialog confirms and cancels', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Suspend account?"
        message="The user will lose access until reactivated."
        confirmLabel="Suspend"
        tone="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole('alertdialog', { name: 'Suspend account?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Suspend' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
