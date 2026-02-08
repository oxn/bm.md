import type { MarkdownFile } from '@/stores/files'
import { FileText, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const MAX_NAME_LENGTH = 20

interface FileTabProps {
  file: MarkdownFile
  isActive: boolean
  onClose: () => void
  onRename: (name: string) => void
}

export function FileTab({ file, isActive, onClose, onRename }: FileTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(file.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayName = file.name.length > MAX_NAME_LENGTH
    ? `${file.name.slice(0, MAX_NAME_LENGTH)}...`
    : file.name

  const handleDoubleClick = useCallback(() => {
    setEditName(file.name)
    setIsEditing(true)
  }, [file.name])

  const handleSave = useCallback(() => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== file.name) {
      const finalName = trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`
      onRename(finalName)
    }
    setIsEditing(false)
  }, [editName, file.name, onRename])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // 阻止冒泡，防止外层 tab 的 onKeyDown 拦截
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditName(file.name)
    }
  }, [handleSave, file.name])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      const dotIndex = file.name.lastIndexOf('.')
      if (dotIndex > 0) {
        inputRef.current.setSelectionRange(0, dotIndex)
      }
      else {
        inputRef.current.select()
      }
    }
  }, [isEditing, file.name])

  if (isEditing) {
    return (
      <div
        className="flex h-7 shrink-0 items-center gap-1.5 bg-background px-2"
        onClick={e => e.stopPropagation()}
      >
        <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          aria-label="文件名"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={`
            h-5 w-24 border-b border-primary bg-transparent px-0.5 text-xs
            outline-none
          `}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        `
          group flex h-7 shrink-0 cursor-pointer items-center gap-1.5 px-2
          text-xs transition-colors select-none
        `,
        'hover:bg-accent',
        isActive
          ? 'bg-accent text-primary'
          : 'text-muted-foreground',
      )}
      onDoubleClick={handleDoubleClick}
    >
      <FileText className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="max-w-48 truncate">{displayName}</span>
      <button
        type="button"
        aria-label={`关闭 ${file.name}`}
        className={cn(
          'flex size-6 shrink-0 items-center justify-center transition-opacity',
          'hover:bg-muted',
          isActive
            ? `
              opacity-60
              hover:opacity-100
            `
            : `
              opacity-0
              group-hover:opacity-60 group-hover:hover:opacity-100
            `,
        )}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </div>
  )
}
