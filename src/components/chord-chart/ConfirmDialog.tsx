import { Button } from "@/components/ui/button"

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  destructive = true,
}: ConfirmDialogProps) {
  return (
    <div
      className="confirm-dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="confirm-dialog rounded-lg border bg-popover p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <h3
          id="confirm-title"
          className="confirm-dialog-title text-base font-semibold text-foreground"
        >
          {title}
        </h3>
        <p
          id="confirm-message"
          className="confirm-dialog-message mt-2 text-sm text-muted-foreground"
        >
          {message}
        </p>
        <div className="confirm-dialog-actions mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="confirm-dialog-cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            size="sm"
            className="confirm-dialog-confirm"
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
