import { ClipboardCopy, Download, FileText, ImageDown, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { editorCommandConfig } from '@/config'
import { copyImage, exportImage, exportPdf, printPreview } from '@/lib/actions'
import { trackEvent } from '@/lib/analytics'

async function onCopyClick() {
  trackEvent('copy', 'image', 'button')
  await copyImage()
}

async function onExportClick() {
  trackEvent('export', 'image', 'button')
  await exportImage()
}

async function onExportPdfClick() {
  trackEvent('export', 'pdf', 'button')
  await exportPdf()
}

function onPrintClick() {
  trackEvent('export', 'print', 'button')
  printPreview()
}

export function ExportButton() {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={(
            <DropdownMenuTrigger
              render={(
                <Button variant="ghost" size="icon" aria-label="导出">
                  <Download className="size-4" />
                </Button>
              )}
            />
          )}
        />
        <TooltipContent>导出</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="cursor-pointer" onClick={onCopyClick}>
          <ClipboardCopy className="size-4" />
          {editorCommandConfig.copyImage.label}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={onExportClick}>
          <ImageDown className="size-4" />
          {editorCommandConfig.exportImage.label}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer" onClick={onExportPdfClick}>
          <FileText className="size-4" />
          {editorCommandConfig.exportPdf.label}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={onPrintClick}>
          <Printer className="size-4" />
          {editorCommandConfig.printPreview.label}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
