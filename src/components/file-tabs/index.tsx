import { useEffect, useRef } from 'react'
import { useFilesStore } from '@/stores/files'
import { FileTab } from './file-tab'
import { NewFileButton } from './new-file-button'

export function FileTabs() {
  const files = useFilesStore(state => state.files)
  const activeFileId = useFilesStore(state => state.activeFileId)
  const isInitialized = useFilesStore(state => state.isInitialized)
  const hasHydrated = useFilesStore(state => state.hasHydrated)
  const initialize = useFilesStore(state => state.initialize)
  const switchFile = useFilesStore(state => state.switchFile)
  const createFile = useFilesStore(state => state.createFile)
  const deleteFile = useFilesStore(state => state.deleteFile)
  const renameFile = useFilesStore(state => state.renameFile)

  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (hasHydrated) {
      initialize()
    }
  }, [hasHydrated, initialize])

  useEffect(() => {
    if (isInitialized && activeFileId) {
      // 延迟一帧确保 DOM 已渲染且 ref 已注册
      requestAnimationFrame(() => {
        const tabElement = tabRefs.current.get(activeFileId)
        if (tabElement) {
          tabElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest',
          })
        }
      })
    }
  }, [isInitialized, activeFileId])

  const handleCreateFile = async () => {
    const id = await createFile()
    await switchFile(id)
  }

  const setTabRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) {
      tabRefs.current.set(id, el)
    }
    else {
      tabRefs.current.delete(id)
    }
  }

  const handleTabKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      const nextIndex = e.key === 'ArrowLeft'
        ? (currentIndex - 1 + files.length) % files.length
        : (currentIndex + 1) % files.length
      const nextFile = files[nextIndex]
      switchFile(nextFile.id)
      requestAnimationFrame(() => {
        tabRefs.current.get(nextFile.id)?.focus()
      })
    }
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const file = files[currentIndex]
      switchFile(file.id)
    }
    else if (e.key === 'Home') {
      e.preventDefault()
      const firstFile = files[0]
      switchFile(firstFile.id)
      requestAnimationFrame(() => {
        tabRefs.current.get(firstFile.id)?.focus()
      })
    }
    else if (e.key === 'End') {
      e.preventDefault()
      const lastFile = files[files.length - 1]
      switchFile(lastFile.id)
      requestAnimationFrame(() => {
        tabRefs.current.get(lastFile.id)?.focus()
      })
    }
  }

  if (!isInitialized) {
    return (
      <div className="flex h-8 shrink-0 items-center border-b bg-muted/30 px-1" />
    )
  }

  return (
    <div className="flex h-8 shrink-0 items-center border-b bg-muted/30">
      <div
        role="tablist"
        aria-label="打开的文件"
        className="scrollbar-none flex min-w-0 flex-1 overflow-x-auto"
      >
        {files.map((file, index) => (
          <div
            key={file.id}
            ref={setTabRef(file.id)}
            role="tab"
            aria-selected={file.id === activeFileId}
            tabIndex={file.id === activeFileId ? 0 : -1}
            onClick={() => switchFile(file.id)}
            onKeyDown={e => handleTabKeyDown(e, index)}
          >
            <FileTab
              file={file}
              isActive={file.id === activeFileId}
              onClose={() => deleteFile(file.id)}
              onRename={name => renameFile(file.id, name)}
            />
          </div>
        ))}
      </div>
      <div className="shrink-0 border-l px-1">
        <NewFileButton onClick={handleCreateFile} />
      </div>
    </div>
  )
}
