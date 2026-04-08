import { useEffect, useRef } from "react"
import { useChartStore } from "@/lib/store"
import { usePlaybackStore } from "./playback-store"
import { ensureLoaded, playChord, stopAll } from "./audio-engine"
import { formatChord } from "@/lib/utils"
import type { Chord } from "@/lib/schema"

/**
 * Hook that subscribes to chart store changes and triggers
 * chord playback when listen mode is active.
 */
export function useListenMode() {
  const listenMode = usePlaybackStore((s) => s.listenMode)
  usePlaybackStore((s) => s.instrument) // re-render on instrument change
  const lastChordRef = useRef<string | null>(null)

  useEffect(() => {
    if (!listenMode) return

    // Ensure audio is loaded when listen mode activates
    ensureLoaded(
      () => usePlaybackStore.getState().setLoading(true),
      () => usePlaybackStore.getState().setLoading(false)
    )

    // Subscribe to selection changes — play chord when navigating to a slot
    const unsubSelection = useChartStore.subscribe(
      (s) => s.ui.selection,
      (selection) => {
        if (!selection?.slotId || !usePlaybackStore.getState().listenMode) return

        const chart = useChartStore.getState().chart
        const sec = chart.sections.find((s) => s.id === selection.sectionId)
        const mea = sec?.measures.find((m) => m.id === selection.measureId)
        const bea = mea?.beats.find((b) => b.id === selection.beatId)
        const slo = bea?.slots.find((s) => s.id === selection.slotId)

        if (slo?.chord) {
          triggerPlay(slo.chord)
        }
      }
    )

    // Subscribe to chord changes on the current selection
    const unsubChart = useChartStore.subscribe(
      (s) => s.chart,
      () => {
        const state = useChartStore.getState()
        const sel = state.ui.selection
        if (!sel?.slotId || !usePlaybackStore.getState().listenMode) return

        const sec = state.chart.sections.find((s) => s.id === sel.sectionId)
        const mea = sec?.measures.find((m) => m.id === sel.measureId)
        const bea = mea?.beats.find((b) => b.id === sel.beatId)
        const slo = bea?.slots.find((s) => s.id === sel.slotId)

        if (slo?.chord) {
          const chordKey = formatChord(slo.chord)
          // Only play if the chord actually changed (not just any chart mutation)
          if (chordKey !== lastChordRef.current) {
            triggerPlay(slo.chord)
          }
        }
      }
    )

    return () => {
      unsubSelection()
      unsubChart()
      stopAll()
    }
  }, [listenMode])

  function triggerPlay(chord: Chord) {
    const chordKey = formatChord(chord)
    const pbStore = usePlaybackStore.getState()

    // Reset or increment voicing index
    pbStore.resetVoicing(chordKey)
    lastChordRef.current = chordKey

    const currentInstrument = usePlaybackStore.getState().instrument

    // Stop any currently playing notes
    stopAll()

    const currentUseBass = usePlaybackStore.getState().useBass
    playChord(chord, usePlaybackStore.getState().currentVoicingIndex, currentInstrument, currentUseBass)
      .then((result) => {
        usePlaybackStore.getState().setVoicingLabel(result.voicingLabel)
      })
  }
}
