import { useMemo, useRef, useState } from 'react'
import { useUserSettings } from '../context/UserSettingsContext'
import {
  buildSectionInputSnapshot,
  sectionCanComplete,
} from '../lib/checklist'
import type { ChecklistSection, ParsedOperation, ProcessEvent } from '../lib/types'
import { deriveCompletedSteps, deriveInputValues, deriveOperationStatus, deriveStepMeta } from '../lib/events'
import { stepInputsValid } from './InputField'
import { ChecklistOperationBody } from './ChecklistOperationBody'
import { InstructionOperationBody } from './InstructionOperationBody'
import { operationTypeLabel } from '../lib/operationTypes'
import { AppShell } from './AppShell'
import { OpenProfileLink } from './OpenProfileLink'
import { collectToolsForOperation } from '../lib/tools'
import { MenuDropdown } from './MenuDropdown'
import { SidePanel } from './SidePanel'
import { OperationActionLog } from './OperationActionLog'
import { OperationNotesPanel } from './panels/OperationNotesPanel'
import { RequiredToolsTable } from './RequiredToolsTable'

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

type OpPanel = 'action-log' | 'notes' | null

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

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a === 'object' && a != null && typeof b === 'object' && b != null) {
    return JSON.stringify(a) === JSON.stringify(b)
  }
  return false
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
  const [panel, setPanel] = useState<OpPanel>(null)
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

  const toolEntries = useMemo(
    () => collectToolsForOperation(operation, values),
    [operation, values],
  )

  const noteEntries = useMemo(() => {
    if (operation.operationType === 'checklist') {
      return (operation.checklistSections ?? []).flatMap((sec) =>
        sec.items.map((item) => ({
          id: item.id,
          title: `${item.number} ${item.title}`,
          note: stepMeta[item.id]?.note ?? '',
        })),
      )
    }
    return operation.steps.map((s) => ({
      id: s.id,
      title: s.title,
      note: stepMeta[s.id]?.note ?? '',
    }))
  }, [operation, stepMeta])

  function handleInputChange(inputId: string, value: unknown) {
    if (!isComplete) return
    setLocalValues((prev) => ({ ...prev, [inputId]: value }))
  }

  async function commitInputChange(inputId: string, value: unknown) {
    if (!isComplete) return
    const lastPersisted = persistedValues[inputId]
    if (valuesEqual(lastPersisted, value)) return
    await onEvent({ kind: 'input_changed', inputId, value })
  }

  async function completeStep(
    stepId: string,
    stepInputs: ParsedOperation['steps'][0]['inputs'],
  ) {
    if (!isComplete) return
    if (!stepInputsValid(stepInputs, values)) return

    const snapshot: Record<string, unknown> = {}
    for (const def of stepInputs) {
      snapshot[def.id] = values[def.id]
    }

    await onEvent({
      kind: 'step_completed',
      stepId,
      inputs: snapshot,
      completedBy: settings.operatorName,
    })
    await onRefreshEvents()
  }

  async function completeChecklistSection(section: ChecklistSection) {
    if (!isComplete) return
    if (!sectionCanComplete(section, values)) return

    await onEvent({
      kind: 'step_completed',
      stepId: section.id,
      inputs: buildSectionInputSnapshot(section, values),
      completedBy: settings.operatorName,
    })
    await onRefreshEvents()
  }

  async function toggleChecklistSection(section: ChecklistSection) {
    if (stepMeta[section.id]?.completed) {
      await uncompleteStep(section.id)
    } else {
      await completeChecklistSection(section)
    }
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
        <span className={`opTypePill opTypePill_${operation.operationType}`}>
          {operationTypeLabel(operation.operationType)}
        </span>
        <span className="dot">•</span>
        <span className="muted">
          {completedCount}/{operation.steps.length} steps
        </span>
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

          <MenuDropdown
            ariaLabel="Operation menu"
            items={[
              { id: 'action-log', label: 'Action Log', onClick: () => setPanel('action-log') },
              { id: 'notes', label: 'Notes', onClick: () => setPanel('notes') },
            ]}
          />
        </div>
      }
    >
      <div className="operationRunnerInner">
        {toolsOpen ? (
          <SidePanel title="Required tools" onClose={() => setToolsOpen(false)}>
            <RequiredToolsTable tools={toolEntries} />
          </SidePanel>
        ) : null}

        {panel === 'action-log' ? (
          <SidePanel title="Action log" onClose={() => setPanel(null)}>
            <OperationActionLog
              events={events}
              operationNo={operationNo}
              opId={opId}
              operation={operation}
            />
          </SidePanel>
        ) : null}

        {panel === 'notes' ? (
          <SidePanel title="Notes" onClose={() => setPanel(null)}>
            <OperationNotesPanel operation={operation} noteEntries={noteEntries} />
          </SidePanel>
        ) : null}

        {!isComplete ? (
          <div className="gateBanner gateBannerSticky">
            Set operator name in <OpenProfileLink /> before completing steps.
          </div>
        ) : null}

        <div
          className={`operationBody operationBody_${operation.operationType} ${!isComplete ? 'operationBodyLocked' : ''}`}
        >
          {operation.operationType === 'checklist' ? (
            <ChecklistOperationBody
              sections={operation.checklistSections ?? []}
              stepMeta={stepMeta}
              values={values}
              profileComplete={isComplete}
              stepRefs={stepRefs}
              onToggleSectionComplete={toggleChecklistSection}
              onSaveNote={saveStepNote}
              onInputChange={handleInputChange}
              onInputCommit={commitInputChange}
            />
          ) : (
            <InstructionOperationBody
              steps={operation.steps}
              stepMeta={stepMeta}
              values={values}
              templatePath={templatePath}
              isComplete={isComplete}
              stepRefs={stepRefs}
              onToggleComplete={(stepId, inputs) =>
                stepMeta[stepId]?.completed
                  ? uncompleteStep(stepId)
                  : completeStep(stepId, inputs)
              }
              onSaveNote={saveStepNote}
              onNextStep={scrollToNextIncomplete}
              onInputChange={handleInputChange}
              onInputCommit={commitInputChange}
              stepInputsValid={stepInputsValid}
            />
          )}
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
