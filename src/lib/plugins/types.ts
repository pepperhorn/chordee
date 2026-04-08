import type { ComponentType } from "react"

export interface PluginMeta {
  id: string
  name: string
  version: string
  description: string
  /** Lucide icon component */
  icon: ComponentType<{ className?: string }>
  licensing: "free" | "subscription" | "third-party"
  enabledByDefault: boolean
}

export interface PluginAuth {
  /** First-party subscription plugins check access via Directus */
  checkAccess?: () => Promise<boolean>
  /** Third-party plugins bring their own auth */
  authenticate?: () => Promise<boolean>
}

export interface PluginDefinition {
  meta: PluginMeta
  auth?: PluginAuth
  /** React component for the plugin's floating panel UI */
  Panel?: ComponentType<{ onClose: () => void }>
  /** Called on registration */
  init?: () => void | Promise<void>
  /** Called when plugin is enabled. Return cleanup function. */
  activate?: () => void | (() => void)
  /** Called when plugin is disabled */
  deactivate?: () => void
}
