import { useAppMenu } from '../context/AppMenuContext'

export function OpenProfileLink() {
  const { openPanel } = useAppMenu()

  return (
    <button type="button" className="textLinkButton" onClick={() => openPanel('profile')}>
      Open profile
    </button>
  )
}
