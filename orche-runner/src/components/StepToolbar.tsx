import { useEffect, useState } from 'react'

type Props = {
  stepId: string
  done: boolean
  completedBy?: string
  note: string
  canComplete: boolean
  actionsEnabled: boolean
  onToggleComplete: () => void
  onSaveNote: (note: string) => void
  onNextStep: () => void
}

function IconCheck() {
  return (
    <svg className="stepToolIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconNote() {
  return (
    <svg className="stepToolIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconDown() {
  return (
    <svg className="stepToolIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M12 5v14M6 12l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function StepToolbar({
  done,
  completedBy,
  note,
  canComplete,
  actionsEnabled,
  onToggleComplete,
  onSaveNote,
  onNextStep,
}: Props) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [draftNote, setDraftNote] = useState(note)

  useEffect(() => {
    if (!noteOpen) setDraftNote(note)
  }, [note, noteOpen])

  function openNote() {
    setDraftNote(note)
    setNoteOpen((v) => !v)
  }

  function saveNote() {
    onSaveNote(draftNote)
    setNoteOpen(false)
  }

  const completeTitle = done
    ? `Completed by ${completedBy ?? 'operator'} — click to mark incomplete`
    : 'Complete step'

  return (
    <div className="stepToolbarWrap">
      <div className="stepToolbar">
        <button
          type="button"
          className={`stepToolBtn stepToolComplete ${done ? 'stepToolCompleteDone' : 'stepToolSquare'}`}
          disabled={!actionsEnabled || (!done && !canComplete)}
          onClick={onToggleComplete}
          title={completeTitle}
          aria-label={completeTitle}
        >
          <IconCheck />
          {done ? (
            <span className="stepToolCompleteName">{completedBy ?? 'Done'}</span>
          ) : null}
        </button>

        <button
          type="button"
          className={`stepToolBtn stepToolSquare stepToolNote ${noteOpen || note ? 'stepToolNoteActive' : ''}`}
          disabled={!actionsEnabled}
          onClick={openNote}
          title="Step note"
          aria-label="Step note"
        >
          <IconNote />
        </button>

        <button
          type="button"
          className="stepToolBtn stepToolSquare stepToolNext"
          disabled={!actionsEnabled}
          onClick={onNextStep}
          title="Next incomplete step"
          aria-label="Next incomplete step"
        >
          <IconDown />
        </button>
      </div>

      {noteOpen ? (
        <div className="stepNotePanel">
          <textarea
            className="input textarea stepNoteInput"
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            placeholder="Add a note for this step…"
            rows={3}
          />
          <div className="stepNoteActions">
            <button type="button" className="buttonGhost" onClick={() => setNoteOpen(false)}>
              Cancel
            </button>
            <button type="button" className="buttonPrimary" onClick={saveNote}>
              Save note
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
