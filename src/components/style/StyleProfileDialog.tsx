import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useChartStore } from "@/lib/store"
import { useAuthContext } from "@/lib/auth/AuthContext"
import {
  METRIC_DEFS,
  METRIC_GROUP_LABELS,
  metricDefault,
  smuflFontFor,
  SMUFL_FONTS,
  type GlyphMetricKey,
  type MetricDef,
  type MetricGroup,
} from "@/lib/glyphs/registry"
import { buildUserStyle, type StyleProfile } from "@/lib/userStyle"
import {
  listLocalProfiles,
  saveLocalProfile,
  deleteLocalProfile,
  makeProfile,
  nameIsTaken,
  getActiveProfileId,
  setActiveProfileId,
} from "@/lib/styleProfiles"
import {
  saveCloudProfile,
  listCloudProfiles,
  deleteCloudProfile,
} from "@/lib/styleProfileCloud"
import { Cloud, HardDrive, RotateCcw, Trash2, Check } from "lucide-react"

interface StyleProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const GROUP_ORDER: MetricGroup[] = ["engraving", "slash", "type"]

/** Format a metric for display in its own unit. */
function formatValue(def: MetricDef, value: number): string {
  if (def.unit === "px") return `${Math.round(value)}`
  return value.toFixed(2)
}

export function StyleProfileDialog({ open, onOpenChange }: StyleProfileDialogProps) {
  const auth = useAuthContext()
  const showToast = useChartStore((s) => s.showToast)

  const glyphOverrides = useChartStore((s) => s.ui.glyphOverrides)
  const setGlyphOverrides = useChartStore((s) => s.setGlyphOverrides)
  const resetGlyphOverrides = useChartStore((s) => s.resetGlyphOverrides)
  const setFontConfig = useChartStore((s) => s.setFontConfig)
  const setJustificationStrategy = useChartStore((s) => s.setJustificationStrategy)
  const setMeasuresPerLineMode = useChartStore((s) => s.setMeasuresPerLineMode)

  const fontConfig = useChartStore((s) => s.ui.fontConfig)
  const justification = useChartStore((s) => s.ui.justificationStrategy)
  const measuresMode = useChartStore((s) => s.ui.measuresPerLineMode)
  const measuresPerLine = useChartStore((s) => s.chart.meta.measuresPerLine)
  const paperTexture = useChartStore((s) => s.ui.paperTexture)
  const bgColor = useChartStore((s) => s.ui.bgColor)

  const smuflFont = smuflFontFor(fontConfig.clef)

  const [profileName, setProfileName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [localProfiles, setLocalProfiles] = useState<StyleProfile[]>([])
  const [cloudProfiles, setCloudProfiles] = useState<StyleProfile[]>([])
  const [cloudBusy, setCloudBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  const refreshLocal = useCallback(() => {
    setLocalProfiles(listLocalProfiles())
  }, [])

  const refreshCloud = useCallback(async () => {
    if (!auth.isLoggedIn || !auth.user || !auth.token) {
      setCloudProfiles([])
      return
    }
    setCloudBusy(true)
    try {
      setCloudProfiles(await listCloudProfiles(auth.user.id, auth.token))
    } catch (err) {
      console.warn("[StyleProfileDialog] cloud list failed:", err)
      showToast("Couldn't load account profiles", "warning")
    } finally {
      setCloudBusy(false)
    }
  }, [auth.isLoggedIn, auth.user, auth.token, showToast])

  useEffect(() => {
    if (!open) return
    refreshLocal()
    void refreshCloud()
    const active = getActiveProfileId()
    if (active) {
      const match = listLocalProfiles().find((p) => p.id === active)
      if (match) {
        setEditingId(match.id)
        setProfileName(match.name)
      }
    }
  }, [open, refreshLocal, refreshCloud])

  /** The style currently in the editor, as a saveable object. */
  const currentStyle = useMemo(
    () =>
      buildUserStyle(
        fontConfig,
        measuresMode,
        measuresPerLine,
        justification,
        profileName.trim() || undefined,
        { texture: paperTexture, bgColor },
        glyphOverrides,
      ),
    [
      fontConfig,
      measuresMode,
      measuresPerLine,
      justification,
      profileName,
      paperTexture,
      bgColor,
      glyphOverrides,
    ],
  )

  const applyProfile = useCallback(
    (profile: StyleProfile) => {
      setFontConfig(profile.fonts)
      setJustificationStrategy(profile.layout.justification)
      setMeasuresPerLineMode(profile.layout.measuresPerLineMode)
      resetGlyphOverrides()
      if (profile.glyphs) setGlyphOverrides(profile.glyphs)
      setEditingId(profile.id)
      setProfileName(profile.name)
      setActiveProfileId(profile.id)
      showToast(`Loaded "${profile.name}"`, "info")
    },
    [
      setFontConfig,
      setJustificationStrategy,
      setMeasuresPerLineMode,
      resetGlyphOverrides,
      setGlyphOverrides,
      showToast,
    ],
  )

  const validateName = useCallback((): string | null => {
    const name = profileName.trim()
    if (!name) return "Give the profile a name first"
    if (name.length > 60) return "Name is too long (60 characters max)"
    if (nameIsTaken(name, editingId ?? undefined)) return `"${name}" already exists`
    return null
  }, [profileName, editingId])

  const handleSaveLocal = useCallback(() => {
    const problem = validateName()
    if (problem) {
      showToast(problem, "warning")
      return
    }
    const profile = makeProfile(profileName, currentStyle, editingId ?? undefined)
    if (!saveLocalProfile(profile)) {
      showToast("Couldn't save — browser storage is unavailable or full", "error")
      return
    }
    setEditingId(profile.id)
    setActiveProfileId(profile.id)
    refreshLocal()
    showToast(`Saved "${profile.name}" to this device`, "info")
  }, [validateName, profileName, currentStyle, editingId, refreshLocal, showToast])

  const handleSaveCloud = useCallback(async () => {
    if (!auth.isLoggedIn || !auth.user || !auth.token) {
      showToast("Sign in to save profiles to your account", "warning")
      return
    }
    const problem = validateName()
    if (problem) {
      showToast(problem, "warning")
      return
    }
    setSaving(true)
    try {
      const profile = makeProfile(profileName, currentStyle, editingId ?? undefined)
      // Keep the device copy in step so the same id exists on both sides.
      saveLocalProfile(profile)
      await saveCloudProfile(profile, auth.user.id, auth.token)
      setEditingId(profile.id)
      setActiveProfileId(profile.id)
      refreshLocal()
      await refreshCloud()
      showToast(`Saved "${profile.name}" to your account`, "info")
    } catch (err) {
      console.error("[StyleProfileDialog] cloud save failed:", err)
      showToast("Couldn't save to your account — saved on this device instead", "error")
    } finally {
      setSaving(false)
    }
  }, [
    auth.isLoggedIn,
    auth.user,
    auth.token,
    validateName,
    profileName,
    currentStyle,
    editingId,
    refreshLocal,
    refreshCloud,
    showToast,
  ])

  const handleDeleteLocal = useCallback(
    (profile: StyleProfile) => {
      if (!deleteLocalProfile(profile.id)) {
        showToast("Couldn't delete — browser storage is unavailable", "error")
        return
      }
      if (editingId === profile.id) {
        setEditingId(null)
        setProfileName("")
      }
      refreshLocal()
      showToast(`Deleted "${profile.name}"`, "info")
    },
    [editingId, refreshLocal, showToast],
  )

  const handleDeleteCloud = useCallback(
    async (profile: StyleProfile) => {
      if (!auth.user || !auth.token) return
      try {
        await deleteCloudProfile(profile.id, auth.user.id, auth.token)
        await refreshCloud()
        showToast(`Removed "${profile.name}" from your account`, "info")
      } catch (err) {
        console.error("[StyleProfileDialog] cloud delete failed:", err)
        showToast("Couldn't remove from your account", "error")
      }
    },
    [auth.user, auth.token, refreshCloud, showToast],
  )

  const setMetric = useCallback(
    (key: GlyphMetricKey, value: number) => {
      setGlyphOverrides({ [key]: value })
    },
    [setGlyphOverrides],
  )

  const overriddenCount = Object.keys(glyphOverrides).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="style-profile-dialog max-w-3xl">
        <DialogHeader>
          <DialogTitle className="style-profile-title">Style profiles</DialogTitle>
          <DialogDescription>
            Tune glyph geometry and save it as a named profile. Defaults come from
            the {smuflFont} font&rsquo;s own SMuFL engraving metadata.
          </DialogDescription>
        </DialogHeader>

        {/* Profile name + save actions */}
        <div className="profile-bar flex flex-wrap items-end gap-2 pb-1">
          <div className="profile-name-field min-w-[200px] flex-1">
            <Label htmlFor="profile-name" className="text-xs text-muted-foreground">
              Profile name
            </Label>
            <Input
              id="profile-name"
              className="profile-name-input mt-1 h-8"
              value={profileName}
              placeholder="e.g. Real Book"
              maxLength={60}
              onChange={(e) => setProfileName(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="btn-save-local h-8"
            onClick={handleSaveLocal}
          >
            <HardDrive className="mr-1.5 h-3.5 w-3.5" />
            Save on device
          </Button>
          <Button
            size="sm"
            className="btn-save-cloud h-8"
            disabled={saving || !auth.isLoggedIn}
            title={auth.isLoggedIn ? "Save to your ph-apps account" : "Sign in to save to your account"}
            onClick={() => void handleSaveCloud()}
          >
            <Cloud className="mr-1.5 h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save to account"}
          </Button>
        </div>
        {!auth.isLoggedIn && (
          <p className="text-[11px] text-muted-foreground -mt-1">
            Not signed in — profiles save to this device only.
          </p>
        )}

        <Separator />

        <Tabs defaultValue="metrics" className="style-profile-tabs">
          <TabsList className="style-profile-tabslist">
            <TabsTrigger value="metrics">
              Metrics{overriddenCount > 0 ? ` (${overriddenCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="profiles">
              Saved{localProfiles.length + cloudProfiles.length > 0
                ? ` (${localProfiles.length + cloudProfiles.length})`
                : ""}
            </TabsTrigger>
          </TabsList>

          {/* ── Metric editors, generated from METRIC_DEFS ── */}
          <TabsContent value="metrics" className="metrics-tab">
            <div className="flex items-center justify-between py-2">
              <p className="text-xs text-muted-foreground">
                {overriddenCount === 0
                  ? `Using ${smuflFont} defaults.`
                  : `${overriddenCount} metric${overriddenCount === 1 ? "" : "s"} overridden.`}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="btn-reset-metrics h-7 text-[11px]"
                disabled={overriddenCount === 0}
                onClick={() => {
                  resetGlyphOverrides()
                  showToast("Reset to font defaults", "info")
                }}
              >
                <RotateCcw className="mr-1.5 h-3 w-3" />
                Reset all
              </Button>
            </div>

            <div
              className="metrics-scroll space-y-4 overflow-y-auto pr-2"
              style={{ maxHeight: "50vh" }}
            >
              {GROUP_ORDER.map((group) => {
                const defs = (METRIC_DEFS as readonly MetricDef[]).filter(
                  (d) => d.group === group,
                )
                if (!defs.length) return null
                return (
                  <section key={group} className={`metric-group metric-group--${group}`}>
                    <h4 className="metric-group-title mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {METRIC_GROUP_LABELS[group]}
                    </h4>
                    <div className="space-y-1.5">
                      {defs.map((def) => {
                        const fallback = metricDefault(def, smuflFont)
                        const override = glyphOverrides[def.key]
                        const value = override ?? fallback
                        const isOverridden = override !== undefined
                        return (
                          <div
                            key={def.key}
                            className="metric-row flex items-center gap-2"
                            data-metric={def.key}
                            data-overridden={isOverridden}
                          >
                            <label
                              className="metric-label w-36 shrink-0 text-xs"
                              htmlFor={`metric-${def.key}`}
                              title={def.description}
                            >
                              {def.label}
                              {def.source === "smufl" && (
                                <span
                                  className="metric-smufl-dot ml-1 text-[9px] text-muted-foreground"
                                  title="Default published by the font"
                                >
                                  ●
                                </span>
                              )}
                            </label>
                            <input
                              id={`metric-${def.key}`}
                              type="range"
                              className="metric-slider h-1.5 flex-1 accent-primary"
                              min={def.min}
                              max={def.max}
                              step={def.step}
                              value={value}
                              onChange={(e) => setMetric(def.key, Number(e.target.value))}
                            />
                            <span
                              className={`metric-value w-14 shrink-0 text-right text-[11px] tabular-nums ${
                                isOverridden ? "font-semibold text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {formatValue(def, value)}
                            </span>
                            <span className="metric-unit w-11 shrink-0 text-[10px] text-muted-foreground">
                              {def.unit === "spaces" ? "sp" : def.unit}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              ● marks a value the font publishes. Petaluma {SMUFL_FONTS.Petaluma.fontVersion} ·
              Bravura {SMUFL_FONTS.Bravura.fontVersion}, SIL OFL.
            </p>
          </TabsContent>

          {/* ── Saved profiles ── */}
          <TabsContent value="profiles" className="profiles-tab">
            <div
              className="profiles-scroll space-y-4 overflow-y-auto pr-2 py-2"
              style={{ maxHeight: "50vh" }}
            >
              <ProfileList
                title="On this device"
                icon={<HardDrive className="h-3 w-3" />}
                profiles={localProfiles}
                activeId={editingId}
                emptyText="No profiles saved on this device yet."
                onLoad={applyProfile}
                onDelete={handleDeleteLocal}
              />

              <Separator />

              <ProfileList
                title={auth.isLoggedIn ? "In your account" : "In your account (signed out)"}
                icon={<Cloud className="h-3 w-3" />}
                profiles={cloudProfiles}
                activeId={editingId}
                emptyText={
                  auth.isLoggedIn
                    ? cloudBusy
                      ? "Loading…"
                      : "No profiles saved to your account yet."
                    : "Sign in to sync profiles across devices."
                }
                onLoad={applyProfile}
                onDelete={(p) => void handleDeleteCloud(p)}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

interface ProfileListProps {
  title: string
  icon: React.ReactNode
  profiles: StyleProfile[]
  activeId: string | null
  emptyText: string
  onLoad: (p: StyleProfile) => void
  onDelete: (p: StyleProfile) => void
}

function ProfileList({
  title,
  icon,
  profiles,
  activeId,
  emptyText,
  onLoad,
  onDelete,
}: ProfileListProps) {
  return (
    <section className="profile-list">
      <h4 className="profile-list-title mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </h4>
      {profiles.length === 0 ? (
        <p className="profile-list-empty text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {profiles.map((p) => (
            <li
              key={p.id}
              className="profile-item flex items-center gap-2 rounded border border-border px-2 py-1.5"
              data-profile-id={p.id}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="profile-item-name truncate text-sm">{p.name}</span>
                  {activeId === p.id && (
                    <Check className="h-3 w-3 shrink-0 text-primary" aria-label="active" />
                  )}
                </div>
                <span className="profile-item-meta text-[10px] text-muted-foreground">
                  {p.glyphs && Object.keys(p.glyphs).length > 0
                    ? `${Object.keys(p.glyphs).length} metric override${
                        Object.keys(p.glyphs).length === 1 ? "" : "s"
                      } · `
                    : ""}
                  {new Date(p.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="btn-load-profile h-6 px-2 text-[11px]"
                onClick={() => onLoad(p)}
              >
                Load
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="btn-delete-profile h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${p.name}`}
                onClick={() => onDelete(p)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
