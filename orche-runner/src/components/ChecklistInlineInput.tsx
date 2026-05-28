import { checkboxChoiceLabels } from '../lib/checkboxInput'
import type { OrcheInput } from '../lib/types'

type Props = {
  def: OrcheInput
  value: unknown
  disabled?: boolean
  onChange: (value: unknown) => void
  onCommit?: (value: unknown) => void
}

export function ChecklistInlineInput({ def, value, disabled, onChange, onCommit }: Props) {
  if (def.type === 'checkbox') {
    const { trueLabel, falseLabel } = checkboxChoiceLabels(def, 'short')
    const groupLabel = def.label || `${trueLabel} or ${falseLabel}`
    return (
      <div className="checklistInlineYn" role="group" aria-label={groupLabel}>
        <button
          type="button"
          className={`checklistYnBtn ${value === true ? 'checklistYnBtnActive' : ''}`}
          disabled={disabled}
          onClick={() => {
            onChange(true)
            onCommit?.(true)
          }}
        >
          {trueLabel}
        </button>
        <button
          type="button"
          className={`checklistYnBtn ${value === false ? 'checklistYnBtnActive' : ''}`}
          disabled={disabled}
          onClick={() => {
            onChange(false)
            onCommit?.(false)
          }}
        >
          {falseLabel}
        </button>
      </div>
    )
  }

  if (def.type === 'number') {
    return (
      <input
        className="input checklistInlineField"
        type="number"
        inputMode="decimal"
        disabled={disabled}
        placeholder={def.label}
        title={def.label}
        value={value === '' || value == null ? '' : String(value)}
        onChange={(e) => {
          const raw = e.target.value
          onChange(raw === '' ? '' : Number(raw))
        }}
        onBlur={(e) => {
          const raw = e.target.value
          onCommit?.(raw === '' ? '' : Number(raw))
        }}
      />
    )
  }

  if (def.type === 'textarea') {
    return (
      <textarea
        className="input checklistInlineField checklistInlineTextarea"
        disabled={disabled}
        placeholder={def.label}
        title={def.label}
        rows={2}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit?.(e.target.value)}
      />
    )
  }

  if (def.type === 'select') {
    return (
      <select
        className="input checklistInlineField"
        disabled={disabled}
        title={def.label}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => {
          onChange(e.target.value)
          onCommit?.(e.target.value)
        }}
      >
        <option value="">—</option>
        {def.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      className="input checklistInlineField"
      disabled={disabled}
      placeholder={def.label}
      title={def.label}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onCommit?.(e.target.value)}
    />
  )
}
