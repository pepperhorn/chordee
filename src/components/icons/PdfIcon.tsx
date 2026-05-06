import type { SVGProps } from "react"

/** Document icon with an explicit "PDF" label baked into the body, so the
 *  Export PDF button reads as "PDF" at a glance rather than a generic
 *  download/file icon. Uses currentColor for stroke so it picks up the
 *  toolbar's text color. */
export function PdfIcon({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {/* Document outline with folded corner */}
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      {/* PDF label */}
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontFamily="Poppins, system-ui, sans-serif"
        fontSize="6"
        fontWeight={700}
        fill="currentColor"
        stroke="none"
      >
        PDF
      </text>
    </svg>
  )
}
