import { ClientOnly, createFileRoute, Outlet } from '@tanstack/react-router'
import { lazy, Suspense, useEffect } from 'react'
import { CommandPalette } from '@/components/command-palette'
import { FooterBar } from '@/components/markdown/footer-bar'
import MarkdownPreviewer from '@/components/markdown/previewer'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useFilesSync } from '@/hooks/use-files-sync'
import { prepareMarkdownWorker } from '@/lib/markdown/prepare-worker'

export const Route = createFileRoute('/_layout')({ component: App })

const MarkdownEditor = lazy(() => import('@/components/markdown/editor'))

function App() {
  useFilesSync()

  useEffect(() => {
    void prepareMarkdownWorker()
  }, [])

  return (
    <div className="flex h-dvh min-h-[700px] min-w-5xl flex-col overflow-hidden">
      <main className="min-h-0 flex-1 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize="50%" minSize="512px">
            <Suspense fallback={<div className="size-full bg-editor" />}>
              <MarkdownEditor />
            </Suspense>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="50%" minSize="512px">
            <MarkdownPreviewer></MarkdownPreviewer>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
      <FooterBar></FooterBar>
      <ClientOnly>
        <CommandPalette />
      </ClientOnly>
      <Outlet />
    </div>
  )
}
