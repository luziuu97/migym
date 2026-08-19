import { t } from '../lib/i18n.js'
import { displayTitle } from '../lib/instance.js'
import { useStore } from '../store/useStore.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

export default function MembershipLock() {
  const user = useStore(s => s.user)
  const config = useStore(s => s.config)
  const signOut = useStore(s => s.signOut)
  const m = user && user.membership
  return (
    <div className="narrow" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '78vh', textAlign: 'center' }}>
      <div style={{ fontSize: 54, display: 'flex', justifyContent: 'center', color: 'var(--acc)' }}><Icon name="lock" /></div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '10px 0 8px' }}>{displayTitle({ user, config })}</h1>
      <p className="muted" style={{ marginBottom: 8 }}>{t('Your membership has expired — talk to the gym.')}</p>
      {m && m.plan && <p className="dim small">{t('Plan')}: {t(m.plan)}{m.expiresOn ? ' · ' + t('expires {0}', m.expiresOn) : ''}{m.sessionsLeft != null ? ' · ' + t('{0} sessions left', m.sessionsLeft) : ''}</p>}
      <div style={{ height: 18 }} />
      <Button variant="primary" onClick={() => signOut()}>{t('Sign out')}</Button>
    </div>
  )
}
