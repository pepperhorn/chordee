/**
 * Directus auth helper stub.
 * Real implementation when subscription plugins ship.
 */

export interface DirectusClient {
  url: string
  token: string | null
}

export function createDirectusClient(url: string): DirectusClient {
  return { url, token: null }
}

export async function checkSubscription(
  _client: DirectusClient,
  _pluginId: string
): Promise<boolean> {
  // Stub: always returns false until Directus auth is implemented
  return false
}
