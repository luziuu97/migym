import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

function GymRow({ gym, users, onChanged }) {
  const toast = useUI(s => s.toast)
  const [ownerId, setOwnerId] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(gym.name)
  const owners = gym.owners || []
  return <div style={{ padding: '10px 2px', borderBottom: '1px solid var(--sep)' }}>
    <div>
      {renaming ? <input className="input" value={name} onChange={e => setName(e.target.value)} style={{ maxWidth: 220 }} />
        : <div className="small" style={{ fontWeight: 600 }}>{gym.name}</div>}
      <div className="dim" style={{ fontSize: '.72rem', marginTop: 4 }}>{t('Join code')}: <span style={{ fontFamily: 'ui-monospace,monospace', letterSpacing: '.08em' }}
        onClick={() => { navigator.clipboard?.writeText(gym.joinCode).catch(() => {}); toast(t('Copied {0}', gym.joinCode)) }}>{gym.joinCode}</span></div>
      <div className="dim" style={{ fontSize: '.72rem', marginTop: 2 }}>{t('Owners')}: {owners.length ? owners.map(o => o.name).join(', ') : t('none — first signup becomes owner')}</div>
    </div>
    <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {renaming ? <Button size="sm" variant="primary" onClick={() => {
        const n = name.trim(); if (!n) return
        api('/api/admin/gyms/rename', { method: 'POST', body: JSON.stringify({ id: gym.id, name: n }) })
          .then(() => { toast(t('Gym updated')); setRenaming(false); onChanged() }).catch(e => toast(e.message))
      }}>{t('Save')}</Button> : <Button size="sm" onClick={() => setRenaming(true)}>{t('Rename')}</Button>}
      <select className="input" style={{ width: 'auto', minWidth: 160 }} value={ownerId} onChange={e => setOwnerId(e.target.value)}>
        <option value="">{t('Set gym owner')}…</option>
        {(users || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <Button size="sm" variant="tinted" disabled={!ownerId} onClick={() => {
        api('/api/admin/gyms/owner', { method: 'POST', body: JSON.stringify({ gymId: gym.id, userId: ownerId }) })
          .then(() => { toast(t('Owner set')); setOwnerId(''); onChanged() }).catch(e => toast(e.message))
      }}>{t('Assign')}</Button>
    </div>
  </div>
}

export default function Admin() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const [users, setUsers] = useState(null)
  const [gyms, setGyms] = useState(null)
  const [newGym, setNewGym] = useState('')

  const loadUsers = () => api('/api/admin/users').then(d => { setUsers(d.users) }).catch(e => toast(e.message || t('Failed to load')))
  const loadGyms = () => api('/api/admin/gyms').then(d => setGyms(d.gyms)).catch(() => {})

  useEffect(() => {
    if (!user?.admin) return
    loadUsers(); loadGyms()
  }, [])

  if (!user?.admin) return null

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8 }}><h1 style={{ margin: 0 }}>{t('Platform')}</h1>
        <div className="sub">{gyms ? t('{0} gyms', gyms.length) : t('Loading…')}</div></div>
      <button className="iconbtn" onClick={() => { loadUsers(); loadGyms() }} aria-label={t('refresh')}>↻</button>
    </div>

    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ margin: 0 }}>{t('Gyms')}</h2>
      <div className="dim small" style={{ margin: '6px 0 10px' }}>{t('First person to register with a gym\'s code becomes its owner.')}</div>
      {(gyms || []).map(g => <GymRow key={g.id} gym={g} users={users} onChanged={() => { loadGyms(); loadUsers() }} />)}
      <div style={{ height: 10 }} />
      <input className="input" placeholder={t('Gym name')} maxLength={60} value={newGym} onChange={e => setNewGym(e.target.value)} />
      <div style={{ height: 8 }} />
      <Button variant="primary" size="sm" onClick={() => {
        const n = newGym.trim(); if (!n) { toast(t('Enter a name')); return }
        api('/api/admin/gyms', { method: 'POST', body: JSON.stringify({ name: n }) })
          .then(({ gym }) => { toast(t('Gym created — join code copied')); setNewGym(''); loadGyms(); navigator.clipboard?.writeText(gym.joinCode).catch(() => {}) })
          .catch(e => toast(e.message))
      }}>{t('Create gym')}</Button>
    </div>
  </div>
}
