import { useState, useEffect } from "react"
import { Popover, PopoverContent } from "@/components/ui/popover"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  VOLTA_PRESETS,
  type VoltaPreset,
} from "@/lib/voltaPresets"
import type { TakenPresets } from "@/lib/voltaState"
import type { Volta } from "@/lib/schema"

/** Plain rect we can stash in the store (DOMRect isn't structurally
 *  serializable and we want the picker state to live in zustand). */
export interface AnchorRect {
  left: number
  top: number
  width: number
  height: number
}

interface EndingPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Anchor rect for positioning */
  anchorRect: AnchorRect | null
  /** Currently set ending on the target measure, if any */
  current: Volta | null
  /** Preset keys + labels already used elsewhere in this region (excluding the target) */
  taken: TakenPresets
  /** Suggested default preset to highlight */
  suggested: VoltaPreset
  /** Whether the target is the first ending in the region (drives column emphasis) */
  isFirstInRegion: boolean
  onSelect: (preset: VoltaPreset, customLabel?: string) => void
  onRemove: () => void
}

export function VoltaPicker({
  open,
  onOpenChange,
  anchorRect,
  current,
  taken,
  suggested,
  isFirstInRegion,
  onSelect,
  onRemove,
}: EndingPickerProps) {
  const [pickedKey, setPickedKey] = useState<string>(
    current?.presetKey ?? suggested.key,
  )
  const [labelText, setLabelText] = useState<string>(
    current?.label ?? suggested.label,
  )

  // Reset internal state whenever the popover (re)opens
  useEffect(() => {
    if (open) {
      setPickedKey(current?.presetKey ?? suggested.key)
      setLabelText(current?.label ?? suggested.label)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const pickPreset = (p: VoltaPreset) => {
    setPickedKey(p.key)
    setLabelText(p.label)
  }

  const trimmedLabel = labelText.trim()
  const canApply = trimmedLabel.length > 0

  const handleApply = () => {
    if (!canApply) return
    // Find the preset that matches pickedKey across all columns
    const allCols = [
      ...VOLTA_PRESETS.opening,
      ...VOLTA_PRESETS.middle,
      ...VOLTA_PRESETS.closing,
    ]
    const preset = allCols.find((p) => p.key === pickedKey) ?? suggested
    onSelect(preset, trimmedLabel !== preset.label ? trimmedLabel : undefined)
    onOpenChange(false)
  }

  /** A button is "taken" if either its preset key OR its display label
   *  is already used by another ending in the region. The current
   *  ending's own key/label is excluded so editing is allowed. */
  const isTaken = (p: VoltaPreset): boolean => {
    if (p.key === current?.presetKey) return false
    if (p.label.trim() === current?.label.trim()) return false
    return taken.keys.has(p.key) || taken.labels.has(p.label.trim())
  }

  const renderColumn = (
    title: string,
    presets: VoltaPreset[],
    emphasized: boolean,
  ) => (
    <div className="ending-col flex flex-col gap-1.5 min-w-[110px]">
      <Label
        className={`ending-col-title text-[10px] font-semibold uppercase tracking-wider ${
          emphasized ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {title}
      </Label>
      {presets.map((p) => {
        const taken = isTaken(p)
        const active = pickedKey === p.key
        return (
          <button
            key={p.key}
            type="button"
            disabled={taken}
            onClick={() => pickPreset(p)}
            className={`ending-preset-btn rounded px-2 py-1 text-left text-xs font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : taken
                  ? "bg-muted/40 text-muted-foreground/60 line-through cursor-not-allowed"
                  : "bg-muted text-foreground hover:bg-muted/80"
            }`}
            title={taken ? "Already used in this repeat" : p.label}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Anchor asChild>
        <div
          style={{
            position: "fixed",
            left: anchorRect?.left ?? 0,
            top: anchorRect?.top ?? 0,
            width: anchorRect?.width ?? 1,
            height: anchorRect?.height ?? 1,
            pointerEvents: "none",
          }}
        />
      </PopoverPrimitive.Anchor>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className="ending-picker w-auto max-w-[480px] p-3"
        onKeyDown={(e) => {
          if (e.key === "Enter" && canApply) {
            e.preventDefault()
            handleApply()
          }
        }}
      >
        <div className="ending-picker-header mb-2 flex items-center justify-between">
          <span className="ending-picker-title text-sm font-medium">
            {current ? "Edit repeat ending" : "Add repeat ending"}
          </span>
          {current && (
            <button
              type="button"
              className="ending-remove-btn text-[11px] text-destructive hover:underline"
              onClick={() => {
                onRemove()
                onOpenChange(false)
              }}
            >
              Remove
            </button>
          )}
        </div>

        <div className="ending-picker-cols flex gap-3">
          {renderColumn("Opening", VOLTA_PRESETS.opening, isFirstInRegion)}
          {renderColumn("Middle", VOLTA_PRESETS.middle, !isFirstInRegion)}
          {renderColumn("Closing", VOLTA_PRESETS.closing, !isFirstInRegion)}
        </div>

        <div className="ending-picker-footer mt-3 flex items-center gap-2 border-t pt-3">
          <Label className="text-[11px]">Label</Label>
          <Input
            className="ending-label-input h-7 flex-1 text-xs"
            value={labelText}
            onChange={(e) => setLabelText(e.target.value)}
            placeholder="Enter ending label"
            autoFocus
          />
          <Button
            size="sm"
            className="ending-apply-btn h-7 text-xs"
            onClick={handleApply}
            disabled={!canApply}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
