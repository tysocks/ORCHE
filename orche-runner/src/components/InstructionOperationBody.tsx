import type { MutableRefObject } from 'react'
import type { OperationStep } from '../lib/types'
import { InputField } from './InputField'
import { MarkdownContent } from './MarkdownContent'
import { StepToolbar } from './StepToolbar'

type StepMeta = Record<string, { completed: boolean; completedBy?: string; note: string }>

type Props = {
  steps: OperationStep[]
  stepMeta: StepMeta
  values: Record<string, unknown>
  templatePath: string
  isComplete: boolean
  stepRefs: MutableRefObject<Record<string, HTMLElement | null>>
  onToggleComplete: (stepId: string, inputs: OperationStep['inputs']) => void
  onSaveNote: (stepId: string, note: string) => void
  onNextStep: (fromIndex: number) => void
  onInputChange: (inputId: string, value: unknown) => void
  onInputCommit: (inputId: string, value: unknown) => void
  stepInputsValid: (inputs: OperationStep['inputs'], values: Record<string, unknown>) => boolean
}

export function InstructionOperationBody({
  steps,
  stepMeta,
  values,
  templatePath,
  isComplete,
  stepRefs,
  onToggleComplete,
  onSaveNote,
  onNextStep,
  onInputChange,
  onInputCommit,
  stepInputsValid,
}: Props) {
  return (
    <>
      {steps.map((step, index) => {
        const meta = stepMeta[step.id] ?? { completed: false, note: '' }
        const done = meta.completed
        const canComplete = isComplete && stepInputsValid(step.inputs, values)

        return (
          <section
            key={step.id}
            ref={(el) => {
              stepRefs.current[step.id] = el
            }}
            className={`stepCard ${done ? 'stepCardDone' : ''}`}
          >
            <div className="stepCardHead">
              <div className="stepCardHeadLeft">
                <div className="stepNumber">{index + 1}</div>
                <h2 className="stepTitle">{step.title}</h2>
              </div>
              <StepToolbar
                stepId={step.id}
                done={done}
                completedBy={meta.completedBy}
                note={meta.note}
                canComplete={canComplete}
                actionsEnabled={isComplete}
                onToggleComplete={() => onToggleComplete(step.id, step.inputs)}
                onSaveNote={(note) => onSaveNote(step.id, note)}
                onNextStep={() => onNextStep(index)}
              />
            </div>

            {step.bodyMarkdown ? (
              <div className="stepBody doc">
                <MarkdownContent templatePath={templatePath}>{step.bodyMarkdown}</MarkdownContent>
              </div>
            ) : null}

            {step.inputs.length > 0 ? (
              <div className="stepInputs">
                {step.inputs.map((def) => (
                  <InputField
                    key={def.id}
                    def={def}
                    value={values[def.id]}
                    disabled={!isComplete}
                    onChange={(v) => onInputChange(def.id, v)}
                    onCommit={(v) => onInputCommit(def.id, v)}
                  />
                ))}
              </div>
            ) : null}
          </section>
        )
      })}
    </>
  )
}
