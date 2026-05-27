export type UserSettings = {
  operatorName: string
  workShift: string
}

const STORAGE_KEY = 'orche-user-settings'

const SHIFT_OPTIONS = ['Day', 'Evening', 'Night'] as const
export type WorkShift = (typeof SHIFT_OPTIONS)[number]

export { SHIFT_OPTIONS }

export function loadUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { operatorName: '', workShift: '' }
    const parsed = JSON.parse(raw) as Partial<UserSettings>
    return {
      operatorName: String(parsed.operatorName ?? '').trim(),
      workShift: String(parsed.workShift ?? '').trim(),
    }
  } catch {
    return { operatorName: '', workShift: '' }
  }
}

export function saveUserSettings(settings: UserSettings): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      operatorName: settings.operatorName.trim(),
      workShift: settings.workShift.trim(),
    }),
  )
}

export function isUserSettingsComplete(settings: UserSettings): boolean {
  return (
    settings.operatorName.length > 0 &&
    SHIFT_OPTIONS.includes(settings.workShift as WorkShift)
  )
}
