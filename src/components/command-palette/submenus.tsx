import type { CommandPaletteActions } from './use-command-palette-actions'
import { ChevronLeft, Code, ImageIcon, Palette, PaletteIcon, Workflow } from 'lucide-react'
import {
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import { codeThemes } from '@/themes/code-theme/metadata'
import { infographicPalettes, infographicThemes } from '@/themes/infographic-theme'
import { markdownStyles } from '@/themes/markdown-style/metadata'
import { mermaidThemes } from '@/themes/mermaid-theme'

interface SubmenuProps {
  actions: CommandPaletteActions
}

export function MarkdownStyleMenu({ actions }: SubmenuProps) {
  return (
    <CommandGroup heading="排版样式">
      <BackItem onSelect={actions.resetSubMenu} />
      <CommandSeparator />
      {markdownStyles.map(style => (
        <CommandItem
          key={style.id}
          onSelect={() => actions.handleSelectMarkdownStyle(style.id)}
          data-checked={actions.markdownStyle === style.id}
        >
          <Palette className="size-4" />
          {style.name}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}

export function CodeThemeMenu({ actions }: SubmenuProps) {
  return (
    <CommandGroup heading="代码主题">
      <BackItem onSelect={actions.resetSubMenu} />
      <CommandSeparator />
      {codeThemes.map(theme => (
        <CommandItem
          key={theme.id}
          onSelect={() => actions.handleSelectCodeTheme(theme.id)}
          data-checked={actions.codeTheme === theme.id}
        >
          <Code className="size-4" />
          {theme.name}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}

export function MermaidThemeMenu({ actions }: SubmenuProps) {
  return (
    <CommandGroup heading="流程图主题">
      <BackItem onSelect={actions.resetSubMenu} />
      <CommandSeparator />
      {mermaidThemes.map(theme => (
        <CommandItem
          key={theme.id}
          onSelect={() => actions.handleSelectMermaidTheme(theme.id)}
          data-checked={actions.mermaidTheme === theme.id}
        >
          <Workflow className="size-4" />
          {theme.name}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}

export function InfographicThemeMenu({ actions }: SubmenuProps) {
  return (
    <CommandGroup heading="信息图主题">
      <BackItem onSelect={actions.resetSubMenu} />
      <CommandSeparator />
      {infographicThemes.map(theme => (
        <CommandItem
          key={theme.id}
          onSelect={() => actions.handleSelectInfographicTheme(theme.id)}
          data-checked={actions.infographic.theme === theme.id}
        >
          <ImageIcon className="size-4" />
          {theme.name}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}

export function InfographicPaletteMenu({ actions }: SubmenuProps) {
  return (
    <CommandGroup heading="信息图色板">
      <BackItem onSelect={actions.resetSubMenu} />
      <CommandSeparator />
      {infographicPalettes.map(palette => (
        <CommandItem
          key={palette.id}
          onSelect={() => actions.handleSelectInfographicPalette(palette.id)}
          data-checked={actions.infographic.palette === palette.id}
        >
          <PaletteIcon className="size-4" />
          {palette.name}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}

function BackItem({ onSelect }: { onSelect: () => void }) {
  return (
    <CommandItem onSelect={onSelect}>
      <ChevronLeft className="size-4" />
      返回
    </CommandItem>
  )
}
