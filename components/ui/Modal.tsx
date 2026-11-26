"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  maxWidthClass?: string;
  children: ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  maxWidthClass = "max-w-xl",
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pressedOutsideRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.setAttribute("closedby", "any");

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };

    // Progressive-enhancement fallback for browsers lacking HTMLDialogElement closedby="any"
    const isOutsideDialog = (e: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };

    const handlePointerDown = (e: PointerEvent) => {
      pressedOutsideRef.current = isOutsideDialog(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (
        !("closedBy" in HTMLDialogElement.prototype) &&
        pressedOutsideRef.current &&
        isOutsideDialog(e)
      ) {
        dialog.close();
      }
      pressedOutsideRef.current = false;
    };

    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={`m-auto w-[calc(100%-2rem)] ${maxWidthClass} rounded-lg border border-border-default bg-bg-primary p-0 text-text-primary open:flex open:flex-col max-h-[85vh]`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border-default px-5 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="text-base font-semibold tracking-tight text-text-primary">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-xs text-text-secondary leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close modal"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent text-text-secondary transition-colors hover:border-border-default hover:bg-bg-elevated hover:text-text-primary cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
      <div className="overflow-y-auto px-5 py-4">{children}</div>
    </dialog>
  );
}
