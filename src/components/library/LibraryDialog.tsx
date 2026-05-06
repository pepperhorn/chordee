import { useEffect, useState, useCallback, useMemo } from "react"
import { Library as LibraryIcon, Loader2, GitFork, Eye, Globe, Lock, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthContext } from "@/lib/auth/AuthContext"
import { useChartStore } from "@/lib/store"
import { listCharts, loadChart, deleteChart, type ChartSaveSummary } from "@/lib/cloudSave"
import type { Visibility } from "@/lib/cloudShare"

interface LibraryDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface RichSaveSummary extends ChartSaveSummary {
  visibility?: Visibility
  forked_from?: string | null
}

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #ef4444, #f97316)",
  "linear-gradient(135deg, #f59e0b, #eab308)",
  "linear-gradient(135deg, #84cc16, #22c55e)",
  "linear-gradient(135deg, #14b8a6, #06b6d4)",
  "linear-gradient(135deg, #3b82f6, #6366f1)",
  "linear-gradient(135deg, #8b5cf6, #d946ef)",
  "linear-gradient(135deg, #ec4899, #f43f5e)",
]

function coverFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length]!
}

function VisibilityBadge({ visibility }: { visibility?: Visibility }) {
  if (!visibility || visibility === "private") {
    return (
      <span className="library-badge library-badge--private inline-flex items-center gap-1 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
        <Lock className="h-2.5 w-2.5" /> Private
      </span>
    )
  }
  if (visibility === "public") {
    return (
      <span className="library-badge library-badge--public inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <Globe className="h-2.5 w-2.5" /> Public
      </span>
    )
  }
  return (
    <span className="library-badge library-badge--shared inline-flex items-center gap-1 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
      <Eye className="h-2.5 w-2.5" />
      {visibility === "link_edit" ? "Link · edit" : "Link · view"}
    </span>
  )
}

export function LibraryDialog({ isOpen, onClose }: LibraryDialogProps) {
  const auth = useAuthContext()
  const setChart = useChartStore((s) => s.setChart)
  const clearShareState = useChartStore((s) => s.clearShareState)
  const showToast = useChartStore((s) => s.showToast)
  const [items, setItems] = useState<RichSaveSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    if (!auth.user || !auth.token) return
    setLoading(true)
    setError(null)
    listCharts(auth.user.id, auth.token)
      .then((rows) => setItems(rows as RichSaveSummary[]))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [auth.user, auth.token])

  useEffect(() => {
    if (isOpen) refresh()
  }, [isOpen, refresh])

  const handleOpen = useCallback(async (item: RichSaveSummary) => {
    if (!auth.user || !auth.token) return
    setOpeningId(item.id)
    try {
      const chart = await loadChart(item.external_id, auth.user.id, auth.token)
      if (!chart) {
        setError("Chart not found.")
        return
      }
      setChart(chart)
      clearShareState()
      onClose()
      showToast?.(`Opened "${item.name}"`, "info")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setOpeningId(null)
    }
  }, [auth.user, auth.token, setChart, clearShareState, onClose, showToast])

  const handleDelete = useCallback(async (item: RichSaveSummary) => {
    if (!auth.token) return
    try {
      await deleteChart(item.id, auth.token)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      setConfirmDeleteId(null)
      showToast?.(`Deleted "${item.name}"`, "info")
    } catch (e) {
      setError((e as Error).message)
    }
  }, [auth.token, showToast])

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    const q = query.toLowerCase()
    return items.filter((i) => i.name.toLowerCase().includes(q))
  }, [items, query])

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="library-dialog max-w-3xl">
        <DialogHeader>
          <DialogTitle className="library-title flex items-center gap-2">
            <LibraryIcon className="h-5 w-5" />
            My Library
          </DialogTitle>
          <DialogDescription className="library-description">
            {auth.isLoggedIn
              ? "Charts you've saved to your PepperHorn account."
              : "Sign in to see and manage your saved charts."}
          </DialogDescription>
        </DialogHeader>

        {auth.isLoggedIn && (
          <Input
            type="search"
            placeholder="Search charts…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="library-search"
          />
        )}

        {!auth.isLoggedIn ? (
          <p className="library-empty text-sm text-muted-foreground">Sign in to access your library.</p>
        ) : loading ? (
          <div className="library-loading flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <p className="library-error text-sm text-red-600">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="library-empty text-sm text-muted-foreground">
            {query ? "No matches." : "No saved charts yet. Hit Save in the editor to add one here."}
          </p>
        ) : (
          <div className="library-grid grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="library-card group flex items-stretch gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-muted/50"
              >
                <button
                  type="button"
                  className="library-card-cover h-14 w-14 shrink-0 rounded-md text-white"
                  style={{ background: coverFor(item.name) }}
                  onClick={() => handleOpen(item)}
                  disabled={!!openingId}
                  aria-label={`Open ${item.name}`}
                >
                  <span className="library-card-initials block text-center text-lg font-bold leading-[3.5rem]">
                    {item.name.charAt(0).toUpperCase()}
                  </span>
                </button>
                <div className="library-card-body flex min-w-0 flex-1 flex-col">
                  <button
                    type="button"
                    onClick={() => handleOpen(item)}
                    disabled={!!openingId}
                    className="library-card-title truncate text-left text-sm font-semibold hover:text-primary"
                  >
                    {item.name}
                  </button>
                  <span className="library-card-date text-[11px] text-muted-foreground">
                    Updated {new Date(item.date_updated).toLocaleDateString()}
                  </span>
                  <div className="library-card-meta mt-1 flex items-center gap-1.5">
                    <VisibilityBadge visibility={item.visibility} />
                    {item.forked_from && (
                      <span className="library-badge library-badge--fork inline-flex items-center gap-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        <GitFork className="h-2.5 w-2.5" /> Fork
                      </span>
                    )}
                  </div>
                </div>
                <div className="library-card-actions flex flex-col items-end justify-between opacity-0 transition-opacity group-hover:opacity-100">
                  {confirmDeleteId === item.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="destructive"
                        className="library-card-confirm-delete h-6 px-2 text-[11px]"
                        onClick={() => handleDelete(item)}
                      >
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="library-card-cancel-delete h-6 px-2 text-[11px]"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(item.id)}
                      className="library-card-delete-trigger rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Delete chart"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="library-footer flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose} className="library-close">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
