import { useRef, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface BottomDialogProps {
  open: boolean;
  onDismiss: () => void;
  dismissOnBackdrop?: boolean;
  children: ReactNode;
}

export function BottomDialog({
  open,
  onDismiss,
  dismissOnBackdrop = false,
  children,
}: BottomDialogProps) {
  const opener = useRef<HTMLElement | null>(null);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onDismiss();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-60 bg-black/45 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="bottom-dialog z-60 bg-card rounded-3xl border border-border/50 p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4"
          onPointerDownOutside={(event) => {
            if (!dismissOnBackdrop) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (!dismissOnBackdrop) event.preventDefault();
          }}
          onOpenAutoFocus={() => {
            opener.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus({ preventScroll: true });
          }}
        >
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const BottomDialogTitle = Dialog.Title;
export const BottomDialogDescription = Dialog.Description;
