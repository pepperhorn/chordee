import { Piano, Guitar, Volume2 } from "lucide-react"
import { usePlaybackStore } from "./playback-store"

export function PlaybackPanel({ onClose: _onClose }: { onClose: () => void }) {
  const { listenMode, instrument, useBass, loading, currentVoicingLabel, setInstrument, setUseBass } =
    usePlaybackStore()

  return (
    <div className="playback-panel flex flex-col gap-3 p-3 w-56">
      {/* Status */}
      <div className="playback-status flex items-center gap-2 text-sm">
        {loading ? (
          <>
            <span className="playback-loading-dot h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-muted-foreground">Loading sounds...</span>
          </>
        ) : listenMode ? (
          <>
            <span className="playback-active-dot h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-muted-foreground">Listening</span>
          </>
        ) : (
          <>
            <span className="playback-inactive-dot h-2 w-2 rounded-full bg-gray-400" />
            <span className="text-muted-foreground">Off</span>
          </>
        )}
      </div>

      {/* Instrument selector */}
      <div className="playback-instrument-group flex flex-col gap-1.5">
        <label className="playback-instrument-label text-xs font-medium text-muted-foreground">
          Chord instrument
        </label>
        <div className="playback-instrument-buttons flex gap-1">
          <button
            className={`playback-btn-piano flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              instrument === "piano"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            onClick={() => setInstrument("piano")}
          >
            <Piano className="h-3.5 w-3.5" />
            Piano
          </button>
          <button
            className={`playback-btn-guitar flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              instrument === "guitar"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            onClick={() => setInstrument("guitar")}
          >
            <Guitar className="h-3.5 w-3.5" />
            Guitar
          </button>
        </div>
      </div>

      {/* Bass toggle */}
      <div className="playback-bass-group flex flex-col gap-1.5">
        <label className="playback-bass-label text-xs font-medium text-muted-foreground">
          Bass instrument
        </label>
        <div className="playback-bass-buttons flex gap-1">
          <button
            className={`playback-btn-bass-on flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              useBass
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            onClick={() => setUseBass(true)}
          >
            Bass
          </button>
          <button
            className={`playback-btn-bass-off flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              !useBass
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            onClick={() => setUseBass(false)}
          >
            No Bass
          </button>
        </div>
      </div>

      {/* Current voicing info */}
      {currentVoicingLabel && listenMode && (
        <div className="playback-voicing-info flex flex-col gap-0.5">
          <span className="playback-voicing-label text-xs text-muted-foreground">
            Voicing
          </span>
          <span className="playback-voicing-name text-sm font-medium">
            {currentVoicingLabel}
          </span>
          <span className="playback-voicing-hint text-[10px] text-muted-foreground">
            Select same chord again for alternative
          </span>
        </div>
      )}

      {/* Bass info */}
      <div className="playback-bass-info text-[10px] text-muted-foreground">
        <Volume2 className="inline h-3 w-3 mr-1" />
        {useBass
          ? "Acoustic bass plays root (or slash bass)"
          : "Root note played on chord instrument"}
      </div>
    </div>
  )
}
