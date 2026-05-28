import { useUserSettings } from '../context/UserSettingsContext'

export function ProfilePanel() {
  const { settings, isComplete, updateSettings } = useUserSettings()

  return (
    <div className="profilePanel">
      <p className="panelHint muted">
        Your operator name applies to all work orders on this device.
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

      </div>
    </div>
  )
}
