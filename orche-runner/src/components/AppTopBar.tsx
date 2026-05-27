import type { ReactNode } from 'react'
import { useAppMenu } from '../context/AppMenuContext'
import { useUserSettings } from '../context/UserSettingsContext'
import { IconHome } from './IconHome'
import { IconMenu } from './IconMenu'

type Props = {
  onHome?: () => void
  leading?: ReactNode
  center?: ReactNode
  trailing?: ReactNode
  className?: string
}

export function AppTopBar({ onHome, leading, center, trailing, className }: Props) {
  const { menuOpen, toggleMenu } = useAppMenu()
  const { isComplete } = useUserSettings()

  return (
    <header className={`appTopBar ${className ?? ''}`.trim()}>
      <div className="appTopBarLeft">
        <button
          type="button"
          className={`iconBtn appMenuBtn ${menuOpen ? 'appMenuBtnOpen' : ''}`}
          onClick={toggleMenu}
          aria-label="Open menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <IconMenu />
          {!isComplete ? <span className="appMenuBtnDot" aria-hidden /> : null}
        </button>
        {onHome ? (
          <button
            type="button"
            className="iconBtn"
            onClick={onHome}
            title="Home"
            aria-label="Home"
          >
            <IconHome />
          </button>
        ) : null}
        {leading ? <div className="appTopBarLeading">{leading}</div> : null}
      </div>
      {center ? <div className="appTopBarCenter">{center}</div> : null}
      {trailing ? <div className="appTopBarRight">{trailing}</div> : null}
    </header>
  )
}
