import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { PreferencesPanel } from '../components/PreferencesPanel'
import { ProfilePanel } from '../components/ProfilePanel'

export type AppMenuPanel = 'profile' | 'preferences'

type AppMenuContextValue = {
  menuOpen: boolean
  activePanel: AppMenuPanel | null
  toggleMenu: () => void
  closeMenu: () => void
  openPanel: (panel: AppMenuPanel) => void
  closePanel: () => void
}

const AppMenuContext = createContext<AppMenuContextValue | null>(null)

export function AppMenuProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<AppMenuPanel | null>(null)

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const closePanel = useCallback(() => setActivePanel(null), [])

  const toggleMenu = useCallback(() => {
    setMenuOpen((open) => !open)
  }, [])

  const openPanel = useCallback((panel: AppMenuPanel) => {
    setMenuOpen(false)
    setActivePanel(panel)
  }, [])

  const value = useMemo(
    () => ({
      menuOpen,
      activePanel,
      toggleMenu,
      closeMenu,
      openPanel,
      closePanel,
    }),
    [menuOpen, activePanel, toggleMenu, closeMenu, openPanel, closePanel],
  )

  return (
    <AppMenuContext.Provider value={value}>
      {children}
      {menuOpen ? (
        <button
          type="button"
          className="appMenuScrim"
          aria-label="Close menu"
          onClick={closeMenu}
        />
      ) : null}
      {menuOpen ? (
        <div className="appMenuDropdown" role="menu">
          <button
            type="button"
            className="appMenuDropdownItem"
            role="menuitem"
            onClick={() => openPanel('profile')}
          >
            Profile
          </button>
          <button
            type="button"
            className="appMenuDropdownItem"
            role="menuitem"
            onClick={() => openPanel('preferences')}
          >
            Preferences
          </button>
        </div>
      ) : null}
      {activePanel ? (
        <>
          <button
            type="button"
            className="appPanelScrim"
            aria-label="Close panel"
            onClick={closePanel}
          />
          <aside className="appSidePanel" role="dialog" aria-labelledby="appSidePanelTitle">
            <header className="appSidePanelHead">
              <h2 id="appSidePanelTitle" className="appSidePanelTitle">
                {activePanel === 'profile' ? 'Profile' : 'Preferences'}
              </h2>
              <button type="button" className="iconBtn" onClick={closePanel} aria-label="Close">
                ×
              </button>
            </header>
            <div className="appSidePanelBody">
              {activePanel === 'profile' ? <ProfilePanel /> : <PreferencesPanel />}
            </div>
          </aside>
        </>
      ) : null}
    </AppMenuContext.Provider>
  )
}

export function useAppMenu(): AppMenuContextValue {
  const ctx = useContext(AppMenuContext)
  if (!ctx) throw new Error('useAppMenu must be used within AppMenuProvider')
  return ctx
}
