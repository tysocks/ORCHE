import { SHIFT_OPTIONS } from '../lib/userSettings'
import { useUserSettings } from '../context/UserSettingsContext'

export function ProfilePanel() {
  const { settings, isComplete, updateSettings } = useUserSettings()

  return (
    <div className="profilePanel">
      <p className="panelHint muted">
        Your name and shift apply to all work orders on this device.
      </p>

      {!isComplete ? (
        <div className="panelNotice">Complete your profile before running operations.</div>
      ) : (
        <div className="panelNotice panelNoticeOk">Profile ready</div>
      )}

      <div className="panelFields">
        <label className="field">
          <div className="fieldLabel">Operator name</div>
          <input
            className="input"
            value={settings.operatorName}
            onChange={(e) => updateSettings({ operatorName: e.target.value })}
            placeholder="Your name"
            autoComplete="name"
          />
        </label>

        <label className="field">
          <div className="fieldLabel">Shift</div>
          <select
            className="input"
            value={settings.workShift}
            onChange={(e) => updateSettings({ workShift: e.target.value })}
          >
            <option value="">Select shift…</option>
            {SHIFT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
