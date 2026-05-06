import { useState } from "react"
import { Cloud, Download, FilePlus, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useChartStore } from "@/lib/store"
import { useAuthContext } from "@/lib/auth/AuthContext"
import { downloadFile } from "@/lib/io"
import { saveChart } from "@/lib/cloudSave"
import { createEmptyChart } from "@/lib/utils"

interface NewScoreDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function NewScoreDialog({ isOpen, onClose }: NewScoreDialogProps) {
  const chart = useChartStore((s) => s.chart)
  const setChart = useChartStore((s) => s.setChart)
  const exportJSON = useChartStore((s) => s.exportJSON)
  const auth = useAuthContext()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setChart(createEmptyChart())
    onClose()
  }

  const handleSaveAndNew = async () => {
    if (!auth.user || !auth.token) return
    setSaving(true)
    setError(null)
    try {
      await saveChart(chart, auth.user.id, auth.token)
      reset()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleExportAndNew = () => {
    const json = exportJSON()
    downloadFile(json, `${chart.meta.title || "chart"}.json`, "application/json")
    reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="new-score-dialog max-w-md">
        <DialogHeader>
          <DialogTitle className="new-score-title flex items-center gap-2">
            <FilePlus className="h-5 w-5" />
            Start a new chart?
          </DialogTitle>
          <DialogDescription className="new-score-description">
            Your current chart will be replaced. Save first if you want to keep it.
          </DialogDescription>
        </DialogHeader>

        <div className="new-score-actions flex flex-col gap-2">
          <Button
            type="button"
            disabled={!auth.isLoggedIn || saving}
            onClick={handleSaveAndNew}
            className="new-score-save-account justify-start gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
            <span className="flex flex-col items-start">
              <span className="text-sm font-semibold">Save to your account</span>
              <span className="text-xs opacity-80">
                {auth.isLoggedIn ? `Signed in as ${auth.user?.email}` : "Sign in required — coming when you sign in"}
              </span>
            </span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={handleExportAndNew}
            className="new-score-export-json justify-start gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="flex flex-col items-start">
              <span className="text-sm font-semibold">Export current chart (JSON)</span>
              <span className="text-xs opacity-80">Download a backup, then start fresh</span>
            </span>
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={reset}
            className="new-score-discard justify-start gap-2"
          >
            <FilePlus className="h-4 w-4" />
            <span className="flex flex-col items-start">
              <span className="text-sm font-semibold">Continue without saving</span>
              <span className="text-xs opacity-80">Discard the current chart</span>
            </span>
          </Button>

          {error && <p className="new-score-error text-sm text-red-600">{error}</p>}

          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="new-score-cancel"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
