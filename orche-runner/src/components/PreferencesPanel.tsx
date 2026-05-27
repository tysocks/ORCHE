import { ThemeToggle } from './ThemeToggle'

export function PreferencesPanel() {
  return (
    <div className="preferencesPanel">
      <section className="prefSection">
        <h3 className="prefSectionTitle">Appearance</h3>
        <p className="panelHint muted">Choose light or dark mode for the runner interface.</p>
        <ThemeToggle className="prefThemeToggle" />
      </section>
    </div>
  )
}
