import { debounce } from 'es-toolkit'
import morphdom from 'morphdom'
import { useEffect, useRef } from 'react'
import { usePreviewScrollSync } from '@/components/markdown/hooks/use-scroll-sync'
import { Phone } from '@/components/mockups/iphone'
import { Safari } from '@/components/mockups/safari'
import { renderMarkdownPreview } from '@/lib/markdown/client-render'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import { PREVIEW_WIDTH_MOBILE, usePreviewStore } from '@/stores/preview'
import { applyDarkModeToPreviewHtml } from './darkmode'
import iframeShell from './iframe-shell.html?raw'

const RENDER_DEBOUNCE_MS = 100
const PREVIEW_STYLE_ID = 'bm-preview-style'
interface MutableRef<T> {
  current: T
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  '\'': '&#39;',
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char => HTML_ESCAPE_MAP[char] ?? char)
}

function createErrorHtml(message: string): string {
  return `<section id="bm-md">${escapeHtml(message)}</section>`
}

function createPreviewBody(previewHtml: string): HTMLBodyElement {
  const wrapper = document.createElement('body')
  const template = document.createElement('template')
  template.innerHTML = previewHtml
  wrapper.append(template.content)
  return wrapper
}

function applyIframeStyle(iframe: HTMLIFrameElement | null, css: string): boolean {
  const iframeDoc = iframe?.contentDocument
  const head = iframeDoc?.head

  if (!head) {
    return false
  }

  let style = head.querySelector<HTMLStyleElement>(`#${PREVIEW_STYLE_ID}`)
  if (!style) {
    style = iframeDoc.createElement('style')
    style.id = PREVIEW_STYLE_ID
    head.append(style)
  }

  style.textContent = css
  return true
}

function syncIframeStyle(
  iframe: HTMLIFrameElement | null,
  css: string,
  pendingCssRef: MutableRef<string | null>,
): void {
  pendingCssRef.current = applyIframeStyle(iframe, css) ? null : css
}

function applyIframeContent(
  iframe: HTMLIFrameElement | null,
  html: string,
  css: string,
  colorScheme: string,
): boolean {
  const body = iframe?.contentDocument?.body

  if (!body) {
    return false
  }

  applyIframeStyle(iframe, css)

  const wrapper = createPreviewBody(colorScheme === 'dark'
    ? applyDarkModeToPreviewHtml(html)
    : html)

  body.style.backgroundColor = colorScheme === 'dark' ? '#111111' : ''
  body.style.colorScheme = colorScheme

  morphdom(body, wrapper, {
    childrenOnly: true,
    onBeforeElUpdated(fromEl, toEl) {
      if (fromEl.isEqualNode(toEl)) {
        return false
      }
      return true
    },
  })

  return true
}

function syncIframeContent(
  iframe: HTMLIFrameElement | null,
  html: string,
  css: string,
  colorScheme: string,
  pendingHtmlRef: MutableRef<string | null>,
  pendingCssRef: MutableRef<string | null>,
): void {
  if (!applyIframeContent(iframe, html, css, colorScheme)) {
    pendingHtmlRef.current = html
    pendingCssRef.current = css
    return
  }

  pendingHtmlRef.current = null
  pendingCssRef.current = null
}

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
  const previewColorScheme = usePreviewStore(state => state.previewColorScheme)
  const renderedHtml = usePreviewStore(state => state.getRenderedHtml('html'))
  const setRenderedHtml = usePreviewStore(state => state.setRenderedHtml)
  const clearRenderedHtmlCache = usePreviewStore(state => state.clearRenderedHtmlCache)

  const { iframeRef, onIframeLoad: onScrollSyncLoad } = usePreviewScrollSync({
    enabled: enableScrollSync,
  })

  const iframeReadyRef = useRef(false)
  const pendingHtmlRef = useRef<string | null>(null)
  const pendingCssRef = useRef<string | null>(null)
  const renderedHtmlRef = useRef(renderedHtml)
  const previewCssRef = useRef('')

  useEffect(() => {
    renderedHtmlRef.current = renderedHtml
  }, [renderedHtml])

  const onIframeLoad = () => {
    iframeReadyRef.current = true
    onScrollSyncLoad()

    const iframe = iframeRef.current
    const htmlToRender = pendingHtmlRef.current ?? renderedHtmlRef.current
    syncIframeStyle(iframe, pendingCssRef.current ?? previewCssRef.current, pendingCssRef)
    if (htmlToRender) {
      syncIframeContent(
        iframe,
        htmlToRender,
        previewCssRef.current,
        previewColorScheme,
        pendingHtmlRef,
        pendingCssRef,
      )
    }

    // 拦截 iframe 内的链接点击
    const iframeDoc = iframe?.contentDocument
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
  }

  useEffect(() => {
    if (!renderedHtml) {
      return
    }

    if (iframeReadyRef.current) {
      syncIframeContent(
        iframeRef.current,
        renderedHtml,
        previewCssRef.current,
        previewColorScheme,
        pendingHtmlRef,
        pendingCssRef,
      )
    }
    else {
      pendingHtmlRef.current = renderedHtml
    }
  }, [renderedHtml, previewColorScheme, iframeRef])

  useEffect(() => {
    if (!hasHydrated) {
      return
    }

    let canceled = false
    clearRenderedHtmlCache()

    const scheduleRender = debounce(async () => {
      try {
        const result = await renderMarkdownPreview({
          content,
          markdownStyle,
          codeTheme,
          mermaidTheme,
          infographicTheme: infographic.theme,
          infographicPalette: infographic.palette,
          customCss,
          enableFootnoteLinks,
          openLinksInNewWindow,
          colorScheme: previewColorScheme,
        })

        if (!canceled) {
          previewCssRef.current = result.css
          syncIframeStyle(iframeRef.current, result.css, pendingCssRef)
          setRenderedHtml('html', result.html)
        }
      }
      catch (error) {
        if (!canceled) {
          const message = error instanceof Error ? error.message : '转换失败'
          setRenderedHtml('html', createErrorHtml(message))
        }
      }
    }, RENDER_DEBOUNCE_MS)

    scheduleRender()

    return () => {
      canceled = true
      scheduleRender.cancel()
    }
  }, [hasHydrated, content, markdownStyle, codeTheme, mermaidTheme, infographic, customCss, enableFootnoteLinks, openLinksInNewWindow, previewColorScheme, setRenderedHtml, clearRenderedHtmlCache, iframeRef])

  const isMobile = previewWidth === PREVIEW_WIDTH_MOBILE

  const iframeContent = (
    <iframe
      ref={iframeRef}
      id="bm-preview-iframe"
      title="Markdown 预览"
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
