import { checkboxChoiceLabels } from '../lib/checkboxInput'
import type { OrcheInput } from '../lib/types'

type Props = {
  def: OrcheInput
  value: unknown
  disabled?: boolean
  onChange: (value: unknown) => void
  onCommit?: (value: unknown) => void
}

export function InputField({ def, value, disabled, onChange, onCommit }: Props) {
  function emit(v: unknown) {
    onChange(v)
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
          onChange={(e) => emit(e.target.value)}
          onBlur={(e) => onCommit?.(e.target.value)}
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
            emit(raw === '' ? '' : Number(raw))
          }}
          onBlur={(e) => {
            const raw = e.target.value
            onCommit?.(raw === '' ? '' : Number(raw))
          }}
        />
      ) : def.type === 'textarea' ? (
        <textarea
          className="input textarea"
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => emit(e.target.value)}
          onBlur={(e) => onCommit?.(e.target.value)}
        />
      ) : def.type === 'equipment' ? (
        (() => {
          const o =
            value && typeof value === 'object' && !Array.isArray(value)
              ? (value as Record<string, unknown>)
              : {}
          const description = typeof o.description === 'string' ? o.description : ''
          const part_number = typeof o.part_number === 'string' ? o.part_number : ''
          const equipment_id = typeof o.equipment_id === 'string' ? o.equipment_id : ''
          const patch = (next: Record<string, string>) => {
            const merged = { description, part_number, equipment_id, ...next }
            emit(merged)
            return merged
          }
          return (
            <div className="equipmentInputGrid">
              <input
                className="input"
                disabled={disabled}
                placeholder={def.label || 'Description'}
                value={description}
                onChange={(e) => patch({ description: e.target.value })}
                onBlur={(e) =>
                  onCommit?.(patch({ description: e.target.value }))
                }
              />
              <input
                className="input"
                disabled={disabled}
                placeholder={def.part_number ? `Part: ${def.part_number}` : 'Part no.'}
                value={part_number}
                onChange={(e) => patch({ part_number: e.target.value })}
                onBlur={(e) =>
                  onCommit?.(patch({ part_number: e.target.value }))
                }
              />
              <input
                className="input"
                disabled={disabled}
                placeholder={def.equipment_id ? `ID: ${def.equipment_id}` : 'Equipment ID'}
                value={equipment_id}
                onChange={(e) => patch({ equipment_id: e.target.value })}
                onBlur={(e) =>
                  onCommit?.(patch({ equipment_id: e.target.value }))
                }
              />
            </div>
          )
        })()
      ) : def.type === 'select' ? (
        <select
          className="input"
          disabled={disabled}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => {
            emit(e.target.value)
            onCommit?.(e.target.value)
          }}
        >
          <option value="">Select…</option>
          {def.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        (() => {
          const { trueLabel, falseLabel } = checkboxChoiceLabels(def, 'long')
          return (
            <div className="yesNoToggle" role="group" aria-label={def.label || `${trueLabel} or ${falseLabel}`}>
              <button
                type="button"
                className={`yesNoOption ${value === true ? 'yesNoOptionActive' : ''}`}
                disabled={disabled}
                onClick={() => {
                  emit(true)
                  onCommit?.(true)
                }}
              >
                {trueLabel}
              </button>
              <button
                type="button"
                className={`yesNoOption ${value === false ? 'yesNoOptionActive' : ''}`}
                disabled={disabled}
                onClick={() => {
                  emit(false)
                  onCommit?.(false)
                }}
              >
                {falseLabel}
              </button>
            </div>
          )
        })()
      )}
    </div>
  )
}

export { stepInputsValid } from '../lib/inputValidation'
