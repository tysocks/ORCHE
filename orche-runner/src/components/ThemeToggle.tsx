import { useTheme } from '../context/ThemeContext'
import type { Theme } from '../lib/theme'

type Props = {
  className?: string
}

export function ThemeToggle({ className }: Props) {
  const { theme, setTheme } = useTheme()

  function select(next: Theme) {
    if (next !== theme) setTheme(next)
  }

  return (
    <div
      className={`themeToggle ${className ?? ''}`.trim()}
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        className={`themeToggleBtn ${theme === 'light' ? 'themeToggleBtnActive' : ''}`}
        aria-pressed={theme === 'light'}
        onClick={() => select('light')}
      >
        Light
      </button>
      <button
        type="button"
        className={`themeToggleBtn ${theme === 'dark' ? 'themeToggleBtnActive' : ''}`}
        aria-pressed={theme === 'dark'}
        onClick={() => select('dark')}
      >
        Dark
      </button>
    </div>
  )
}
