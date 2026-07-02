import { useFilesStore } from '@/stores/files'

const LAUNCH_HANDLED_KEY = 'bm.md.launch-handled'

interface LaunchFileContent {
  name: string
  content: string
}

export function initFileHandler() {
  if (!('launchQueue' in window))
    return

  window.launchQueue!.setConsumer(async (launchParams) => {
    if (!launchParams.files?.length)
      return

    // 使用 sessionStorage 防止刷新后重复处理
    const handledKey = launchParams.files
      .map(f => f.name)
      .sort()
      .join('|')
    const lastHandled = sessionStorage.getItem(LAUNCH_HANDLED_KEY)
    if (lastHandled === handledKey) {
      return
    }
    sessionStorage.setItem(LAUNCH_HANDLED_KEY, handledKey)

    const { createFile, switchFile } = useFilesStore.getState()
    let lastCreatedId: string | null = null

    const files = await Promise.all(
      launchParams.files.map(async (fileHandle): Promise<LaunchFileContent | null> => {
        try {
          const file = await fileHandle.getFile()
          if (!/\.(?:md|markdown|mdown|mkd)$/i.test(file.name))
            return null

          const content = await file.text()
          return { name: file.name, content }
        }
        catch (err) {
          console.error('[bm.md] 无法读取文件:', err)
          return null
        }
      }),
    )

    for (const file of files) {
      if (!file)
        continue

      try {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- 文件创建会写入标签页状态，需要按原始文件顺序串行执行。
        const id = await createFile(file.name, file.content)
        lastCreatedId = id
      }
      catch (err) {
        console.error('[bm.md] 无法创建文件:', err)
      }
    }

    if (lastCreatedId) {
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- 必须等所有文件创建完成后才能切换到最后创建的标签页。
      await switchFile(lastCreatedId)
    }
  })
}
