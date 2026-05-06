import { useEffect, useState } from "react"
import { Cloud, Copy, Check, Lock, Eye, Globe, Share2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useChartStore } from "@/lib/store"
import { useAuthContext } from "@/lib/auth/AuthContext"
import { saveChart } from "@/lib/cloudSave"
import {
  createOwnedShortcode,
  createAnonymousShortcode,
  shareUrl,
  type Visibility,
} from "@/lib/cloudShare"

interface ShareDialogProps {
  isOpen: boolean
  onClose: () => void
}

const VISIBILITY_OPTIONS: Array<{
  value: Exclude<Visibility, "private">
  label: string
  hint: string
  Icon: typeof Lock
}> = [
  { value: "link_view", label: "Anyone with the link can view", hint: "View only — they can fork a copy.", Icon: Eye },
  // link_edit deferred until concurrency story is in place
  { value: "public", label: "Public", hint: "Anyone with the link can view; we may list it publicly later.", Icon: Globe },
]

export function ShareDialog({ isOpen, onClose }: ShareDialogProps) {
  const auth = useAuthContext()
  const chart = useChartStore((s) => s.chart)
  const [visibility, setVisibility] = useState<Exclude<Visibility, "private">>("link_view")
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setCode(null)
      setError(null)
      setCopied(false)
    }
  }, [isOpen])

  const handleCreate = async () => {
    setBusy(true)
    setError(null)
    try {
      let nextCode: string
      if (auth.isLoggedIn && auth.user && auth.token) {
        // Persist the chart first so the save row exists.
        await saveChart(chart, auth.user.id, auth.token)
        nextCode = await createOwnedShortcode({
          chart,
          ownerId: auth.user.id,
          token: auth.token,
          visibility,
        })
      } else {
        nextCode = await createAnonymousShortcode(chart)
      }
      setCode(nextCode)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const url = code ? shareUrl(code) : ""

  const handleCopy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError("Couldn't copy to clipboard.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="share-dialog max-w-md">
        <DialogHeader>
          <DialogTitle className="share-dialog-title flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share this chart
          </DialogTitle>
          <DialogDescription className="share-dialog-description">
            {auth.isLoggedIn
              ? "Create a link your collaborators can open. You stay the owner — saves go back to your account."
              : "Sign in to keep ownership and edit the share later. Or create an anonymous one-shot link below."}
          </DialogDescription>
        </DialogHeader>

        {!code ? (
          <>
            {auth.isLoggedIn && (
              <div className="share-visibility flex flex-col gap-2">
                {VISIBILITY_OPTIONS.map(({ value, label, hint, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setVisibility(value)}
                    className={`share-visibility-option flex items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                      visibility === value
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-muted"
                    }`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{label}</span>
                      <span className="text-xs text-muted-foreground">{hint}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {error && <p className="share-error text-sm text-red-600">{error}</p>}

            <div className="share-actions flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={busy} className="share-cancel">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={busy} className="share-create gap-2">
                <Cloud className="h-4 w-4" />
                {busy ? "Creating link…" : auth.isLoggedIn ? "Create share link" : "Create anonymous link"}
              </Button>
            </div>
          </>
        ) : (
          <div className="share-result flex flex-col gap-3">
            <div className="share-url flex items-stretch gap-2">
              <input
                type="text"
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="share-url-input flex-1 rounded-md border bg-background px-3 py-2 text-sm font-mono"
              />
              <Button onClick={handleCopy} className="share-copy gap-1.5">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="share-hint text-xs text-muted-foreground">
              {auth.isLoggedIn
                ? "Updates to this chart are visible at this link. To stop sharing, set visibility to Private from the Library."
                : "This link contains a snapshot of the chart. Sign in to keep editing it under your account."}
            </p>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={onClose} className="share-done">Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
