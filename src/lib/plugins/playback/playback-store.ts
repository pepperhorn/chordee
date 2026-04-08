import { create } from "zustand"

export interface PlaybackState {
  listenMode: boolean
  instrument: "piano" | "guitar"
  useBass: boolean
  loading: boolean
  currentVoicingIndex: number
  lastPlayedChord: string | null
  currentVoicingLabel: string | null

  toggleListenMode: () => void
  setInstrument: (instrument: "piano" | "guitar") => void
  setUseBass: (useBass: boolean) => void
  setLoading: (loading: boolean) => void
  incrementVoicing: () => void
  resetVoicing: (chordKey: string) => void
  setVoicingLabel: (label: string | null) => void
}

export const usePlaybackStore = create<PlaybackState>()((set, get) => ({
  listenMode: true,
  instrument: "piano",
  useBass: true,
  loading: false,
  currentVoicingIndex: 0,
  lastPlayedChord: null,
  currentVoicingLabel: null,

  toggleListenMode: () => set((s) => ({ listenMode: !s.listenMode })),
  setInstrument: (instrument) => set({ instrument }),
  setUseBass: (useBass) => set({ useBass }),
  setLoading: (loading) => set({ loading }),

  incrementVoicing: () =>
    set((s) => ({ currentVoicingIndex: s.currentVoicingIndex + 1 })),

  resetVoicing: (chordKey) => {
    const { lastPlayedChord } = get()
    if (chordKey === lastPlayedChord) {
      // Same chord — cycle to next voicing
      set((s) => ({
        currentVoicingIndex: s.currentVoicingIndex + 1,
        lastPlayedChord: chordKey,
      }))
    } else {
      // New chord — reset index
      set({ currentVoicingIndex: 0, lastPlayedChord: chordKey })
    }
  },

  setVoicingLabel: (label) => set({ currentVoicingLabel: label }),
}))
