import CodeMirror from '@uiw/react-codemirror'
import { useTheme } from 'next-themes'
import { useEditorScrollSync } from '@/components/markdown/hooks/use-scroll-sync'
import { useEditorStore } from '@/stores/editor'
import { useFilesStore } from '@/stores/files'
import { getAyuCodeMirrorTheme } from '@/themes/codemirror'
import { createEditorExtensions } from './editor-extensions'

export default function CodeMirrorEditor() {
  const content = useFilesStore(state => state.currentContent)
  const setContent = useFilesStore(state => state.setCurrentContent)
  const enableScrollSync = useEditorStore(state => state.enableScrollSync)
  const { theme } = useTheme()

  const { editorExtensions, onCreateEditor } = useEditorScrollSync({
    enabled: enableScrollSync,
  })

  const editorTheme = getAyuCodeMirrorTheme(theme as 'light' | 'dark')
  const extensions = createEditorExtensions(editorExtensions)

  return (
    <CodeMirror
      value={content}
      width="100%"
      height="100%"
      theme={editorTheme}
      extensions={extensions}
      onChange={setContent}
      className="size-full"
      basicSetup={{
        autocompletion: false,
      }}
      onCreateEditor={onCreateEditor}
    />
  )
}
