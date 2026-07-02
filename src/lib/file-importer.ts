import { toast } from 'sonner'
import { useFilesStore } from '@/stores/files'

interface ImportedFile {
  name: string
  content: string
}

async function parseFileToMarkdown(file: File): Promise<ImportedFile | null> {
  if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
    const content = await file.text()
    const name = file.name.endsWith('.md') ? file.name : `${file.name}.md`
    return { name, content }
  }

  if (file.type === 'text/html') {
    const [html, { markdown }] = await Promise.all([
      file.text(),
      import('@/lib/markdown/browser'),
    ])
    const { result: content } = await markdown.parse({ html })
    const baseName = file.name.replace(/\.html?$/i, '')
    return { name: `${baseName}.md`, content }
  }

  return null
}

export async function importFilesAsNewTabs(files: File[]): Promise<string | null> {
  const { createFile, switchFile } = useFilesStore.getState()
  let lastCreatedId: string | null = null
  const parsedFiles = await Promise.allSettled(files.map(file => parseFileToMarkdown(file)))

  for (let index = 0; index < parsedFiles.length; index++) {
    const result = parsedFiles[index]
    if (result.status === 'rejected') {
      console.error('Import error:', result.reason)
      toast.error(`导入失败: ${files[index].name}`)
      continue
    }

    const parsed = result.value
    if (parsed) {
      try {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- 文件创建会写入标签页状态，需要按原始文件顺序串行执行。
        const id = await createFile(parsed.name, parsed.content)
        lastCreatedId = id
        toast.success(`导入成功: ${parsed.name}`)
      }
      catch (error) {
        console.error('Import error:', error)
        toast.error(`导入失败: ${files[index].name}`)
      }
    }
  }

  if (lastCreatedId) {
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- 必须等所有文件创建完成后才能切换到最后创建的标签页。
    await switchFile(lastCreatedId)
  }

  return lastCreatedId
}

export function isTextFile(file: File): boolean {
  return (
    file.type === 'text/markdown'
    || file.name.endsWith('.md')
    || file.type === 'text/html'
  )
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}
