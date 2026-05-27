import { useMemo, useRef, useState } from 'react'
import { useUserSettings } from '../context/UserSettingsContext'
import type { ParsedOperation, ProcessEvent } from '../lib/types'
import { deriveCompletedSteps, deriveInputValues, deriveOperationStatus, deriveStepMeta } from '../lib/events'
import { InputField, stepInputsValid } from './InputField'
import { MarkdownContent } from './MarkdownContent'
import { AppShell } from './AppShell'
import { OpenProfileLink } from './OpenProfileLink'
import { StepToolbar } from './StepToolbar'

function IconCheck() {
  return (
    <svg className="stepToolIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconWrench() {
  return (
    <svg className="stepToolIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path
        d="M21 7.5a5.5 5.5 0 01-7.7 5L8.3 17.5a2 2 0 01-2.8 0l-1-1a2 2 0 010-2.8l5-5A5.5 5.5 0 0116.5 3L14 5.5l3 3L21 7.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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

type Props = {
  operation: ParsedOperation
  templatePath: string
  operationNo: number
  operationName: string
  workOrderId: string
  events: ProcessEvent[]
  onHome: () => void
  onBack: () => void
  onEvent: (event: object) => Promise<void>
  onRefreshEvents: () => Promise<void>
}

export function OperationRunner({
  operation,
  templatePath,
  operationNo,
  operationName,
  workOrderId,
  events,
  onHome,
  onBack,
  onEvent,
  onRefreshEvents,
}: Props) {
  const { settings, isComplete } = useUserSettings()
  const opId = operation.opId
  const [toolsOpen, setToolsOpen] = useState(false)
  const [dataOpen, setDataOpen] = useState(false)
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({})
  const stepRefs = useRef<Record<string, HTMLElement | null>>({})

  const persistedValues = useMemo(
    () => deriveInputValues(events, operationNo, opId),
    [events, operationNo, opId],
  )

  const stepMeta = useMemo(
    () => deriveStepMeta(events, operationNo, opId),
    [events, operationNo, opId],
  )

  const values = { ...persistedValues, ...localValues }
  const completedSteps = useMemo(
    () => deriveCompletedSteps(events, operationNo, opId),
    [events, operationNo, opId],
  )

  const completedCount = operation.steps.filter((s) => completedSteps.has(s.id)).length
  const allDone =
    operation.steps.length > 0 && operation.steps.every((s) => completedSteps.has(s.id))
  const opStatus = useMemo(
    () => deriveOperationStatus(events, operationNo, opId),
    [events, operationNo, opId],
  )
  const opIsCompleted = opStatus === 'completed'

  async function handleInputChange(inputId: string, value: unknown) {
    if (!isComplete) return
    setLocalValues((prev) => ({ ...prev, [inputId]: value }))
    await onEvent({ kind: 'input_changed', inputId, value })
  }

  async function completeStep(
    stepId: string,
    stepInputs: ParsedOperation['steps'][0]['inputs'],
  ) {
    if (!isComplete) return
    const snapshot: Record<string, unknown> = {}
    for (const def of stepInputs) {
      if (def.id in values) snapshot[def.id] = values[def.id]
    }
    if (!stepInputsValid(stepInputs, values)) return

    await onEvent({
      kind: 'step_completed',
      stepId,
      inputs: snapshot,
      completedBy: settings.operatorName,
    })
    await onRefreshEvents()
  }

  async function uncompleteStep(stepId: string) {
    if (!isComplete) return
    await onEvent({ kind: 'step_uncompleted', stepId })
    if (opIsCompleted) await onEvent({ kind: 'operation_uncompleted' })
    await onRefreshEvents()
  }

  async function saveStepNote(stepId: string, note: string) {
    if (!isComplete) return
    await onEvent({ kind: 'step_note', stepId, note })
    await onRefreshEvents()
  }

  async function toggleOperationComplete() {
    if (!isComplete) return
    if (!opIsCompleted) {
      if (!allDone) return
      await onEvent({ kind: 'operation_completed' })
    } else {
      await onEvent({ kind: 'operation_uncompleted' })
    }
    await onRefreshEvents()
  }

  function scrollToNextIncomplete(fromIndex: number) {
    const tryScroll = (from: number) => {
      for (let i = from; i < operation.steps.length; i++) {
        const s = operation.steps[i]
        if (!completedSteps.has(s.id)) {
          stepRefs.current[s.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return true
        }
      }
      return false
    }
    if (!tryScroll(fromIndex + 1)) tryScroll(0)
  }

  const headerCenter = (
    <>
      <div className="operationHeaderTitle">
        {operationNo}. {operationName}
      </div>
      <div className="operationHeaderMeta">
        <span className="mono">{opId}</span>
        <span className="dot">•</span>
        <span className="muted">
          {completedCount}/{operation.steps.length} steps
        </span>
        {isComplete ? (
          <>
            <span className="dot">•</span>
            <span className="muted">
              {settings.operatorName} ({settings.workShift})
            </span>
          </>
        ) : null}
        {operation.estimatedMinutes != null ? (
          <>
            <span className="dot">•</span>
            <span className="muted">~{operation.estimatedMinutes} min</span>
          </>
        ) : null}
      </div>
    </>
  )

  return (
    <AppShell
      fullHeight
      onHome={onHome}
      topBarClassName="operationTopBar"
      topBarLeading={
        <button
          type="button"
          className="pill pillButton"
          onClick={onBack}
          title="Back to work order"
          aria-label="Back to work order"
        >
          {workOrderId}
        </button>
      }
      topBarCenter={headerCenter}
      topBarTrailing={
        <div className="opTopActions">
          <button
            type="button"
            className={`stepToolBtn stepToolComplete ${opIsCompleted ? 'stepToolCompleteDone' : 'stepToolSquare'}`}
            onClick={toggleOperationComplete}
            disabled={!isComplete || (!opIsCompleted && !allDone)}
            title={
              opIsCompleted
                ? `Completed by ${settings.operatorName} — click to mark incomplete`
                : allDone
                  ? 'Complete operation'
                  : 'Complete all steps to enable'
            }
            aria-label="Complete operation"
          >
            <IconCheck />
            {opIsCompleted ? (
              <span className="stepToolCompleteName">{settings.operatorName}</span>
            ) : null}
          </button>

          <button
            type="button"
            className="stepToolBtn stepToolSquare"
            onClick={() => setToolsOpen(true)}
            title="Required tools"
            aria-label="Required tools"
          >
            <IconWrench />
          </button>

          <button
            type="button"
            className="stepToolBtn stepToolSquare"
            onClick={() => setDataOpen(true)}
            title="Operation menu"
            aria-label="Operation menu"
          >
            <IconDots />
          </button>
        </div>
      }
    >
      <div className="operationRunnerInner">
        {toolsOpen ? (
          <>
            <button
              type="button"
              className="modalScrim"
              onClick={() => setToolsOpen(false)}
              aria-label="Close tools"
            />
            <div className="modalCard" role="dialog" aria-label="Required tools">
              <div className="modalHead">
                <div className="modalTitle">Required tools</div>
                <button type="button" className="iconBtn" onClick={() => setToolsOpen(false)} aria-label="Close">
                  ×
                </button>
              </div>
              <div className="modalBody">
                {operation.requiredTools && operation.requiredTools.length > 0 ? (
                  <ul className="modalList">
                    {operation.requiredTools.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="muted">No required tools listed for this operation.</div>
                )}
              </div>
            </div>
          </>
        ) : null}

        {dataOpen ? (
          <>
            <button
              type="button"
              className="modalScrim"
              onClick={() => setDataOpen(false)}
              aria-label="Close menu"
            />
            <div className="modalCard" role="dialog" aria-label="Operation menu">
              <div className="modalHead">
                <div className="modalTitle">Operation data</div>
                <button type="button" className="iconBtn" onClick={() => setDataOpen(false)} aria-label="Close">
                  ×
                </button>
              </div>
              <div className="modalBody">
                {Object.entries(stepMeta)
                  .filter(([, m]) => Boolean(m.note && m.note.trim()))
                  .length > 0 ? (
                  <div className="opNotesList">
                    {operation.steps.map((s) => {
                      const n = stepMeta[s.id]?.note ?? ''
                      if (!n.trim()) return null
                      return (
                        <div key={s.id} className="opNoteItem">
                          <div className="opNoteTitle">{s.title}</div>
                          <div className="opNoteText muted">{n}</div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="muted">No step notes recorded for this operation.</div>
                )}
              </div>
            </div>
          </>
        ) : null}

        {!isComplete ? (
          <div className="gateBanner gateBannerSticky">
            Set operator name and shift in <OpenProfileLink /> before completing steps.
          </div>
        ) : null}

        <div className={`operationBody ${!isComplete ? 'operationBodyLocked' : ''}`}>
        {operation.steps.map((step, index) => {
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
                  onToggleComplete={() =>
                    done ? uncompleteStep(step.id) : completeStep(step.id, step.inputs)
                  }
                  onSaveNote={(note) => saveStepNote(step.id, note)}
                  onNextStep={() => scrollToNextIncomplete(index)}
                />
              </div>

              {step.bodyMarkdown ? (
                <div className="stepBody doc">
                  <MarkdownContent templatePath={templatePath}>
                    {step.bodyMarkdown}
                  </MarkdownContent>
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
                      onChange={(v) => handleInputChange(def.id, v)}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          )
        })}
      </div>

        {allDone ? (
          <footer className="operationFooter">
            <span className="muted">All steps complete.</span>
          </footer>
        ) : null}
      </div>
    </AppShell>
  )
}
