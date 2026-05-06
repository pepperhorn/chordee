import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { Library as LibraryIcon, Loader2, Search, X, Lock, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useChartStore } from "@/lib/store"
import { useAuthContext } from "@/lib/auth/AuthContext"
import { listLibraryPlugins } from "@/lib/library/registry"
import type { LibraryCollection, LibraryItem, LibraryAction } from "@/lib/library/librarySchema"
import { ACTION_KINDS } from "@/lib/library/librarySchema"
import { forkChart } from "@/lib/cloudShare"

interface LibraryProps {
  isOpen: boolean
  onClose: () => void
}

interface SourceState {
  pluginId: string
  pluginLabel: string
  collections: LibraryCollection[]
  loading: boolean
  error: string | null
}

function CardCover({ background, initial }: { background: string; initial: string }) {
  return (
    <div
      className="library-card-cover h-14 w-14 shrink-0 overflow-hidden rounded-md"
      style={{ background }}
    >
      <span className="library-card-cover-initial flex h-full w-full items-center justify-center text-lg font-bold text-white">
        {initial}
      </span>
    </div>
  )
}

function ItemCard({
  item,
  onActivate,
  onAction,
}: {
  item: LibraryItem
  onActivate: (item: LibraryItem) => void
  onAction: (item: LibraryItem, action: LibraryAction) => void
}) {
  const cover = item.card.cover || "linear-gradient(135deg, #94a3b8, #64748b)"
  const initial = (item.card.title || "?").charAt(0).toUpperCase()
  const primaryAction = item.actions[0]

  return (
    <div className="library-item flex items-center gap-3 rounded-lg border bg-background p-2 transition-colors hover:bg-muted/50">
      <button
        type="button"
        className="library-item-main flex flex-1 items-center gap-3 text-left"
        onClick={() => onActivate(item)}
      >
        <CardCover background={cover} initial={initial} />
        <div className="library-item-body min-w-0 flex-1">
          <div className="library-item-title truncate text-sm font-semibold">
            {item.card.title}
          </div>
          {item.card.subtitle && (
            <div className="library-item-subtitle truncate text-[11px] text-muted-foreground">
              {item.card.subtitle}
            </div>
          )}
          {item.card.meta.length > 0 && (
            <div className="library-item-meta truncate text-[11px] text-muted-foreground">
              {item.card.meta.join(" · ")}
            </div>
          )}
          {item.card.badges.length > 0 && (
            <div className="library-item-badges mt-1 flex flex-wrap gap-1">
              {item.card.badges.map((b) => (
                <span
                  key={b}
                  className="library-item-badge inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>
      {item.actions.length > 1 && primaryAction && (
        <div className="library-item-actions flex shrink-0 flex-col gap-1">
          {item.actions.slice(1).map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => onAction(item, action)}
              className="library-item-action rounded px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CollectionGroup({
  collection,
  onActivate,
  onAction,
}: {
  collection: LibraryCollection
  onActivate: (item: LibraryItem) => void
  onAction: (item: LibraryItem, action: LibraryAction) => void
}) {
  if (collection.items.length === 0) return null
  return (
    <section className="library-collection mb-6 break-inside-avoid">
      <header className="library-collection-header mb-2">
        <h4 className="library-collection-label text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {collection.label}
        </h4>
        {collection.description && (
          <p className="library-collection-description text-[11px] text-muted-foreground/80">
            {collection.description}
          </p>
        )}
      </header>
      <div className="library-collection-items flex flex-col gap-1.5">
        {collection.items.map((item) => (
          <ItemCard key={item.id} item={item} onActivate={onActivate} onAction={onAction} />
        ))}
      </div>
    </section>
  )
}

function LibraryImpl({ isOpen, onClose }: LibraryProps) {
  const auth = useAuthContext()
  const setChart = useChartStore((s) => s.setChart)
  const clearShareState = useChartStore((s) => s.clearShareState)
  const showToast = useChartStore((s) => s.showToast)
  const [sources, setSources] = useState<SourceState[]>([])
  const [query, setQuery] = useState("")

  const refresh = useCallback(async () => {
    const plugins = listLibraryPlugins()
    setSources(
      plugins.map((p) => ({
        pluginId: p.id,
        pluginLabel: p.label,
        collections: [],
        loading: true,
        error: null,
      })),
    )
    await Promise.all(
      plugins.map(async (p) => {
        try {
          const cols = await p.fetchCollections({ auth })
          setSources((prev) =>
            prev.map((s) => (s.pluginId === p.id ? { ...s, collections: cols, loading: false } : s)),
          )
        } catch (e) {
          setSources((prev) =>
            prev.map((s) =>
              s.pluginId === p.id ? { ...s, loading: false, error: (e as Error).message } : s,
            ),
          )
        }
      }),
    )
  }, [auth])

  useEffect(() => {
    if (isOpen) {
      setQuery("")
      void refresh()
    }
  }, [isOpen, refresh])

  // Filter items by query (matches title/subtitle).
  const filterCollections = useCallback(
    (cols: LibraryCollection[]): LibraryCollection[] => {
      const q = query.trim().toLowerCase()
      if (!q) return cols
      return cols
        .map((c) => ({
          ...c,
          items: c.items.filter(
            (item) =>
              item.card.title.toLowerCase().includes(q) ||
              item.card.subtitle.toLowerCase().includes(q),
          ),
        }))
        .filter((c) => c.items.length > 0)
    },
    [query],
  )

  const userSource = useMemo(() => sources.find((s) => s.pluginId === "user"), [sources])
  const browseSources = useMemo(() => sources.filter((s) => s.pluginId !== "user"), [sources])

  const handleActivate = useCallback(
    async (item: LibraryItem) => {
      const plugins = listLibraryPlugins()
      const plugin = plugins.find((p) => p.id === item.pluginId)
      if (!plugin) return
      try {
        await plugin.onActivate(item, undefined, { auth, setChart, showToast })
        clearShareState()
        onClose()
      } catch (e) {
        showToast?.((e as Error).message || "Couldn't open that item.", "error")
      }
    },
    [auth, setChart, clearShareState, showToast, onClose],
  )

  const handleAction = useCallback(
    async (item: LibraryItem, action: LibraryAction) => {
      const plugins = listLibraryPlugins()
      const plugin = plugins.find((p) => p.id === item.pluginId)
      if (!plugin) return
      try {
        if (action.kind === ACTION_KINDS.FORK_INTO_LIBRARY) {
          if (!auth.user || !auth.token) {
            showToast?.("Sign in to fork.", "warning")
            return
          }
          // First load the source payload, then fork.
          await plugin.onActivate(item, action, { auth, setChart, showToast })
          // Read the freshly loaded chart from the store.
          const current = useChartStore.getState().chart
          const fresh = await forkChart(current, auth.user.id, auth.token)
          setChart(fresh)
          clearShareState()
          showToast?.(`Forked as "${fresh.meta.title}"`, "info")
          onClose()
          return
        }
        await plugin.onActivate(item, action, { auth, setChart, showToast })
        clearShareState()
        onClose()
      } catch (e) {
        showToast?.((e as Error).message || "Action failed.", "error")
      }
    },
    [auth, setChart, clearShareState, showToast, onClose],
  )

  if (!isOpen) return null

  return (
    <>
      <div
        className="library-backdrop fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="library-panel fixed inset-0 z-50 flex flex-col bg-background">
        <header className="library-header flex shrink-0 items-center justify-between border-b px-6 py-4">
          <h2 className="library-title flex items-center gap-2 text-xl font-bold">
            <LibraryIcon className="h-5 w-5" />
            Library
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="library-close-btn flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            aria-label="Close library"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="library-search-bar shrink-0 border-b px-6 py-3">
          <div className="relative max-w-xl">
            <Search className="library-search-icon pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search charts, composers, styles…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="library-search pl-8"
            />
          </div>
        </div>

        <div className="library-content flex-1 overflow-y-auto px-6 py-6">
          <div className="library-grid mx-auto max-w-6xl">
            {/* Your Library */}
            <section className="library-your mb-8">
              <h3 className="library-your-heading mb-3 px-1 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Your Library
              </h3>
              {!auth.isLoggedIn ? (
                <div className="library-empty rounded-xl border border-dashed bg-background px-5 py-4 text-sm text-muted-foreground">
                  <Lock className="mr-1 inline h-4 w-4 -translate-y-0.5" />
                  Sign in to keep your charts in sync across devices.
                </div>
              ) : userSource?.loading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : userSource?.error ? (
                <p className="text-sm text-red-600">{userSource.error}</p>
              ) : userSource && filterCollections(userSource.collections).every((c) => c.items.length === 0) ? (
                <div className="library-empty rounded-xl border border-dashed bg-background px-5 py-4 text-sm text-muted-foreground">
                  No saved charts yet. Hit Save in the editor to add one here.
                </div>
              ) : (
                userSource &&
                filterCollections(userSource.collections).map((c) => (
                  <CollectionGroup
                    key={c.id}
                    collection={c}
                    onActivate={handleActivate}
                    onAction={handleAction}
                  />
                ))
              )}
            </section>

            {/* Browse */}
            <section className="library-browse">
              <h3 className="library-browse-heading mb-3 flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Browse Library
              </h3>
              <div className="library-browse-columns columns-1 gap-6 md:columns-2 lg:columns-3">
                {browseSources.map((source) => (
                  <div key={source.pluginId} className="library-browse-source mb-2 break-inside-avoid">
                    {source.loading ? (
                      <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading {source.pluginLabel}…
                      </div>
                    ) : source.error ? (
                      <p className="px-1 text-xs text-muted-foreground/70">
                        {source.pluginLabel}: unavailable
                      </p>
                    ) : (
                      filterCollections(source.collections).map((c) => (
                        <CollectionGroup
                          key={c.id}
                          collection={c}
                          onActivate={handleActivate}
                          onAction={handleAction}
                        />
                      ))
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}

export const Library = memo(LibraryImpl)
