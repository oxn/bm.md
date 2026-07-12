import type { ProviderName } from 'std-env'

import { provider } from 'std-env'

export interface PlatformEnvironment {
  AliUid?: string
  HOME?: string
  TMPDIR?: string
}

export interface PlatformConfig {
  nitroPreset: string | undefined
  prerender: boolean
  pwaOutDir: 'dist/client' | '.output/public'
}

export function resolvePlatformConfig(
  environment: PlatformEnvironment,
  detectedProvider: ProviderName = provider,
): PlatformConfig {
  const isAliyunESA = Boolean(environment.AliUid)
  const isTencentEdgeOne = environment.HOME === '/dev/shm/home'
    && environment.TMPDIR === '/dev/shm/tmp'

  if (isAliyunESA) {
    return {
      nitroPreset: './preset/aliyun-esa/nitro.config.ts',
      prerender: true,
      pwaOutDir: 'dist/client',
    }
  }

  if (isTencentEdgeOne) {
    return {
      nitroPreset: './preset/tencent-edgeone/nitro.config.ts',
      prerender: true,
      pwaOutDir: '.output/public',
    }
  }

  return {
    nitroPreset: undefined,
    prerender: detectedProvider !== 'cloudflare_workers',
    pwaOutDir: '.output/public',
  }
}
