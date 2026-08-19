import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { fmtDate, fmtVol, fmtDur } from '../lib/format.js'
import { workoutVolume, setsDone } from '../lib/history.js'
import { confirmSheet } from '../sheets.jsx'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

// Admin-only operator dashboard (owner passkey + admin flag; guarded again server-side).

const rel = ts => {
  if (!ts) return t('never')
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return t('just now')
  if (s < 3600) return t('{0}m ago', Math.floor(s / 60))
  if (s < 86400) return t('{0}h ago', Math.floor(s / 3600))
  return t('{0}d ago', Math.floor(s / 86400))
}
const dur = ms => { const m = Math.max(0, Math.floor(ms / 60000)); return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h' + (m % 60) + 'm' }

function UserDetail({ id, onChanged, close, canBill, canRole, isSuper }) {
  const nav = useNavigate()
  const [d, setD] = useState(null)
  const toast = useUI(s => s.toast)
  useEffect(() => { api('/api/admin/user?id=' + encodeURIComponent(id)).then(setD).catch(e => toast(e.message)) }, [id])
  if (!d) return <div className="muted small">{t('Loading…')}</div>
  const u = d.user
  const setDisabled = disabled => {
    api('/api/admin/user/disable', { method: 'POST', body: JSON.stringify({ id: u.id, disabled }) })
      .then(() => { toast(disabled ? t('User disabled') : t('User enabled')); onChanged(); close() })
      .catch(e => toast(e.message))
  }
  return <>
    <h3 className="capitalize">{u.name}</h3>
    <div className="row" style={{ gap: 6, flexWrap: 'wrap', margin: '8px 0 12px' }}>
      {u.role && u.role !== 'member' && <span className="tag acc">{t(u.role)}</span>}
      {u.admin && <span className="tag acc">{t('admin')}</span>}
      {u.membership && u.membership.status !== 'active' && u.role === 'member' && <span className="tag" style={{ color: 'var(--red)' }}>{t('past due')}</span>}
      {u.disabled && <span className="tag" style={{ color: 'var(--red)' }}>{t('disabled')}</span>}
      {u.invitedBy && <span className="tag">{t('invite {0}', u.invitedBy)}</span>}
      <span className="tag">{t('joined {0}', u.created ? fmtDate(u.created.slice(0, 10)) : '—')}</span>
    </div>
    <div className="tiles" style={{ textAlign: 'left' }}>
      <div className="tile"><div className="l">{t('Workouts')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{d.workouts.length}</div></div>
      <div className="tile"><div className="l">{t('Weigh-ins')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{d.bodyweight.length}</div></div>
      <div className="tile"><div className="l">{t('Routines')}</div><div className="v" style={{ fontSize: '1.1rem' }}>{d.routines.length}</div></div>
      <div className="tile"><div className="l">{t('Last sync')}</div><div className="v" style={{ fontSize: '.95rem' }}>{rel(d.lastSync)}</div></div>
    </div>
    {canRole && <div style={{ margin: '8px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {u.role !== 'owner' && <Button size="sm" onClick={() => api('/api/admin/user/role', { method: 'POST', body: JSON.stringify({ id: u.id, role: u.role === 'trainer' ? 'member' : 'trainer' }) }).then(() => { toast(t('Role updated')); onChanged(); api('/api/admin/user?id=' + encodeURIComponent(u.id)).then(setD) }).catch(e => toast(e.message))}>
        {u.role === 'trainer' ? t('Make member') : t('Make trainer')}
      </Button>}
      {isSuper && u.role !== 'owner' && <Button size="sm" variant="tinted" onClick={() => api('/api/admin/user/role', { method: 'POST', body: JSON.stringify({ id: u.id, role: 'owner' }) }).then(() => { toast(t('Role updated')); onChanged(); api('/api/admin/user?id=' + encodeURIComponent(u.id)).then(setD) }).catch(e => toast(e.message))}>{t('Make gym owner')}</Button>}
    </div>}
    <div style={{ margin: '8px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button size="sm" icon="clipboard" onClick={() => { close(); nav('/admin/plan/' + u.id) }}>{t('Set routines')}</Button>
    </div>
    {u.role === 'member' && canBill && <MembershipEditor user={u} onChanged={() => { onChanged(); api('/api/admin/user?id=' + encodeURIComponent(u.id)).then(setD) }} />}
    {!u.admin && <button className={'btn ' + (u.disabled ? 'primary' : 'danger')} style={{ margin: '12px 0 4px' }}
      onClick={() => u.disabled ? setDisabled(false)
        : confirmSheet({ title: t('Disable {0}?', u.name), message: t('They are signed out everywhere and can no longer sync or log in until re-enabled.'), confirmText: t('Disable'), danger: true, onConfirm: () => setDisabled(true) })}>
      {u.disabled ? t('Enable account') : t('Disable account')}</button>}
    <h4 className="sec">{t('Workout history')}</h4>
    {d.workouts.length ? <div className="list" style={{ gap: 0 }}>
      {d.workouts.slice(0, 60).map(w => <div key={w.id} className="row between" style={{ padding: '9px 2px', borderBottom: '1px solid var(--sep)' }}>
        <div><div className="small" style={{ fontWeight: 600 }}>{w.name}</div>
          <div className="dim" style={{ fontSize: '.72rem' }}>{fmtDate(w.d, true)} · {fmtDur((w.end || w.start) - w.start)} · {t('{0} sets', setsDone(w))}{w.prs?.length ? ' · ' + t('{0} PR', w.prs.length) : ''}</div></div>
        <span className="small muted">{fmtVol(w.vol ?? workoutVolume(w), d.unit)}</span>
      </div>)}
    </div> : <div className="empty small">{t('No workouts logged.')}</div>}
  </>
}

function MembershipEditor({ user, onChanged }) {
  const toast = useUI(s => s.toast)
  const [plan, setPlan] = useState((user.membership && user.membership.plan) || 'monthly')
  const save = () => {
    api('/api/admin/user/membership', { method: 'POST', body: JSON.stringify({ id: user.id, plan, markPaid: true }) })
      .then(() => { toast(t('Membership updated')); onChanged() })
      .catch(e => toast(e.message))
  }
  const m = user.membership
  return <div className="card" style={{ margin: '10px 0 12px', textAlign: 'left' }}>
    <h4 className="sec" style={{ marginTop: 0 }}>{t('Membership')}</h4>
    <div className="dim small" style={{ marginBottom: 8 }}>
      {m && m.plan ? t(m.plan) : t('none')}
      {m && m.expiresOn ? ' · ' + t('expires {0}', m.expiresOn) : ''}
      {m && m.sessionsLeft != null ? ' · ' + t('{0} sessions left', m.sessionsLeft) : ''}
      {m && m.status ? ' · ' + t(m.status) : ''}
    </div>
    <select className="input" value={plan} onChange={e => setPlan(e.target.value)}>
      <option value="monthly">{t('monthly')}</option>
      <option value="pack">{t('pack')}</option>
      <option value="drop_in">{t('drop_in')}</option>
    </select>
    <div style={{ height: 8 }} />
    <Button variant="primary" size="sm" onClick={save}>{t('Mark paid')}</Button>
  </div>
}

function InvitesCard({ invites, reload }) {
  const toast = useUI(s => s.toast)
  const gen = () => api('/api/admin/invites/new', { method: 'POST', body: '{}' })
    .then(({ invite }) => { navigator.clipboard?.writeText(invite.code).catch(() => {}); toast(t('Code {0} created & copied', invite.code)); reload() })
    .catch(e => toast(e.message))
  const revoke = code => api('/api/admin/invites/revoke', { method: 'POST', body: JSON.stringify({ code }) })
    .then(() => { toast(t('Code revoked')); reload() }).catch(e => toast(e.message))
  const open = (invites || []).filter(i => !i.usedBy)
  const used = (invites || []).filter(i => i.usedBy)
  return <div className="card">
    <div className="row between"><h2 style={{ margin: 0 }}>{t('Invite codes')}</h2>
      <Button variant="primary" size="sm" onClick={gen} icon="plus">{t('Generate')}</Button></div>
    <div className="small muted" style={{ margin: '6px 0 10px' }}>{t('{0} unused · {1} redeemed', open.length, used.length)}</div>
    {open.map(i => <div key={i.code} className="row between" style={{ padding: '7px 2px', borderBottom: '1px solid var(--sep)' }}>
      <span style={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontWeight: 500, letterSpacing: '.06em' }}
        onClick={() => { navigator.clipboard?.writeText(i.code).catch(() => {}); toast(t('Copied {0}', i.code)) }}>{i.code}</span>
      <button className="iconbtn" style={{ width: 32, height: 30, borderRadius: 8, fontSize: 15, color: 'var(--red)' }} onClick={() => revoke(i.code)} aria-label={t('revoke')}><Icon name="trash" /></button>
    </div>)}
    {used.map(i => <div key={i.code} className="row between dim" style={{ padding: '7px 2px', fontSize: '.8rem' }}>
      <span style={{ fontFamily: 'monospace' }}>{i.code}</span><span>→ {i.usedByName || t('used')}</span>
    </div>)}
    {!open.length && !used.length && <div className="dim small">{t('No codes yet — generate one to invite someone.')}</div>}
  </div>
}

function GymRow({ gym, users, isSuper, onChanged }) {
  const toast = useUI(s => s.toast)
  const [ownerId, setOwnerId] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(gym.name)
  const owners = gym.owners || []
  return <div style={{ padding: '10px 2px', borderBottom: '1px solid var(--sep)' }}>
    <div className="row between">
      <div>
        {renaming && isSuper ? <input className="input" value={name} onChange={e => setName(e.target.value)} style={{ maxWidth: 220 }} />
          : <div className="small" style={{ fontWeight: 600 }}>{gym.name}</div>}
        <div className="dim" style={{ fontSize: '.72rem', marginTop: 4 }}>{t('Join code')}: <span style={{ fontFamily: 'ui-monospace,monospace', letterSpacing: '.08em' }}
          onClick={() => { navigator.clipboard?.writeText(gym.joinCode).catch(() => {}); toast(t('Copied {0}', gym.joinCode)) }}>{gym.joinCode}</span></div>
        <div className="dim" style={{ fontSize: '.72rem', marginTop: 2 }}>{t('Owners')}: {owners.length ? owners.map(o => o.name).join(', ') : t('none')}</div>
      </div>
    </div>
    {isSuper && <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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
    </div>}
  </div>
}

export default function Admin() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const toast = useUI(s => s.toast)
  const canBill = !!(user?.admin || user?.role === 'owner')
  const canRole = canBill
  const isSuper = !!user?.admin
  const myPlan = useStore(s => s.S)
  const openSheet = useUI(s => s.openSheet)
  const [users, setUsers] = useState(null)
  const [invites, setInvites] = useState(null)
  const [gyms, setGyms] = useState(null)
  const [newGym, setNewGym] = useState('')

  const loadUsers = () => api('/api/admin/users').then(d => { setUsers(d.users) }).catch(e => toast(e.message || t('Failed to load')))
  const loadInvites = () => api('/api/admin/invites').then(d => setInvites(d.invites)).catch(() => {})
  const loadGyms = () => api('/api/admin/gyms').then(d => setGyms(d.gyms)).catch(() => {})
  // poll every 15s so the "training now" section stays live without a manual refresh
  const [adherence, setAdherence] = useState(null)
  const loadAdherence = () => api('/api/admin/adherence').then(setAdherence).catch(() => {})
  useEffect(() => {
    if (!user?.admin && user?.role !== 'owner' && user?.role !== 'trainer') return
    loadUsers(); loadInvites(); loadGyms(); loadAdherence()
    const iv = setInterval(loadUsers, 15000)
    return () => clearInterval(iv)
  }, [])
  if (!user?.admin && user?.role !== 'owner' && user?.role !== 'trainer') return null

  const openUser = id => openSheet(close => <UserDetail id={id} onChanged={loadUsers} close={close} canBill={canBill} canRole={canRole} isSuper={isSuper} />)
  const applyMyPlan = (id, ev) => {
    ev.stopPropagation()
    api('/api/trainer/plan', { method: 'PUT', body: JSON.stringify({ id, routines: myPlan.routines || [], week: myPlan.week || {}, customEx: myPlan.customEx || [] }) })
      .then(() => toast(t('Plan saved')))
      .catch(e => toast(e.message))
  }
  const liveUsers = (users || []).filter(u => u.live)
  const activeCount = (users || []).filter(u => u.lastSync && Date.now() - u.lastSync < 7 * 86400000).length
  const disabledCount = (users || []).filter(u => u.disabled).length

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/settings')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 8 }}><h1 style={{ margin: 0 }}>{t('Admin')}</h1>
        <div className="sub">{users ? t('{0} users · {1} active this week', users.length, activeCount) : t('Loading…')}</div></div>
      <button className="iconbtn" onClick={() => { loadUsers(); loadInvites(); loadGyms(); loadAdherence() }} aria-label={t('refresh')}>↻</button>
    </div>

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

    {gyms && <div className="card" style={{ marginBottom: 16 }}>
      <div className="row between"><h2 style={{ margin: 0 }}>{t('Gyms')}</h2></div>
      {gyms.map(g => <GymRow key={g.id} gym={g} users={users} isSuper={isSuper} onChanged={() => { loadGyms(); loadUsers() }} />)}
      {isSuper && <>
        <div style={{ height: 10 }} />
        <input className="input" placeholder={t('Gym name')} maxLength={60} value={newGym} onChange={e => setNewGym(e.target.value)} />
        <div style={{ height: 8 }} />
        <Button variant="primary" size="sm" onClick={() => {
          const n = newGym.trim(); if (!n) { toast(t('Enter a name')); return }
          api('/api/admin/gyms', { method: 'POST', body: JSON.stringify({ name: n }) })
            .then(({ gym }) => { toast(t('Gym created')); setNewGym(''); loadGyms(); navigator.clipboard?.writeText(gym.joinCode).catch(() => {}) })
            .catch(e => toast(e.message))
        }}>{t('Create gym')}</Button>
      </>}
    </div>}

    <InvitesCard invites={invites} reload={loadInvites} />

    <h4 className="sec">{t('Users')}</h4>
    <div className="list">
      {(users || []).map(u => <div key={u.id} className="item" onClick={() => openUser(u.id)} style={u.disabled ? { opacity: .55 } : null}>
        <div className="grow"><div className="tt">{u.live && <Icon name="dot" style={{ fontSize: 9, color: 'var(--green)', display: 'inline-block', marginRight: 5 }} />}{u.name} {u.role && u.role !== 'member' && <span className="tag acc" style={{ marginLeft: 4 }}>{t(u.role)}</span>}{u.admin && <span className="tag acc" style={{ marginLeft: 4 }}>{t('admin')}</span>}{u.role === 'member' && u.membership && u.membership.status !== 'active' && <span className="tag" style={{ marginLeft: 4, color: 'var(--red)' }}>{t('past due')}</span>}{u.disabled && <span className="tag" style={{ marginLeft: 4, color: 'var(--red)' }}>{t('off')}</span>}</div>
          <div className="ss">{u.live ? t('training now · {0}', u.live.name) : t('{0} workouts', u.workouts) + (u.lastWorkout ? t(' · last {0}', fmtDate(u.lastWorkout)) : '') + t(' · synced {0}', rel(u.lastSync))}</div></div>
        <button className="iconbtn" title={t('Set routines')} onClick={e => { e.stopPropagation(); nav('/admin/plan/' + u.id) }}><Icon name="clipboard" /></button>
        <button className="iconbtn" title={t('Copy my plan to this member')} onClick={e => applyMyPlan(u.id, e)}><Icon name="sparkles" /></button>
        {u.hasPush && <Icon name="bell" title={t('push enabled')} style={{ fontSize: 15, color: 'var(--label-3)' }} />}<Icon name="chevronRight" className="chev" />
      </div>)}
      {users && !users.length && <div className="empty">{t('No users yet.')}</div>}
    </div>
  </div>
}
