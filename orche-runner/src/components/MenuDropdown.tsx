import { useEffect, useRef, useState } from 'react'

export type MenuItem = {
  id: string
  label: string
  disabled?: boolean
  onClick: () => void
}

type Props = {
  items: MenuItem[]
  disabled?: boolean
  ariaLabel?: string
}

function IconDots() {
  return (
    <svg className="stepToolIcon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  )
}

export function MenuDropdown({ items, disabled, ariaLabel = 'More actions' }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="menuDropdownWrap" ref={wrapRef}>
      <button
        type="button"
        className={`stepToolBtn stepToolSquare ${open ? 'stepToolBtnActive' : ''}`}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <IconDots />
      </button>
      {open ? (
        <div className="menuDropdown" role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className="menuDropdownItem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
