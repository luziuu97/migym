import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { fmtDate, fmtVol, fmtDur } from '../lib/format.js'
import { workoutVolume, setsDone } from '../lib/history.js'
import { confirmSheet } from '../sheets.jsx'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

export const rel = ts => {
  if (!ts) return t('never')
  const s = Math.max(0, (Date.now() - ts) / 1000)
  if (s < 60) return t('just now')
  if (s < 3600) return t('{0}m ago', Math.floor(s / 60))
  if (s < 86400) return t('{0}h ago', Math.floor(s / 3600))
  return t('{0}d ago', Math.floor(s / 86400))
}

export const dur = ms => {
  const m = Math.max(0, Math.floor(ms / 60000))
  return m < 60 ? m + 'm' : Math.floor(m / 60) + 'h' + (m % 60) + 'm'
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

export function UserDetail({ id, onChanged, close, canBill, canRole }) {
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
    {canRole && u.role !== 'owner' && <div style={{ margin: '8px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button size="sm" onClick={() => api('/api/admin/user/role', { method: 'POST', body: JSON.stringify({ id: u.id, role: u.role === 'trainer' ? 'member' : 'trainer' }) }).then(() => { toast(t('Role updated')); onChanged(); api('/api/admin/user?id=' + encodeURIComponent(u.id)).then(setD) }).catch(e => toast(e.message))}>
        {u.role === 'trainer' ? t('Make member') : t('Make trainer')}
      </Button>
    </div>}
    <div style={{ margin: '8px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button size="sm" icon="clipboard" onClick={() => { close(); nav('/gym/plan/' + u.id) }}>{t('Set routines')}</Button>
    </div>
    {u.role === 'member' && canBill && <MembershipEditor user={u} onChanged={() => { onChanged(); api('/api/admin/user?id=' + encodeURIComponent(u.id)).then(setD) }} />}
    {canBill && !u.admin && <button className={'btn ' + (u.disabled ? 'primary' : 'danger')} style={{ margin: '12px 0 4px' }}
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

export function InvitesCard({ invites, reload }) {
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
