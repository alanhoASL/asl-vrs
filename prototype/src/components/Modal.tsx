import { useEffect, useRef, type ReactNode } from 'react';
import { pushDialogHost, removeDialogHost } from './dialogStack';

interface Props {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  id?: string;
  /** "modal" is centred; "drawer" slides in from the right and is full screen on mobile. */
  variant?: 'modal' | 'drawer';
  children: ReactNode;
}

/** Native <dialog> gives focus trapping, Escape handling and focus return for free. */
export function Modal({ open, onClose, labelledBy, describedBy, id, variant = 'modal', children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    const host = hostRef.current;
    if (!dialog || !host) return undefined;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return undefined;
    pushDialogHost(host);
    return () => removeDialogHost(host);
  }, [open]);

  return (
    <dialog
      ref={ref}
      id={id}
      className={`dialog dialog--${variant}`}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && <div className="dialog__inner">{children}</div>}
      <div ref={hostRef} className="dialog__alert-host" />
    </dialog>
  );
}
