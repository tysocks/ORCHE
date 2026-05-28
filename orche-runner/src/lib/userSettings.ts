export type UserSettings = {
  operatorName: string
}

const STORAGE_KEY = 'orche-user-settings'

export function loadUserSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { operatorName: '' }
    const parsed = JSON.parse(raw) as Partial<UserSettings>
    return {
      operatorName: String(parsed.operatorName ?? '').trim(),
    }
  } catch {
    return { operatorName: '' }
  }
}

export function saveUserSettings(settings: UserSettings): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      operatorName: settings.operatorName.trim(),
    }),
  )
}

export function isUserSettingsComplete(settings: UserSettings): boolean {
  return settings.operatorName.length > 0
}
