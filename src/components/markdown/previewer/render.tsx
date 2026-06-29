import { debounce } from 'es-toolkit'
import morphdom from 'morphdom'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { usePreviewScrollSync } from '@/components/markdown/hooks/use-scroll-sync'
import { Phone } from '@/components/mockups/iphone'
import { Safari } from '@/components/mockups/safari'
import { getMarkdownLocaleTexts } from '@/lib/locale'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import { PREVIEW_WIDTH_MOBILE, usePreviewStore } from '@/stores/preview'
import { applyDarkModeToPreviewHtml } from './darkmode'
import iframeShell from './iframe-shell.html?raw'

const RENDER_DEBOUNCE_MS = 100

export default function MarkdownRender() {
  const content = useFilesStore(state => state.currentContent)
  const enableScrollSync = useEditorStore(state => state.enableScrollSync)
  const enableFootnoteLinks = useEditorStore(state => state.enableFootnoteLinks)
  const openLinksInNewWindow = useEditorStore(state => state.openLinksInNewWindow)
  const hasHydrated = usePreviewStore(state => state.hasHydrated)
  const previewWidth = usePreviewStore(state => state.previewWidth)
  const markdownStyle = usePreviewStore(state => state.markdownStyle)
  const codeTheme = usePreviewStore(state => state.codeTheme)
  const mermaidTheme = usePreviewStore(state => state.mermaidTheme)
  const infographic = usePreviewStore(state => state.infographic)
  const customCss = usePreviewStore(state => state.customCss)
  const renderedHtml = usePreviewStore(state => state.getRenderedHtml('html'))
  const setRenderedHtml = usePreviewStore(state => state.setRenderedHtml)
  const clearRenderedHtmlCache = usePreviewStore(state => state.clearRenderedHtmlCache)
  const { resolvedTheme } = useTheme()
  const previewColorScheme = resolvedTheme === 'dark' ? 'dark' : 'light'

  const { iframeRef, onIframeLoad: onScrollSyncLoad } = usePreviewScrollSync({
    enabled: enableScrollSync,
  })

  const iframeReadyRef = useRef(false)
  const pendingHtmlRef = useRef<string | null>(null)
  const canceledRef = useRef(false)
  const renderedHtmlRef = useRef(renderedHtml)

  useEffect(() => {
    renderedHtmlRef.current = renderedHtml
  }, [renderedHtml])

  const updateIframeContent = useCallback((html: string) => {
    const iframe = iframeRef.current
    const body = iframe?.contentDocument?.body

    if (!body) {
      pendingHtmlRef.current = html
      return
    }

    const wrapper = document.createElement('body')
    wrapper.innerHTML = previewColorScheme === 'dark'
      ? applyDarkModeToPreviewHtml(html)
      : html

    body.style.backgroundColor = previewColorScheme === 'dark' ? '#111111' : ''
    body.style.colorScheme = previewColorScheme

    morphdom(body, wrapper, {
      childrenOnly: true,
      onBeforeElUpdated(fromEl, toEl) {
        if (fromEl.isEqualNode(toEl)) {
          return false
        }
        return true
      },
    })
  }, [iframeRef, previewColorScheme])

  const onIframeLoad = useCallback(() => {
    iframeReadyRef.current = true
    onScrollSyncLoad()

    const htmlToRender = pendingHtmlRef.current ?? renderedHtmlRef.current
    if (htmlToRender) {
      updateIframeContent(htmlToRender)
      pendingHtmlRef.current = null
    }

    // 拦截 iframe 内的链接点击
    const iframeDoc = iframeRef.current?.contentDocument
    if (iframeDoc) {
      iframeDoc.addEventListener('click', (e: MouseEvent) => {
        const link = (e.target as HTMLElement).closest('a')
        if (!link)
          return

        const href = link.getAttribute('href')
        if (!href)
          return

        e.preventDefault()

        // 页内锚点跳转（脚注引用、返回链接等）
        if (href.startsWith('#')) {
          let targetHref = href
          if (href.includes('-fnref-')) {
            targetHref = href.replace('-fnref-', '-fn-')
          }
          else if (href.includes('-fn-')) {
            targetHref = href.replace('-fn-', '-fnref-')
          }
          const target = iframeDoc.querySelector(`[href="${CSS.escape(targetHref)}"]`)
          if (target) {
            target.scrollIntoView({ behavior: 'auto' })
          }
          return
        }

        // 外部链接 - 顶层窗口新开标签页
        window.open(href, '_blank', 'noopener')
      })
    }
  }, [onScrollSyncLoad, updateIframeContent, iframeRef])

  useEffect(() => {
    if (!renderedHtml) {
      return
    }

    if (iframeReadyRef.current) {
      updateIframeContent(renderedHtml)
    }
    else {
      pendingHtmlRef.current = renderedHtml
    }
  }, [renderedHtml, updateIframeContent])

  const scheduleRender = useMemo(
    () => debounce(async (
      nextContent: string,
      styleId: string,
      themeId: string,
      mermaidThemeId: string,
      infographicThemeId: string,
      infographicPaletteId: string,
      customCssValue: string,
      enableRefLinks: boolean,
      openNewWin: boolean,
    ) => {
      try {
        const { markdown } = await import('@/lib/markdown/browser')
        const result = await markdown.render({
          markdown: nextContent,
          markdownStyle: styleId,
          codeTheme: themeId,
          mermaidTheme: mermaidThemeId,
          infographicTheme: infographicThemeId,
          infographicPalette: infographicPaletteId,
          customCss: customCssValue,
          enableFootnoteLinks: enableRefLinks,
          openLinksInNewWindow: openNewWin,
          ...getMarkdownLocaleTexts(),
        })

        if (!canceledRef.current) {
          setRenderedHtml('html', result.result)
        }
      }
      catch (error) {
        if (!canceledRef.current) {
          const message = error instanceof Error ? error.message : '转换失败'
          setRenderedHtml('html', message)
        }
      }
    }, RENDER_DEBOUNCE_MS),
    [setRenderedHtml],
  )

  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    clearRenderedHtmlCache()
    canceledRef.current = false
    scheduleRender(content, markdownStyle, codeTheme, mermaidTheme, infographic.theme, infographic.palette, customCss, enableFootnoteLinks, openLinksInNewWindow)

    return () => {
      canceledRef.current = true
      scheduleRender.cancel()
    }
  }, [hasHydrated, content, markdownStyle, codeTheme, mermaidTheme, infographic, customCss, enableFootnoteLinks, openLinksInNewWindow, scheduleRender, clearRenderedHtmlCache])

  const isMobile = previewWidth === PREVIEW_WIDTH_MOBILE

  const iframeContent = (
    <iframe
      ref={iframeRef}
      id="bm-preview-iframe"
      title="markdown preview"
      className="size-full border-0"
      sandbox="allow-same-origin allow-modals"
      srcDoc={iframeShell}
      onLoad={onIframeLoad}
    />
  )

  if (isMobile) {
    return (
      <Phone>
        {iframeContent}
      </Phone>
    )
  }

  return (
    <Safari
      className="size-full"
      style={{ maxWidth: previewWidth }}
      url="bm.md"
      mode="simple"
    >
      {iframeContent}
    </Safari>
  )
}
