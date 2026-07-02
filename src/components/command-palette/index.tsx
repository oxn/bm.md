import type { SupportedPlatform } from '@/config'
import type { EditorBooleanKey, EditorBooleanSetterKey } from '@/stores/editor'
import { useNavigate } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  Code,
  FilePlus,
  ImageIcon,
  Palette,
  PaletteIcon,
  RotateCcw,
  Workflow,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useCallback, useMemo, useState } from 'react'
import { ResetContentDialog } from '@/components/dialog/reset-content-dialog'
import { usePlatformCopy } from '@/components/markdown/previewer/action-bar/use-platform-copy'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import {
  editorCommandConfig,
  editorSettingsConfig,
  navigationConfig,
  platformConfig,
  supportedPlatforms,
  viewModeConfig,
} from '@/config'
import {
  copyImage,
  copyPlatform,
  exportImage,
  exportMarkdown,
  exportPdf,
  formatMarkdown,
  handleImportFiles,
  printPreview,
  toggleTheme,
} from '@/lib/actions'
import { trackEvent } from '@/lib/analytics'
import { getIcon } from '@/lib/icon-map'
import { useCommandPaletteStore } from '@/stores/command-palette'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import {
  PREVIEW_WIDTH_DESKTOP,
  PREVIEW_WIDTH_MOBILE,
  usePreviewStore,
} from '@/stores/preview'
import { codeThemes } from '@/themes/code-theme/metadata'
import { infographicPalettes, infographicThemes } from '@/themes/infographic-theme'
import { markdownStyles } from '@/themes/markdown-style/metadata'
import { mermaidThemes } from '@/themes/mermaid-theme'
import { useHotkeys } from './use-hotkeys'

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
const modKey = isMac ? '⌘' : 'Ctrl'

function HotkeyShortcut({ hotkey }: { hotkey: { key: string, shift: boolean } }) {
  return (
    <CommandShortcut>
      <Kbd>{modKey}</Kbd>
      {hotkey.shift && <Kbd>⇧</Kbd>}
      <Kbd>{hotkey.key.toUpperCase()}</Kbd>
    </CommandShortcut>
  )
}

const ImportCommandIcon = getIcon(editorCommandConfig.import.icon)
const ExportCommandIcon = getIcon(editorCommandConfig.export.icon)
const FormatCommandIcon = getIcon(editorCommandConfig.format.icon)
const ExportImageCommandIcon = getIcon(editorCommandConfig.exportImage.icon)
const CopyImageCommandIcon = getIcon(editorCommandConfig.copyImage.icon)
const ExportPdfCommandIcon = getIcon(editorCommandConfig.exportPdf.icon)
const PrintPreviewCommandIcon = getIcon(editorCommandConfig.printPreview.icon)
const ThemeLightCommandIcon = getIcon(editorCommandConfig.themeToggle.iconLight)
const ThemeDarkCommandIcon = getIcon(editorCommandConfig.themeToggle.iconDark)
const MobileViewIcon = getIcon(viewModeConfig.mobile.icon)
const DesktopViewIcon = getIcon(viewModeConfig.desktop.icon)

const editorSettingsItems = editorSettingsConfig.map(item => ({
  ...item,
  Icon: getIcon(item.icon),
}))

const platformItems = supportedPlatforms.map((platform) => {
  const config = platformConfig[platform]

  return {
    platform,
    config,
    Icon: getIcon(config.icon),
  }
})

const internalNavigationItems = navigationConfig.internal.map(item => ({
  ...item,
  Icon: getIcon(item.icon),
}))

const externalNavigationItems = navigationConfig.external.map(item => ({
  ...item,
  Icon: getIcon(item.icon),
}))

export function CommandPalette() {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()

  const { open, setOpen, subMenu, setSubMenu, resetSubMenu } = useCommandPaletteStore()
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const content = useFilesStore(state => state.currentContent)
  const setContent = useFilesStore(state => state.setCurrentContent)
  const createFile = useFilesStore(state => state.createFile)
  const switchFile = useFilesStore(state => state.switchFile)
  const previewWidth = usePreviewStore(state => state.previewWidth)
  const setUserPreferredWidth = usePreviewStore(state => state.setUserPreferredWidth)
  const markdownStyle = usePreviewStore(state => state.markdownStyle)
  const setMarkdownStyle = usePreviewStore(state => state.setMarkdownStyle)
  const codeTheme = usePreviewStore(state => state.codeTheme)
  const setCodeTheme = usePreviewStore(state => state.setCodeTheme)
  const mermaidTheme = usePreviewStore(state => state.mermaidTheme)
  const setMermaidTheme = usePreviewStore(state => state.setMermaidTheme)
  const infographic = usePreviewStore(state => state.infographic)
  const setInfographic = usePreviewStore(state => state.setInfographic)

  const editorStore = useEditorStore()

  const wechatCopy = usePlatformCopy('wechat')
  const htmlCopy = usePlatformCopy('html')

  const platformCopyGetters = useMemo(() => ({
    wechat: wechatCopy.getHtml,
    html: htmlCopy.getHtml,
  }), [wechatCopy.getHtml, htmlCopy.getHtml])

  const isDark = theme === 'dark'
  const isMobileView = previewWidth === PREVIEW_WIDTH_MOBILE
  const isDesktopView = previewWidth === PREVIEW_WIDTH_DESKTOP

  const closePanel = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  const handleNewFile = useCallback(async () => {
    closePanel()
    trackEvent('editor', 'new-file', 'menu')
    const id = await createFile()
    await switchFile(id)
  }, [closePanel, createFile, switchFile])

  const handleImport = useCallback(() => {
    closePanel()
    trackEvent('editor', 'import', 'menu')
    setTimeout(() => {
      handleImportFiles()
    }, 150)
  }, [closePanel])

  const handleExport = useCallback(() => {
    closePanel()
    trackEvent('export', 'markdown', 'menu')
    exportMarkdown(content)
  }, [closePanel, content])

  const handleFormat = useCallback(async () => {
    closePanel()
    trackEvent('editor', 'format', 'menu')
    await formatMarkdown(content, setContent)
  }, [closePanel, content, setContent])

  const handleOpenResetDialog = useCallback(() => {
    closePanel()
    setTimeout(setResetDialogOpen, 150, true)
  }, [closePanel])

  const handleCopyPlatform = useCallback((platform: SupportedPlatform) => async () => {
    closePanel()
    await copyPlatform({
      platform,
      markdownStyle,
      codeTheme,
      mermaidTheme,
      infographicTheme: infographic.theme,
      infographicPalette: infographic.palette,
      source: 'menu',
      getHtml: platformCopyGetters[platform],
    })
  }, [closePanel, markdownStyle, codeTheme, mermaidTheme, infographic, platformCopyGetters])

  const handleExportImage = useCallback(async () => {
    closePanel()
    trackEvent('export', 'image', 'menu')
    await exportImage()
  }, [closePanel])

  const handleCopyImage = useCallback(async () => {
    closePanel()
    trackEvent('copy', 'image', 'menu')
    await copyImage()
  }, [closePanel])

  const handleExportPdf = useCallback(async () => {
    closePanel()
    trackEvent('export', 'pdf', 'menu')
    await exportPdf()
  }, [closePanel])

  const handlePrintPreview = useCallback(() => {
    closePanel()
    trackEvent('export', 'print', 'menu')
    printPreview()
  }, [closePanel])

  const handleThemeToggle = useCallback(() => {
    trackEvent('theme', 'toggle', 'menu')
    toggleTheme(isDark, setTheme)
  }, [isDark, setTheme])

  const handleMobileView = useCallback(() => {
    closePanel()
    setUserPreferredWidth(PREVIEW_WIDTH_MOBILE)
  }, [closePanel, setUserPreferredWidth])

  const handleDesktopView = useCallback(() => {
    closePanel()
    setUserPreferredWidth(PREVIEW_WIDTH_DESKTOP)
  }, [closePanel, setUserPreferredWidth])

  const handleNavigate = useCallback((path: string) => {
    closePanel()
    navigate({ to: path })
  }, [closePanel, navigate])

  const handleExternalLink = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
    closePanel()
  }, [closePanel])

  const handleToggleSetting = useCallback((storeKey: EditorBooleanKey, setterKey: EditorBooleanSetterKey) => {
    const currentValue = editorStore[storeKey]
    const setter = editorStore[setterKey]
    setter(!currentValue)
  }, [editorStore])

  const handleSelectMarkdownStyle = useCallback((id: string) => {
    setMarkdownStyle(id)
    resetSubMenu()
    closePanel()
  }, [setMarkdownStyle, resetSubMenu, closePanel])

  const handleSelectCodeTheme = useCallback((id: string) => {
    setCodeTheme(id)
    resetSubMenu()
    closePanel()
  }, [setCodeTheme, resetSubMenu, closePanel])

  const handleSelectMermaidTheme = useCallback((id: string) => {
    setMermaidTheme(id)
    resetSubMenu()
    closePanel()
  }, [setMermaidTheme, resetSubMenu, closePanel])

  const handleSelectInfographicTheme = useCallback((id: string) => {
    setInfographic({ theme: id })
    resetSubMenu()
    closePanel()
  }, [setInfographic, resetSubMenu, closePanel])

  const handleSelectInfographicPalette = useCallback((id: string) => {
    setInfographic({ palette: id })
    resetSubMenu()
    closePanel()
  }, [setInfographic, resetSubMenu, closePanel])

  const hotkeyHandlers = useMemo(() => [
    { key: editorCommandConfig.import.hotkey.key, handler: handleImport },
    { key: editorCommandConfig.export.hotkey.key, handler: handleExport },
    { key: editorCommandConfig.format.hotkey.key, shift: editorCommandConfig.format.hotkey.shift, handler: handleFormat },
    { key: platformConfig.wechat.hotkey.key, shift: platformConfig.wechat.hotkey.shift, handler: handleCopyPlatform('wechat') },
    { key: platformConfig.html.hotkey.key, shift: platformConfig.html.hotkey.shift, handler: handleCopyPlatform('html') },
  ], [handleImport, handleExport, handleFormat, handleCopyPlatform])

  useHotkeys(hotkeyHandlers)

  const renderMainMenu = () => {
    return (
      <>
        <CommandGroup heading="编辑器">
          <CommandItem onSelect={handleNewFile}>
            <FilePlus className="size-4" />
            新建文件
          </CommandItem>
          <CommandItem onSelect={handleImport}>
            <ImportCommandIcon className="size-4" />
            {editorCommandConfig.import.label}
            <HotkeyShortcut hotkey={editorCommandConfig.import.hotkey} />
          </CommandItem>
          <CommandItem onSelect={handleExport}>
            <ExportCommandIcon className="size-4" />
            {editorCommandConfig.export.label}
            <HotkeyShortcut hotkey={editorCommandConfig.export.hotkey} />
          </CommandItem>
          <CommandItem onSelect={handleFormat}>
            <FormatCommandIcon className="size-4" />
            {editorCommandConfig.format.label}
            <HotkeyShortcut hotkey={editorCommandConfig.format.hotkey} />
          </CommandItem>
          <CommandItem onSelect={handleOpenResetDialog}>
            <RotateCcw className="size-4" />
            重置内容
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="编辑器设置">
          {editorSettingsItems.map((item) => {
            const isChecked = editorStore[item.storeKey]
            return (
              <CommandItem
                key={item.id}
                onSelect={() => handleToggleSetting(item.storeKey, item.setterKey)}
                data-checked={isChecked}
              >
                <item.Icon className="size-4" />
                {item.label}
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="复制导出">
          {platformItems.map(item => (
            <CommandItem key={item.platform} onSelect={handleCopyPlatform(item.platform)}>
              <item.Icon className="size-4" />
              {item.config.label}
              <HotkeyShortcut hotkey={item.config.hotkey} />
            </CommandItem>
          ))}
          <CommandItem onSelect={handleCopyImage}>
            <CopyImageCommandIcon className="size-4" />
            {editorCommandConfig.copyImage.label}
          </CommandItem>
          <CommandItem onSelect={handleExportImage}>
            <ExportImageCommandIcon className="size-4" />
            {editorCommandConfig.exportImage.label}
          </CommandItem>
          <CommandItem onSelect={handleExportPdf}>
            <ExportPdfCommandIcon className="size-4" />
            {editorCommandConfig.exportPdf.label}
          </CommandItem>
          <CommandItem onSelect={handlePrintPreview}>
            <PrintPreviewCommandIcon className="size-4" />
            {editorCommandConfig.printPreview.label}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="外观设置">
          <CommandItem onSelect={handleThemeToggle}>
            {isDark
              ? <ThemeDarkCommandIcon className="size-4" />
              : <ThemeLightCommandIcon className="size-4" />}
            {isDark ? editorCommandConfig.themeToggle.labelDark : editorCommandConfig.themeToggle.labelLight}
          </CommandItem>
          <CommandItem onSelect={handleMobileView} data-checked={isMobileView}>
            <MobileViewIcon className="size-4" />
            {viewModeConfig.mobile.label}
          </CommandItem>
          <CommandItem onSelect={handleDesktopView} data-checked={isDesktopView}>
            <DesktopViewIcon className="size-4" />
            {viewModeConfig.desktop.label}
          </CommandItem>
          <CommandItem onSelect={() => setSubMenu('markdownStyle')}>
            <Palette className="size-4" />
            排版样式
            <CommandShortcut><ChevronRight className="size-4" /></CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => setSubMenu('codeTheme')}>
            <Code className="size-4" />
            代码主题
            <CommandShortcut><ChevronRight className="size-4" /></CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => setSubMenu('mermaidTheme')}>
            <Workflow className="size-4" />
            流程图主题
            <CommandShortcut><ChevronRight className="size-4" /></CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => setSubMenu('infographicTheme')}>
            <ImageIcon className="size-4" />
            信息图主题
            <CommandShortcut><ChevronRight className="size-4" /></CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => setSubMenu('infographicPalette')}>
            <PaletteIcon className="size-4" />
            信息图色板
            <CommandShortcut><ChevronRight className="size-4" /></CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="导航">
          {internalNavigationItems.map(item => (
            <CommandItem key={item.path} onSelect={() => handleNavigate(item.path)}>
              <item.Icon className="size-4" />
              {item.label}
            </CommandItem>
          ))}
          {externalNavigationItems.map(item => (
            <CommandItem key={item.url} onSelect={() => handleExternalLink(item.url)}>
              <item.Icon className="size-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </>
    )
  }

  const renderMarkdownStyleMenu = () => (
    <CommandGroup heading="排版样式">
      <CommandItem onSelect={resetSubMenu}>
        <ChevronLeft className="size-4" />
        返回
      </CommandItem>
      <CommandSeparator />
      {markdownStyles.map(style => (
        <CommandItem
          key={style.id}
          onSelect={() => handleSelectMarkdownStyle(style.id)}
          data-checked={markdownStyle === style.id}
        >
          <Palette className="size-4" />
          {style.name}
        </CommandItem>
      ))}
    </CommandGroup>
  )

  const renderCodeThemeMenu = () => (
    <CommandGroup heading="代码主题">
      <CommandItem onSelect={resetSubMenu}>
        <ChevronLeft className="size-4" />
        返回
      </CommandItem>
      <CommandSeparator />
      {codeThemes.map(theme => (
        <CommandItem
          key={theme.id}
          onSelect={() => handleSelectCodeTheme(theme.id)}
          data-checked={codeTheme === theme.id}
        >
          <Code className="size-4" />
          {theme.name}
        </CommandItem>
      ))}
    </CommandGroup>
  )

  const renderMermaidThemeMenu = () => (
    <CommandGroup heading="流程图主题">
      <CommandItem onSelect={resetSubMenu}>
        <ChevronLeft className="size-4" />
        返回
      </CommandItem>
      <CommandSeparator />
      {mermaidThemes.map(theme => (
        <CommandItem
          key={theme.id}
          onSelect={() => handleSelectMermaidTheme(theme.id)}
          data-checked={mermaidTheme === theme.id}
        >
          <Workflow className="size-4" />
          {theme.name}
        </CommandItem>
      ))}
    </CommandGroup>
  )

  const renderInfographicThemeMenu = () => (
    <CommandGroup heading="信息图主题">
      <CommandItem onSelect={resetSubMenu}>
        <ChevronLeft className="size-4" />
        返回
      </CommandItem>
      <CommandSeparator />
      {infographicThemes.map(theme => (
        <CommandItem
          key={theme.id}
          onSelect={() => handleSelectInfographicTheme(theme.id)}
          data-checked={infographic.theme === theme.id}
        >
          <ImageIcon className="size-4" />
          {theme.name}
        </CommandItem>
      ))}
    </CommandGroup>
  )

  const renderInfographicPaletteMenu = () => (
    <CommandGroup heading="信息图色板">
      <CommandItem onSelect={resetSubMenu}>
        <ChevronLeft className="size-4" />
        返回
      </CommandItem>
      <CommandSeparator />
      {infographicPalettes.map(palette => (
        <CommandItem
          key={palette.id}
          onSelect={() => handleSelectInfographicPalette(palette.id)}
          data-checked={infographic.palette === palette.id}
        >
          <PaletteIcon className="size-4" />
          {palette.name}
        </CommandItem>
      ))}
    </CommandGroup>
  )

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="命令面板"
        description="搜索命令..."
      >
        <Command>
          <CommandInput placeholder="搜索命令..." />
          <CommandList>
            <CommandEmpty>未找到相关命令</CommandEmpty>
            {subMenu === null && renderMainMenu()}
            {subMenu === 'markdownStyle' && renderMarkdownStyleMenu()}
            {subMenu === 'codeTheme' && renderCodeThemeMenu()}
            {subMenu === 'mermaidTheme' && renderMermaidThemeMenu()}
            {subMenu === 'infographicTheme' && renderInfographicThemeMenu()}
            {subMenu === 'infographicPalette' && renderInfographicPaletteMenu()}
          </CommandList>
        </Command>
      </CommandDialog>
      <ResetContentDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen} />
    </>
  )
}
