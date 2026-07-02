import type { Platform } from '@/lib/markdown/render/adapters'
import { useState } from 'react'
import { renderPlatformHtml } from '@/lib/markdown/client-render'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import { usePreviewStore } from '@/stores/preview'

export interface PlatformCopyResult {
  getHtml: () => Promise<string>
  isLoading: boolean
  error: Error | null
}

export function usePlatformCopy(platform: Platform): PlatformCopyResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const content = useFilesStore(state => state.currentContent)
  const markdownStyle = usePreviewStore(state => state.markdownStyle)
  const codeTheme = usePreviewStore(state => state.codeTheme)
  const mermaidTheme = usePreviewStore(state => state.mermaidTheme)
  const infographic = usePreviewStore(state => state.infographic)
  const customCss = usePreviewStore(state => state.customCss)
  const enableFootnoteLinks = useEditorStore(state => state.enableFootnoteLinks)
  const openLinksInNewWindow = useEditorStore(state => state.openLinksInNewWindow)
  const getRenderedHtml = usePreviewStore(state => state.getRenderedHtml)
  const setRenderedHtml = usePreviewStore(state => state.setRenderedHtml)

  const getHtml = async (): Promise<string> => {
    const cached = getRenderedHtml(platform)
    if (cached) {
      setError(null)
      return cached
    }

    setIsLoading(true)
    setError(null)

    try {
      const html = await renderPlatformHtml({
        platform,
        content,
        markdownStyle,
        codeTheme,
        mermaidTheme,
        infographicTheme: infographic.theme,
        infographicPalette: infographic.palette,
        customCss,
        enableFootnoteLinks,
        openLinksInNewWindow,
      })
      setRenderedHtml(platform, html)
      return html
    }
    catch (err) {
      const error = err instanceof Error ? err : new Error('渲染失败')
      setError(error)
      console.error(`[${platform}] 渲染失败:`, err)
      throw error
    }
    finally {
      setIsLoading(false)
    }
  }

  return { getHtml, isLoading, error }
}
