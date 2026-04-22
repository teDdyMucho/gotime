import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, X } from 'lucide-react'

export interface ComboboxOption {
  value: string
  label: string
  sublabel?: string
}

interface ComboboxProps {
  value: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  emptyText?: string
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Search…',
  disabled,
  className,
  emptyText = 'No results',
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : options

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    }
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest('[data-combobox-dropdown]')
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false)
    if (e.key === 'Enter' && filtered.length === 1) {
      onChange(filtered[0].value)
      setOpen(false)
    }
  }

  const dropdown = open ? createPortal(
    <div
      data-combobox-dropdown
      style={dropdownStyle}
      className="rounded-md border bg-white shadow-lg max-h-60 overflow-auto"
    >
      {!filtered.length ? (
        <div className="py-4 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        filtered.map((opt) => (
          <div
            key={opt.value}
            className={cn(
              'flex items-start gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50',
              opt.value === value && 'bg-gray-50'
            )}
            onMouseDown={(e) => {
              e.preventDefault()
              onChange(opt.value)
              setOpen(false)
            }}
          >
            <Check
              className={cn(
                'h-4 w-4 mt-0.5 shrink-0 text-brand-600',
                opt.value === value ? 'opacity-100' : 'opacity-0'
              )}
            />
            <div className="min-w-0">
              <div className="truncate">{opt.label}</div>
              {opt.sublabel && (
                <div className="text-xs text-muted-foreground truncate">{opt.sublabel}</div>
              )}
            </div>
          </div>
        ))
      )}
    </div>,
    document.body
  ) : null

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        ref={triggerRef}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm cursor-pointer transition-colors',
          'hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          open && 'ring-1 ring-ring border-ring'
        )}
        onClick={() => {
          if (!disabled) {
            setOpen(true)
            setTimeout(() => inputRef.current?.focus(), 10)
          }
        }}
      >
        {open ? (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selected?.label || placeholder}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-0"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={cn('flex-1 truncate', !selected && 'text-muted-foreground')}>
            {selected?.label || placeholder}
          </span>
        )}
        <div className="flex items-center gap-1 ml-1 shrink-0">
          {value && !disabled && (
            <X
              className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
                setOpen(false)
              }}
            />
          )}
          <ChevronDown
            className={cn('h-4 w-4 opacity-50 transition-transform', open && 'rotate-180')}
          />
        </div>
      </div>

      {dropdown}
    </div>
  )
}
