import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface AboutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CreditEntry {
  name: string
  author?: string
  url: string
  note?: string
}

const MAJOR_CREDITS: CreditEntry[] = [
  {
    name: "Pretext",
    author: "Cheng Lou",
    url: "https://github.com/chenglou/pretext",
    note: "Layout engine — measure-then-render pipeline that powers every beat position in chordee. Without Pretext this editor doesn't exist.",
  },
  {
    name: "VexFlow",
    author: "Mohit Cheppudira + contributors",
    url: "https://github.com/0xfe/vexflow",
    note: "Reference for beam rendering, stave layout, and music notation patterns. Required reading for anyone working on notation on the web.",
  },
]

const MUSIC_FONTS: CreditEntry[] = [
  {
    name: "Petaluma SMuFL",
    author: "Steinberg",
    url: "https://github.com/steinbergmedia/petaluma",
    note: "Handwritten / Real Book style. SIL OFL.",
  },
  {
    name: "Bravura SMuFL",
    author: "Steinberg",
    url: "https://github.com/steinbergmedia/bravura",
    note: "Classical engraving style. SIL OFL.",
  },
]

const STACK: CreditEntry[] = [
  { name: "Astro", url: "https://astro.build" },
  { name: "React", url: "https://react.dev" },
  { name: "Tailwind CSS", url: "https://tailwindcss.com" },
  { name: "Radix UI", url: "https://www.radix-ui.com" },
  { name: "Zustand", url: "https://github.com/pmndrs/zustand" },
  { name: "Zod", url: "https://zod.dev" },
  { name: "pdf-lib", url: "https://pdf-lib.js.org" },
  { name: "Lucide Icons", url: "https://lucide.dev" },
  { name: "smplr (playback)", url: "https://github.com/danigb/smplr" },
]

function CreditLink({ entry }: { entry: CreditEntry }) {
  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      className="credit-link text-primary underline-offset-2 hover:underline"
    >
      {entry.name}
    </a>
  )
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="about-dialog max-w-2xl">
        <DialogHeader>
          <DialogTitle className="about-title flex items-center gap-3">
            <img
              src="/CHORDEE.png"
              alt="chordee"
              className="h-6 w-auto"
              draggable={false}
            />
            <span className="text-base text-muted-foreground font-normal">
              a chord chart editor
            </span>
          </DialogTitle>
          <DialogDescription>
            Built on the shoulders of giants. Here are some of them.
          </DialogDescription>
        </DialogHeader>

        <div className="about-body space-y-5 overflow-y-auto pr-2" style={{ maxHeight: "70vh" }}>
          {/* Big shout-outs */}
          <section className="about-section space-y-3">
            <h3 className="about-section-title text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Huge shout-outs
            </h3>
            <ul className="space-y-3">
              {MAJOR_CREDITS.map((c) => (
                <li key={c.name} className="credit-item">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <CreditLink entry={c} />
                    {c.author && (
                      <span className="credit-author text-xs text-muted-foreground">
                        by {c.author}
                      </span>
                    )}
                  </div>
                  {c.note && (
                    <p className="credit-note text-sm text-muted-foreground mt-0.5">
                      {c.note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Music fonts */}
          <section className="about-section space-y-2">
            <h3 className="about-section-title text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Music fonts
            </h3>
            <ul className="space-y-1.5">
              {MUSIC_FONTS.map((c) => (
                <li key={c.name} className="credit-item text-sm">
                  <CreditLink entry={c} />
                  {c.author && (
                    <span className="text-xs text-muted-foreground"> — {c.author}</span>
                  )}
                  {c.note && (
                    <span className="text-xs text-muted-foreground"> · {c.note}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Stack */}
          <section className="about-section space-y-2">
            <h3 className="about-section-title text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Stack
            </h3>
            <p className="text-sm text-muted-foreground">
              {STACK.map((c, i) => (
                <span key={c.name}>
                  <CreditLink entry={c} />
                  {i < STACK.length - 1 && " · "}
                </span>
              ))}
            </p>
          </section>

          <section className="about-section space-y-1 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              chordee is open in spirit. If your project helped build this editor and
              you're not listed, please open an issue — we'll fix it fast.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
