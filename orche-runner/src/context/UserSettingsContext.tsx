import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  isUserSettingsComplete,
  loadUserSettings,
  saveUserSettings,
  type UserSettings,
} from '../lib/userSettings'

type UserSettingsContextValue = {
  settings: UserSettings
  isComplete: boolean
  updateSettings: (patch: Partial<UserSettings>) => void
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null)

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(() => loadUserSettings())

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveUserSettings(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      settings,
      isComplete: isUserSettingsComplete(settings),
      updateSettings,
    }),
    [settings, updateSettings],
  )

  return (
    <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>
  )
}

export function useUserSettings(): UserSettingsContextValue {
  const ctx = useContext(UserSettingsContext)
  if (!ctx) throw new Error('useUserSettings must be used within UserSettingsProvider')
  return ctx
}
