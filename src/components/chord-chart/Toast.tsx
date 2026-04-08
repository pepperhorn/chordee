import { useChartStore } from "@/lib/store"

export function Toast() {
  const toast = useChartStore((s) => s.ui.toast)
  const clearToast = useChartStore((s) => s.clearToast)

  if (!toast) return null

  const bgColor =
    toast.type === "error"
      ? "bg-destructive text-destructive-foreground"
      : toast.type === "warning"
        ? "bg-yellow-500/90 text-white"
        : "bg-foreground/90 text-background"

  return (
    <div
      className={`toast-notification fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md px-4 py-2 text-sm shadow-lg ${bgColor}`}
      role="status"
      aria-live="polite"
      onClick={clearToast}
    >
      <span className="toast-message">{toast.message}</span>
    </div>
  )
}
