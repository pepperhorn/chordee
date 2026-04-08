import { Volume2 } from "lucide-react"
import type { PluginDefinition } from "../types"
import { PlaybackPanel } from "./PlaybackPanel"
import { usePlaybackStore } from "./playback-store"

export const playbackPlugin: PluginDefinition = {
  meta: {
    id: "playback",
    name: "Chord Playback",
    version: "1.0.0",
    description: "Hear chords as you edit — arpeggiated voicings with piano, guitar, and bass",
    icon: Volume2,
    licensing: "free",
    enabledByDefault: true,
  },
  Panel: PlaybackPanel,
  activate: () => {
    usePlaybackStore.getState().toggleListenMode()
    return () => {
      const state = usePlaybackStore.getState()
      if (state.listenMode) state.toggleListenMode()
    }
  },
}

export { usePlaybackStore } from "./playback-store"
export { useListenMode } from "./useListenMode"
