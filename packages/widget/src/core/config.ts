import type { WidgetTheme } from '../types'

export interface ServerConfig {
  theme?: WidgetTheme
  tabs?: { feedback?: boolean; changelog?: boolean; help?: boolean }
  imageUploadsInWidget?: boolean
  hmacRequired?: boolean
}

export async function fetchServerConfig(instanceUrl: string): Promise<ServerConfig> {
  try {
    const res = await fetch(`${instanceUrl}/api/widget/config.json`)
    if (!res.ok) return {}
    return (await res.json()) as ServerConfig
  } catch {
    return {}
  }
}
