import { useEffect, useState, useCallback } from "react"
import { Cloud, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuthContext } from "@/lib/auth/AuthContext"
import { useChartStore } from "@/lib/store"
import { listCharts, loadChart, type ChartSaveSummary } from "@/lib/cloudSave"

interface CloudOpenDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CloudOpenDialog({ isOpen, onClose }: CloudOpenDialogProps) {
  const auth = useAuthContext()
  const setChart = useChartStore((s) => s.setChart)
  const [items, setItems] = useState<ChartSaveSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !auth.user || !auth.token) return
    setLoading(true)
    setError(null)
    listCharts(auth.user.id, auth.token)
      .then(setItems)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [isOpen, auth.user, auth.token])

  const handleOpen = useCallback(async (item: ChartSaveSummary) => {
    if (!auth.user || !auth.token) return
    setOpeningId(item.id)
    try {
      const chart = await loadChart(item.external_id, auth.user.id, auth.token)
      if (chart) {
        setChart(chart)
        onClose()
      } else {
        setError("Chart not found.")
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setOpeningId(null)
    }
  }, [auth.user, auth.token, setChart, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="cloud-open-dialog max-w-lg">
        <DialogHeader>
          <DialogTitle className="cloud-open-title flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Open from your account
          </DialogTitle>
          <DialogDescription className="cloud-open-description">
            Charts you've saved to your PepperHorn account.
          </DialogDescription>
        </DialogHeader>

        {!auth.isLoggedIn ? (
          <p className="cloud-open-empty text-sm text-muted-foreground">Sign in to see your saved charts.</p>
        ) : loading ? (
          <div className="cloud-open-loading flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <p className="cloud-open-error text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="cloud-open-empty text-sm text-muted-foreground">No saved charts yet.</p>
        ) : (
          <ul className="cloud-open-list flex max-h-96 flex-col gap-1 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="cloud-open-item">
                <button
                  type="button"
                  className="cloud-open-item-button flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
                  disabled={!!openingId}
                  onClick={() => handleOpen(item)}
                >
                  <span className="cloud-open-item-name font-medium">{item.name}</span>
                  <span className="cloud-open-item-date text-xs text-muted-foreground">
                    {new Date(item.date_updated).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="cloud-open-footer flex justify-end">
          <Button variant="ghost" onClick={onClose} className="cloud-open-cancel">Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
