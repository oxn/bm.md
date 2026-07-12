import { describe, expect, it } from 'vitest'

import { resolvePlatformConfig } from './platform'

describe('resolvePlatformConfig', () => {
  it('默认使用 Nitro 自动检测', () => {
    expect(resolvePlatformConfig({}, 'github_actions')).toEqual({
      nitroPreset: undefined,
      prerender: true,
      pwaOutDir: '.output/public',
    })
  })

  it('在 Cloudflare Workers Builds 关闭预渲染', () => {
    expect(resolvePlatformConfig({}, 'cloudflare_workers')).toEqual({
      nitroPreset: undefined,
      prerender: false,
      pwaOutDir: '.output/public',
    })
  })

  it('存在 AliUid 时选择阿里云并保留预渲染与 PWA 输出目录', () => {
    expect(resolvePlatformConfig({ AliUid: '123' }, 'cloudflare_workers')).toEqual({
      nitroPreset: './preset/aliyun-esa/nitro.config.ts',
      prerender: true,
      pwaOutDir: 'dist/client',
    })
  })

  it('同时满足 HOME 与 TMPDIR 时选择腾讯 EdgeOne', () => {
    expect(resolvePlatformConfig({
      HOME: '/dev/shm/home',
      TMPDIR: '/dev/shm/tmp',
    }, 'cloudflare_workers')).toEqual({
      nitroPreset: './preset/tencent-edgeone/nitro.config.ts',
      prerender: true,
      pwaOutDir: '.output/public',
    })
  })

  it.each([
    { HOME: '/dev/shm/home' },
    { TMPDIR: '/dev/shm/tmp' },
  ])('仅满足一个腾讯条件时不误判：%o', (environment) => {
    expect(resolvePlatformConfig(environment).nitroPreset).toBeUndefined()
  })
})
