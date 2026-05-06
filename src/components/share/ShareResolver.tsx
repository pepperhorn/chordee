import { useEffect, useRef } from "react"
import { useChartStore } from "@/lib/store"
import { useAuthContext } from "@/lib/auth/AuthContext"
import { resolveShortcode } from "@/lib/cloudShare"

const SHARE_PATH = /^\/c\/([A-Za-z0-9]+)\/?$/

/** Mounts inside the editor. On first render checks if the URL is a
 *  /c/<code> deep link and, if so, resolves the share into the store
 *  with read-only/fork flags set appropriately.
 *
 *  Waits for auth to finish loading first so we can correctly tell
 *  ownership from anonymous viewing. */
export function ShareResolver() {
  const auth = useAuthContext()
  const setChart = useChartStore((s) => s.setChart)
  const setShareState = useChartStore((s) => s.setShareState)
  const showToast = useChartStore((s) => s.showToast)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    if (auth.isLoading) return
    if (typeof window === "undefined") return

    const match = window.location.pathname.match(SHARE_PATH)
    if (!match) return
    const code = match[1]
    ranRef.current = true

    resolveShortcode({
      code,
      token: auth.token,
      userId: auth.user?.id ?? null,
    })
      .then((resolved) => {
        if (!resolved) {
          showToast?.("This share link isn't available.", "warning")
          return
        }
        setChart(resolved.chart)
        setShareState({
          readOnly: !resolved.canEdit,
          canFork: resolved.canFork,
          activeShare: {
            code: resolved.shortcode,
            visibility: resolved.visibility,
            ownerId: resolved.ownerId,
            source: resolved.source,
          },
        })
        if (resolved.canEdit && !resolved.isOwner) {
          showToast?.("You're editing a shared chart. Saves go to the original.", "info")
        }
      })
      .catch(() => {
        showToast?.("Couldn't load this share link.", "error")
      })
  }, [auth.isLoading, auth.token, auth.user?.id, setChart, setShareState, showToast])

  return null
}
