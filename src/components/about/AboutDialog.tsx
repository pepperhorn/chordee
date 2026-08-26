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

/** The one dependency chordee is architecturally built around. */
const HEADLINE_CREDIT: CreditEntry = {
  name: "Pretext",
  author: "Cheng Lou",
  url: "https://github.com/chenglou/pretext",
  note: "The layout engine. Every beat position, bar width, line break and justified line in chordee comes out of Pretext's measure-then-render pipeline. Nothing is positioned by CSS. Without Pretext this editor doesn't exist.",
}

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

interface LibEntry {
  name: string
  url: string
  license: string
  note?: string
}

/**
 * Every library bundled into the shipped app, with its license.
 *
 * Tracks `dependencies` in package.json — add an entry whenever you add a
 * runtime dependency. Build-time tooling is out of scope, with one
 * exception: `tailwindcss` is a devDependency but its output ships in the
 * bundle, so it is credited alongside `@tailwindcss/postcss`.
 */
const BUNDLED_LIBS: LibEntry[] = [
  {
    name: "@chenglou/pretext",
    url: "https://github.com/chenglou/pretext",
    license: "MIT",
    note: "Layout engine",
  },
  { name: "astro", url: "https://astro.build", license: "MIT", note: "App framework" },
  {
    name: "@astrojs/react",
    url: "https://docs.astro.build/en/guides/integrations-guide/react/",
    license: "MIT",
    note: "React integration",
  },
  {
    name: "react · react-dom",
    url: "https://react.dev",
    license: "MIT",
    note: "UI runtime",
  },
  {
    name: "zustand",
    url: "https://github.com/pmndrs/zustand",
    license: "MIT",
    note: "State + undo/redo",
  },
  { name: "zod", url: "https://zod.dev", license: "MIT", note: "Schema validation" },
  {
    name: "@radix-ui/react-*",
    url: "https://www.radix-ui.com",
    license: "MIT",
    note: "dialog, dropdown-menu, label, popover, scroll-area, select, separator, slot, tabs, tooltip",
  },
  {
    name: "tailwindcss · @tailwindcss/postcss",
    url: "https://tailwindcss.com",
    license: "MIT",
    note: "UI styling",
  },
  {
    name: "tw-animate-css",
    url: "https://github.com/Wombosvideo/tw-animate-css",
    license: "MIT",
    note: "Animation utilities",
  },
  {
    name: "class-variance-authority",
    url: "https://cva.style",
    license: "Apache-2.0",
    note: "Variant styling",
  },
  {
    name: "clsx",
    url: "https://github.com/lukeed/clsx",
    license: "MIT",
    note: "Class name builder",
  },
  {
    name: "tailwind-merge",
    url: "https://github.com/dcastil/tailwind-merge",
    license: "MIT",
    note: "Class conflict resolution",
  },
  {
    name: "cmdk",
    url: "https://github.com/pacocoursey/cmdk",
    license: "MIT",
    note: "Command menu",
  },
  { name: "lucide-react", url: "https://lucide.dev", license: "ISC", note: "Icons" },
  {
    name: "pdf-lib",
    url: "https://pdf-lib.js.org",
    license: "MIT",
    note: "PDF export",
  },
  {
    name: "qrcode",
    url: "https://github.com/soldair/node-qrcode",
    license: "MIT",
    note: "Share codes",
  },
  {
    name: "nanoid",
    url: "https://github.com/ai/nanoid",
    license: "MIT",
    note: "ID generation",
  },
  {
    name: "smplr",
    url: "https://github.com/danigb/smplr",
    license: "MIT",
    note: "Audio playback",
  },
]

function CreditLink({ entry }: { entry: { name: string; url: string } }) {
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
            <span className="about-strapline text-base text-muted-foreground font-normal">
              simple chord charts done right
            </span>
          </DialogTitle>
          <DialogDescription>
            Built on the shoulders of giants. Here are all of them.
          </DialogDescription>
        </DialogHeader>

        <div className="about-body space-y-5 overflow-y-auto pr-2" style={{ maxHeight: "70vh" }}>
          {/* Headline credit — Pretext carries the whole architecture */}
          <section className="about-section about-section--headline space-y-2 rounded-lg border border-border bg-muted/40 p-4">
            <h3 className="about-section-title text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Built on
            </h3>
            <div className="credit-item credit-item--headline">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-lg font-semibold">
                  <CreditLink entry={HEADLINE_CREDIT} />
                </span>
                {HEADLINE_CREDIT.author && (
                  <span className="credit-author text-xs text-muted-foreground">
                    by {HEADLINE_CREDIT.author}
                  </span>
                )}
              </div>
              {HEADLINE_CREDIT.note && (
                <p className="credit-note text-sm text-muted-foreground mt-1">
                  {HEADLINE_CREDIT.note}
                </p>
              )}
            </div>
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

          {/* Every bundled library */}
          <section className="about-section space-y-2">
            <h3 className="about-section-title text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bundled libraries
            </h3>
            <ul className="bundled-libs divide-y divide-border/60">
              {BUNDLED_LIBS.map((lib) => (
                <li
                  key={lib.name}
                  className="bundled-lib flex flex-wrap items-baseline gap-x-2 py-1.5 text-sm"
                >
                  <CreditLink entry={lib} />
                  {lib.note && (
                    <span className="bundled-lib-note text-xs text-muted-foreground">
                      {lib.note}
                    </span>
                  )}
                  <span className="bundled-lib-license ml-auto shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {lib.license}
                  </span>
                </li>
              ))}
            </ul>
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
