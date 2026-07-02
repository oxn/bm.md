import { debounce } from 'es-toolkit'
import { toast } from 'sonner'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import defaultMarkdown from '@/docs/features.md?raw'
import { deleteFileContent, getFileContent, saveFileContent } from '@/lib/file-storage'

export { defaultMarkdown }

export interface MarkdownFile {
  id: string
  name: string
  createdAt: number
  updatedAt: number
}

interface FilesState {
  files: MarkdownFile[]
  activeFileId: string | null
  currentContent: string
  isInitialized: boolean
  hasHydrated: boolean
  lastSaveError: string | null

  setCurrentContent: (content: string) => void
  createFile: (name?: string, content?: string) => Promise<string>
  deleteFile: (id: string) => Promise<void>
  renameFile: (id: string, name: string) => void
  switchFile: (id: string) => Promise<void>
  getActiveFile: () => MarkdownFile | undefined
  initialize: () => Promise<void>
  setHasHydrated: (value: boolean) => void
}

interface SaveRequest {
  content: string
  onSuccess: () => void
  onError: (err: Error) => void
}

const DEFAULT_FILE_NAME = 'bm.md'

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function extractH1Title(content: string): string | null {
  const lines = content.split('\n')
  for (const line of lines) {
    if (line.startsWith('# ')) {
      const title = line.slice(2).trim().replace(/[*_`[\]]/g, '').trim()
      return title || null
    }
  }
  return null
}

function normalizeFileName(name: string): string {
  let normalized = name.trim()
  if (!normalized) {
    normalized = DEFAULT_FILE_NAME
  }
  if (!/\.md$/i.test(normalized)) {
    normalized = `${normalized}.md`
  }
  return normalized
}

function ensureUniqueName(name: string, files: MarkdownFile[], excludeId?: string): string {
  const normalized = normalizeFileName(name)
  const baseName = normalized.replace(/\.md$/i, '')
  const ext = '.md'

  const existingNames = new Set<string>()
  for (const file of files) {
    if (file.id !== excludeId) {
      existingNames.add(file.name.toLowerCase())
    }
  }

  if (!existingNames.has(normalized.toLowerCase())) {
    return normalized
  }

  let i = 1
  while (existingNames.has(`${baseName} (${i})${ext}`.toLowerCase())) {
    i++
  }
  return `${baseName} (${i})${ext}`
}

const pendingSaves = new Map<string, ReturnType<typeof createSaveTask>>()

function createSaveTask(id: string) {
  return debounce(async ({ content, onSuccess, onError }: SaveRequest) => {
    pendingSaves.delete(id)
    try {
      await saveFileContent(id, content)
      onSuccess()
    }
    catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)))
    }
  }, 500)
}

function cancelPendingSave(id: string) {
  const saveTask = pendingSaves.get(id)
  if (saveTask) {
    saveTask.cancel()
    pendingSaves.delete(id)
  }
}

function debouncedSave(id: string, content: string, onSuccess: () => void, onError: (err: Error) => void) {
  const saveTask = pendingSaves.get(id) ?? createSaveTask(id)
  pendingSaves.set(id, saveTask)
  saveTask({ content, onSuccess, onError })
}

let switchSeq = 0
let initPromise: Promise<void> | null = null

export const useFilesStore = create<FilesState>()(
  persist(
    (set, get) => ({
      files: [],
      activeFileId: null,
      currentContent: '',
      isInitialized: false,
      hasHydrated: false,
      lastSaveError: null,

      setHasHydrated: (value) => {
        set({ hasHydrated: value })
      },

      setCurrentContent: (content) => {
        const { activeFileId } = get()
        set({ currentContent: content, lastSaveError: null })

        if (activeFileId) {
          debouncedSave(
            activeFileId,
            content,
            () => {
              const { files } = get()
              set({
                files: files.map(f =>
                  f.id === activeFileId ? { ...f, updatedAt: Date.now() } : f,
                ),
              })
            },
            (err) => {
              set({ lastSaveError: err.message })
              toast.error(`保存失败: ${err.message}`)
            },
          )
        }
      },

      createFile: async (name, content = '') => {
        const { files } = get()
        const id = crypto.randomUUID()
        const rawName = name ?? extractH1Title(content) ?? DEFAULT_FILE_NAME
        const fileName = ensureUniqueName(rawName, files)
        const newFile: MarkdownFile = {
          id,
          name: fileName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        try {
          await saveFileContent(id, content)
        }
        catch (err) {
          const message = getErrorMessage(err)
          set({ lastSaveError: message })
          toast.error(`创建文件保存失败: ${message}`)
        }
        set({ files: [...files, newFile], activeFileId: id, currentContent: content })
        return id
      },

      deleteFile: async (id) => {
        const { files, activeFileId, switchFile, createFile } = get()

        cancelPendingSave(id)

        try {
          await deleteFileContent(id)
        }
        catch (err) {
          const message = getErrorMessage(err)
          set({ lastSaveError: message })
          toast.warning(`删除文件内容失败: ${message}`)
        }

        const newFiles = files.filter(f => f.id !== id)

        if (newFiles.length === 0) {
          set({ files: [] })
          const newId = await createFile(undefined, defaultMarkdown)
          await switchFile(newId)
          return
        }

        set({ files: newFiles })

        if (id === activeFileId) {
          await switchFile(newFiles[0].id)
        }
      },

      renameFile: (id, name) => {
        const { files } = get()
        const newName = ensureUniqueName(name, files, id)
        set({
          files: files.map(f =>
            f.id === id ? { ...f, name: newName, updatedAt: Date.now() } : f,
          ),
        })
      },

      switchFile: async (id) => {
        const { activeFileId, currentContent } = get()
        const thisSeq = ++switchSeq

        // 取消旧文件的 pending save，防止 500ms 后覆盖错误数据
        if (activeFileId) {
          cancelPendingSave(activeFileId)
        }

        if (activeFileId && activeFileId !== id) {
          try {
            await saveFileContent(activeFileId, currentContent)
          }
          catch (err) {
            const message = getErrorMessage(err)
            set({ lastSaveError: message })
            toast.error(`保存失败: ${message}`)
          }
        }

        if (thisSeq !== switchSeq) {
          return
        }

        try {
          // react-doctor-disable-next-line react-doctor/async-defer-await -- 读取期间可能再次切换文件，await 后必须用序号丢弃过期结果。
          const content = await getFileContent(id)
          if (thisSeq !== switchSeq) {
            return
          }
          set({ activeFileId: id, currentContent: content })
        }
        catch (err) {
          console.error('加载文件内容失败:', err)
          if (thisSeq === switchSeq) {
            set({ activeFileId: id, currentContent: '' })
          }
        }
      },

      getActiveFile: () => {
        const { files, activeFileId } = get()
        return files.find(f => f.id === activeFileId)
      },

      initialize: async () => {
        if (initPromise) {
          return initPromise
        }

        const { isInitialized, hasHydrated } = get()
        if (isInitialized || !hasHydrated) {
          return
        }

        initPromise = (async () => {
          let { files, activeFileId } = get()

          if (files.length === 0) {
            const id = crypto.randomUUID()
            const h1Title = extractH1Title(defaultMarkdown)
            const newFile: MarkdownFile = {
              id,
              name: normalizeFileName(h1Title ?? DEFAULT_FILE_NAME),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }
            try {
              await saveFileContent(id, defaultMarkdown)
            }
            catch (err) {
              const message = getErrorMessage(err)
              set({ lastSaveError: message })
              toast.warning(`初始化保存失败: ${message}`)
            }
            files = [newFile]
            activeFileId = id
            set({ files, activeFileId })
          }

          if (!activeFileId && files.length > 0) {
            activeFileId = files[0].id
            set({ activeFileId })
          }

          if (activeFileId) {
            try {
              const content = await getFileContent(activeFileId)
              set({ currentContent: content, isInitialized: true })
            }
            catch (err) {
              console.error('加载初始内容失败:', err)
              set({ currentContent: '', isInitialized: true })
            }
          }
          else {
            set({ isInitialized: true })
          }
        })()

        return initPromise
      },
    }),
    {
      name: 'bm.md.files',
      partialize: state => ({
        files: state.files,
        activeFileId: state.activeFileId,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Zustand rehydration error:', error)
        }
        state?.setHasHydrated(true)
      },
    },
  ),
)
