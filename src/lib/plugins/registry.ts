import type { PluginDefinition } from "./types"

const plugins = new Map<string, PluginDefinition>()
const cleanups = new Map<string, (() => void) | void>()

export function registerPlugin(def: PluginDefinition): void {
  plugins.set(def.meta.id, def)
  def.init?.()
}

export function getPlugin(id: string): PluginDefinition | undefined {
  return plugins.get(id)
}

export function getAllPlugins(): PluginDefinition[] {
  return Array.from(plugins.values())
}

export function activatePlugin(id: string): void {
  const plugin = plugins.get(id)
  if (!plugin) return
  const cleanup = plugin.activate?.()
  if (cleanup) cleanups.set(id, cleanup)
}

export function deactivatePlugin(id: string): void {
  const plugin = plugins.get(id)
  if (!plugin) return
  const cleanup = cleanups.get(id)
  if (typeof cleanup === "function") cleanup()
  cleanups.delete(id)
  plugin.deactivate?.()
}
