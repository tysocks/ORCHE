import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppMenuProvider } from './context/AppMenuContext.tsx'
import { ThemeProvider } from './context/ThemeContext.tsx'
import { UserSettingsProvider } from './context/UserSettingsContext.tsx'
import { applyTheme, loadTheme } from './lib/theme'

applyTheme(loadTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <UserSettingsProvider>
        <AppMenuProvider>
          <App />
        </AppMenuProvider>
      </UserSettingsProvider>
    </ThemeProvider>
  </StrictMode>,
)
