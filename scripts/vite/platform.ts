import type { ProviderName } from 'std-env'

import { provider } from 'std-env'

export interface PlatformEnvironment {
  AliUid?: string
  EDGEONE_PROJECT_ID?: string
  EO_MAKERS?: string

  // Cloudflare Pages 自动注入
  CF_PAGES?: string
}

export interface PlatformConfig {
  nitroPreset: string | undefined
  prerender: boolean
  pwaOutDir: 'dist/client' | '.edgeone/assets' | '.output/public'
}

export function resolvePlatformConfig(
  environment: PlatformEnvironment,
  detectedProvider: ProviderName = provider,
): PlatformConfig {
  const isAliyunESA = Boolean(environment.AliUid)
  const isEdgeOneProvider = detectedProvider === 'edgeone_pages'
  const isCloudflarePages = Boolean(environment.CF_PAGES)

  const isTencentEdgeOne
    = isEdgeOneProvider
      || Boolean(environment.EDGEONE_PROJECT_ID)
      || Boolean(environment.EO_MAKERS)

  if (isAliyunESA) {
    return {
      nitroPreset: './preset/aliyun-esa/nitro.config.ts',
      prerender: true,
      pwaOutDir: 'dist/client',
    }
  }

  if (isTencentEdgeOne) {
    return {
      nitroPreset: isEdgeOneProvider ? undefined : 'edgeone-pages',
      prerender: false,
      pwaOutDir: '.edgeone/assets',
    }
  }

  // Cloudflare Pages
  if (isCloudflarePages) {
    return {
      nitroPreset: 'cloudflare_pages',
      prerender: false,
      pwaOutDir: '.output/public',
    }
  }

  return {
    nitroPreset: undefined,
    prerender: detectedProvider !== 'cloudflare_workers',
    pwaOutDir: '.output/public',
  }
}
