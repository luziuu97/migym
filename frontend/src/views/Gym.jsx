import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { fmtDate } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { UserDetail, InvitesCard, rel, dur } from './adminShared.jsx'

export default function Gym() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const canBill = user?.role === 'owner'
  const canRole = canBill
  const myPlan = useStore(s => s.S)
  const openSheet = useUI(s => s.openSheet)
  const [users, setUsers] = useState(null)
  const [invites, setInvites] = useState(null)
  const [gym, setGym] = useState(null)
  const [adherence, setAdherence] = useState(null)

  const loadUsers = () => api('/api/admin/users').then(d => { setUsers(d.users) }).catch(e => toast(e.message || t('Failed to load')))
  const loadInvites = () => api('/api/admin/invites').then(d => setInvites(d.invites)).catch(() => {})
  const loadGym = () => api('/api/admin/gyms').then(d => setGym((d.gyms || [])[0] || null)).catch(() => {})
  const loadAdherence = () => api('/api/admin/adherence').then(setAdherence).catch(() => {})

  useEffect(() => {
    if (user?.role !== 'owner' && user?.role !== 'trainer') return
    loadUsers(); loadInvites(); loadGym(); loadAdherence()
    const iv = setInterval(loadUsers, 15000)
    return () => clearInterval(iv)
  }, [])

  if (user?.role !== 'owner' && user?.role !== 'trainer') return null

  const openUser = id => openSheet(close => <UserDetail id={id} onChanged={loadUsers} close={close} canBill={canBill} canRole={canRole} />)
  const applyMyPlan = (id, ev) => {
    ev.stopPropagation()
    api('/api/trainer/plan', { method: 'PUT', body: JSON.stringify({ id, routines: myPlan.routines || [], week: myPlan.week || {}, customEx: myPlan.customEx || [] }) })
      .then(() => toast(t('Plan saved')))
      .catch(e => toast(e.message))
  }
  const liveUsers = (users || []).filter(u => u.live)
  const activeCount = (users || []).filter(u => u.lastSync && Date.now() - u.lastSync < 7 * 86400000).length
  const disabledCount = (users || []).filter(u => u.disabled).length
  const title = (user.gym && user.gym.name) || t('Gym')

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8 }}><h1 style={{ margin: 0 }}>{title}</h1>
        <div className="sub">{users ? t('{0} users · {1} active this week', users.length, activeCount) : t('Loading…')}</div></div>
      <button className="iconbtn" onClick={() => { loadUsers(); loadInvites(); loadGym(); loadAdherence() }} aria-label={t('refresh')}>↻</button>
    </div>

    {gym && <JoinCodeCard gym={gym} onChanged={g => setGym(g)} canEdit={canBill} />}

    <div className="tiles" style={{ marginBottom: 12 }}>
      <div className="tile"><div className="l">{t('Users')}</div><div className="v">{users ? users.length : '—'}</div></div>
      <div className="tile"><div className="l">{t('Training now')}</div><div className="v" style={{ color: liveUsers.length ? 'var(--acc)' : undefined }}>{users ? liveUsers.length : '—'}</div></div>
      <div className="tile"><div className="l">{t('Active 7d')}</div><div className="v">{users ? activeCount : '—'}</div></div>
      <div className="tile"><div className="l">{t('Disabled')}</div><div className="v">{users ? disabledCount : '—'}</div></div>
    </div>

    {adherence && <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ margin: '0 0 8px' }}>{t('This week')}</h2>
      <div className="tiles" style={{ textAlign: 'left' }}>
        <div className="tile"><div className="l">{t('Trained today')}</div><div className="v">{adherence.trainedToday}/{adherence.members}</div></div>
      </div>
      <div className="list" style={{ marginTop: 8 }}>
        {adherence.rows.filter(r => r.role === 'member').map(r => <div key={r.id} className="row between" style={{ padding: '7px 2px', borderBottom: '1px solid var(--sep)' }} onClick={() => openUser(r.id)}>
          <div>
            <div className="small" style={{ fontWeight: 600 }}>{r.name} {r.live && <Icon name="dot" style={{ fontSize: 9, color: 'var(--green)' }} />}</div>
            <div className="dim" style={{ fontSize: '.72rem' }}>{t('{0}/{1} sessions this week', r.trained, r.planned)}{r.lastWorkout ? ' · ' + fmtDate(r.lastWorkout) : ''}</div>
          </div>
          {r.trainedToday ? <span className="tag acc">{t('today')}</span> : r.membership && r.membership.status !== 'active' ? <span className="tag" style={{ color: 'var(--red)' }}>{t('past due')}</span> : null}
        </div>)}
      </div>
    </div>}

    {liveUsers.length > 0 && <div className="card" style={{ borderColor: 'var(--acc)' }}>
      <h2 className="row" style={{ margin: '0 0 8px', gap: 6 }}><Icon name="dot" style={{ fontSize: 10, color: 'var(--green)' }} />{t('Training now')}</h2>
      {liveUsers.map(u => <div key={u.id} className="row between" style={{ padding: '8px 2px', borderBottom: '1px solid var(--sep)' }} onClick={() => openUser(u.id)}>
        <div><div className="small" style={{ fontWeight: 600 }}>{u.name}</div>
          <div className="dim" style={{ fontSize: '.72rem' }}>{u.live.name} · {t('ex {0}/{1} · {2}/{3} sets', u.live.exIdx, u.live.exTotal, u.live.setsDone, u.live.setsTotal)}</div></div>
        <span className="tag acc">{dur(Date.now() - u.live.startedAt)}</span>
      </div>)}
    </div>}

    <InvitesCard invites={invites} reload={loadInvites} />

    <h4 className="sec">{t('Users')}</h4>
    <div className="list">
      {(users || []).map(u => <div key={u.id} className="item" onClick={() => openUser(u.id)} style={u.disabled ? { opacity: .55 } : null}>
        <div className="grow"><div className="tt">{u.live && <Icon name="dot" style={{ fontSize: 9, color: 'var(--green)', display: 'inline-block', marginRight: 5 }} />}{u.name} {u.role && u.role !== 'member' && <span className="tag acc" style={{ marginLeft: 4 }}>{t(u.role)}</span>}{u.admin && <span className="tag acc" style={{ marginLeft: 4 }}>{t('admin')}</span>}{u.role === 'member' && u.membership && u.membership.status !== 'active' && <span className="tag" style={{ marginLeft: 4, color: 'var(--red)' }}>{t('past due')}</span>}{u.disabled && <span className="tag" style={{ marginLeft: 4, color: 'var(--red)' }}>{t('off')}</span>}</div>
          <div className="ss">{u.live ? t('training now · {0}', u.live.name) : t('{0} workouts', u.workouts) + (u.lastWorkout ? t(' · last {0}', fmtDate(u.lastWorkout)) : '') + t(' · synced {0}', rel(u.lastSync))}</div></div>
        <button className="iconbtn" title={t('Set routines')} onClick={e => { e.stopPropagation(); nav('/gym/plan/' + u.id) }}><Icon name="clipboard" /></button>
        <button className="iconbtn" title={t('Copy my plan to this member')} onClick={e => applyMyPlan(u.id, e)}><Icon name="sparkles" /></button>
        {u.hasPush && <Icon name="bell" title={t('push enabled')} style={{ fontSize: 15, color: 'var(--label-3)' }} />}<Icon name="chevronRight" className="chev" />
      </div>)}
      {users && !users.length && <div className="empty">{t('No users yet.')}</div>}
    </div>
  </div>
}

function JoinCodeCard({ gym, onChanged, canEdit }) {
  const toast = useUI(s => s.toast)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(gym.joinCode || '')
  const [busy, setBusy] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(gym.joinCode).catch(() => {}); toast(t('Copied {0}', gym.joinCode)) }
  const save = async (joinCode) => {
    setBusy(true)
    try {
      const { gym: next } = await api('/api/admin/gyms/join-code', { method: 'POST', body: JSON.stringify({ gymId: gym.id, joinCode }) })
      onChanged(next)
      setDraft(next.joinCode)
      setEditing(false)
      toast(t('Join code updated'))
    } catch (e) { toast(e.message || t('Invalid join code')) }
    finally { setBusy(false) }
  }
  return <div className="card" style={{ marginBottom: 16 }}>
    <div className="dim small">{t('Join code')}</div>
    {editing ? <>
      <input className="input" value={draft} maxLength={24} onChange={e => setDraft(e.target.value.toUpperCase())}
        placeholder={t('e.g. PALERMO')} style={{ marginTop: 8, letterSpacing: '.06em', fontWeight: 600, textAlign: 'center' }} />
      <div className="dim small" style={{ marginTop: 6 }}>{t('Letters, numbers and hyphens — 4 to 24 characters.')}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <Button variant="primary" size="sm" disabled={busy} onClick={() => save(draft)}>{t('Save code')}</Button>
        <Button size="sm" disabled={busy} onClick={() => save('')}>{t('New random code')}</Button>
        <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(gym.joinCode) }}>{t('Cancel')}</Button>
      </div>
    </> : <>
      <div style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 600, letterSpacing: '.1em', fontSize: '1.1rem', marginTop: 4 }}
        onClick={copy}>{gym.joinCode}</div>
      <div className="dim small" style={{ marginTop: 6 }}>{t('Share this code so members can create a profile.')}</div>
      {canEdit && <div style={{ marginTop: 10 }}><Button size="sm" onClick={() => { setDraft(gym.joinCode); setEditing(true) }}>{t('Change join code')}</Button></div>}
    </>}
  </div>
}
