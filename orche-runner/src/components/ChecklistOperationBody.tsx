import { useState } from 'react'
import type { MutableRefObject } from 'react'
import { itemInputsReady, sectionCanComplete } from '../lib/checklist'
import type { ChecklistSection } from '../lib/types'
import { ChecklistInlineInput } from './ChecklistInlineInput'

type StepMeta = Record<string, { completed: boolean; completedBy?: string; note: string }>

type Props = {
  sections: ChecklistSection[]
  stepMeta: StepMeta
  values: Record<string, unknown>
  profileComplete: boolean
  stepRefs: MutableRefObject<Record<string, HTMLElement | null>>
  onToggleSectionComplete: (section: ChecklistSection) => void | Promise<void>
  onSaveNote: (stepId: string, note: string) => void
  onInputChange: (inputId: string, value: unknown) => void
  onInputCommit: (inputId: string, value: unknown) => void
}

function IconCheckSmall() {
  return (
    <svg className="stepToolIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconNoteSmall() {
  return (
    <svg className="checklistNoteIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChecklistOperationBody({
  sections,
  stepMeta,
  values,
  profileComplete,
  stepRefs,
  onToggleSectionComplete,
  onSaveNote,
  onInputChange,
  onInputCommit,
}: Props) {
  const [noteOpenId, setNoteOpenId] = useState<string | null>(null)
  const [draftNote, setDraftNote] = useState('')

  function openNote(itemId: string) {
    setDraftNote(stepMeta[itemId]?.note ?? '')
    setNoteOpenId((current) => (current === itemId ? null : itemId))
  }

  function saveNote(itemId: string) {
    onSaveNote(itemId, draftNote)
    setNoteOpenId(null)
  }

  return (
    <div className="checklistOperation">
      {sections.map((section) => {
        const sectionMeta = stepMeta[section.id] ?? { completed: false, note: '' }
        const sectionDone = sectionMeta.completed
        const canComplete = profileComplete && sectionCanComplete(section, values)
        const completeTitle = sectionDone
          ? `Completed by ${sectionMeta.completedBy ?? 'operator'} — click to mark incomplete`
          : canComplete
            ? 'Complete section'
            : 'Fill all actions in this section first'

        return (
          <div
            key={section.id}
            ref={(el) => {
              stepRefs.current[section.id] = el
            }}
            className={`checklistSection ${sectionDone ? 'checklistSectionDone' : ''}`}
          >
            <div className="checklistSectionHead">
              <span className="checklistSectionNum">{section.number}</span>
              <span className="checklistSectionTitle">{section.title}</span>
              <button
                type="button"
                className={`stepToolBtn stepToolComplete checklistCompleteBtn ${sectionDone ? 'stepToolCompleteDone checklistCompleteBtnDone' : 'stepToolSquare'}`}
                disabled={!profileComplete || (!sectionDone && !canComplete)}
                onClick={() => void onToggleSectionComplete(section)}
                title={completeTitle}
                aria-label={completeTitle}
              >
                <IconCheckSmall />
                {sectionDone ? (
                  <span className="stepToolCompleteName">{sectionMeta.completedBy ?? 'Done'}</span>
                ) : null}
              </button>
            </div>
            {section.note ? <div className="checklistSectionNote muted">{section.note}</div> : null}

            <ul className="checklistItems">
              {section.items.map((item) => {
                const actionReady = itemInputsReady(item, values)
                return (
                  <li
                    key={item.id}
                    className={`checklistItem ${actionReady ? 'checklistItemReady' : ''} ${sectionDone ? 'checklistItemLocked' : ''}`}
                  >
                    <div className="checklistItemRow">
                      <span className="checklistItemNum">{item.number}</span>
                      <span className="checklistItemTitle">{item.title}</span>

                      <div className="checklistItemTrail">
                        <div className="checklistItemInputs">
                          {item.inputs.map((def) => (
                            <ChecklistInlineInput
                              key={def.id}
                              def={def}
                              value={values[def.id]}
                              disabled={!profileComplete || sectionDone}
                              onChange={(v) => onInputChange(def.id, v)}
                              onCommit={(v) => onInputCommit(def.id, v)}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          className={`checklistNoteBtn ${stepMeta[item.id]?.note || noteOpenId === item.id ? 'checklistNoteBtnActive' : ''}`}
                          disabled={!profileComplete}
                          onClick={() => openNote(item.id)}
                          title="Action note"
                          aria-label="Action note"
                        >
                          <IconNoteSmall />
                        </button>
                      </div>
                    </div>

                    {noteOpenId === item.id ? (
                      <div className="checklistItemNotePanel">
                        <textarea
                          className="input textarea checklistNoteInput"
                          value={draftNote}
                          onChange={(e) => setDraftNote(e.target.value)}
                          placeholder="Note for this action…"
                          rows={2}
                        />
                        <div className="checklistItemNoteActions">
                          <button type="button" className="buttonGhost" onClick={() => setNoteOpenId(null)}>
                            Cancel
                          </button>
                          <button type="button" className="buttonPrimary" onClick={() => saveNote(item.id)}>
                            Save
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
