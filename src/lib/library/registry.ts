import type { LibraryCollection, LibraryItem, LibraryAction } from "./librarySchema"
import type { ChordChart } from "../schema"
import type { UseAuthReturn } from "../auth/useAuth"

export interface LibraryFetchContext {
  auth: UseAuthReturn
}

export interface LibraryActivateContext {
  auth: UseAuthReturn
  /** Apply a chart payload to the editor (no save state, no share state). */
  setChart: (chart: ChordChart) => void
  /** Show a toast to the user. */
  showToast?: (message: string, type?: "info" | "warning" | "error") => void
}

export interface LibraryPlugin {
  id: string
  /** Display order — lower numbers render earlier. */
  sort?: number
  /** Plugin label, shown next to its collections. */
  label: string
  /** Returns the collections this plugin currently has. May fetch over the
   *  network; throw to signal an error to the host. */
  fetchCollections: (ctx: LibraryFetchContext) => Promise<LibraryCollection[]>
  /** Handle an activation (load, fork, open link, etc.). The host calls this
   *  whenever the user clicks an item or one of its actions. */
  onActivate: (
    item: LibraryItem,
    action: LibraryAction | undefined,
    ctx: LibraryActivateContext,
  ) => Promise<void> | void
}

const REGISTRY = new Map<string, LibraryPlugin>()

export function registerLibraryPlugin(plugin: LibraryPlugin): void {
  REGISTRY.set(plugin.id, plugin)
}

export function unregisterLibraryPlugin(pluginId: string): void {
  REGISTRY.delete(pluginId)
}

export function listLibraryPlugins(): LibraryPlugin[] {
  return [...REGISTRY.values()].sort((a, b) => (a.sort ?? 50) - (b.sort ?? 50))
}

export function getLibraryPlugin(pluginId: string): LibraryPlugin | undefined {
  return REGISTRY.get(pluginId)
}
