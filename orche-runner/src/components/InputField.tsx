import { useEffect, useRef } from 'react'
import type { OrcheInput } from '../lib/types'

type Props = {
  def: OrcheInput
  value: unknown
  disabled?: boolean
  onChange: (value: unknown) => void
}

function isEmptyValue(def: OrcheInput, value: unknown): boolean {
  if (def.type === 'checkbox') {
    if (!def.required) return false
    return value !== true
  }
  if (def.type === 'number') return value === '' || value == null || Number.isNaN(Number(value))
  if (typeof value === 'string') return value.trim() === ''
  return value == null
}

export function InputField({ def, value, disabled, onChange }: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function emit(v: unknown) {
    onChange(v)
  }

  function emitDebounced(v: unknown) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(v), 400)
  }

  const required = Boolean(def.required)

  return (
    <div className="orcheInput">
      <div className="orcheLabel">
        {def.label}
        {required ? <span className="req"> *</span> : null}
      </div>

      {def.type === 'text' ? (
        <input
          className="input"
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => emitDebounced(e.target.value)}
          onBlur={(e) => emit(e.target.value)}
        />
      ) : def.type === 'number' ? (
        <input
          className="input"
          type="number"
          inputMode="decimal"
          disabled={disabled}
          value={value === '' || value == null ? '' : String(value)}
          onChange={(e) => {
            const raw = e.target.value
            emitDebounced(raw === '' ? '' : Number(raw))
          }}
          onBlur={(e) => {
            const raw = e.target.value
            emit(raw === '' ? '' : Number(raw))
          }}
        />
      ) : def.type === 'textarea' ? (
        <textarea
          className="input textarea"
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => emitDebounced(e.target.value)}
          onBlur={(e) => emit(e.target.value)}
        />
      ) : def.type === 'select' ? (
        <select
          className="input"
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => emit(e.target.value)}
        >
          <option value="">Select…</option>
          {def.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <div className="yesNoToggle" role="group" aria-label={def.label}>
          <button
            type="button"
            className={`yesNoOption ${value === true ? 'yesNoOptionActive' : ''}`}
            disabled={disabled}
            onClick={() => emit(true)}
          >
            Yes
          </button>
          <button
            type="button"
            className={`yesNoOption ${value === false ? 'yesNoOptionActive' : ''}`}
            disabled={disabled}
            onClick={() => emit(false)}
          >
            No
          </button>
        </div>
      )}
    </div>
  )
}

export function stepInputsValid(
  inputs: OrcheInput[],
  values: Record<string, unknown>,
): boolean {
  for (const def of inputs) {
    if (!def.required) continue
    if (isEmptyValue(def, values[def.id])) return false
  }
  return true
}
