import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { webauthnOK, passkeyLogin, registerAccount, loginAccount, BIO, api } from '../lib/api.js'
import { hasData } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { DEMO } from '../lib/demo.js'
import { guestAllowed } from '../lib/guest.js'
import { instanceAppName, SOURCE_REPO } from '../lib/instance.js'
import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'

export function RegisterSheet({ close }) {
  const { setUser, pushState, pullState, loadConfig } = useStore()
  const config = useStore(s => s.config)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [code, setCode] = useState('')
  const [gymHint, setGymHint] = useState('')
  const [busy, setBusy] = useState(false)
  const joinRequired = config?.join_required !== false
  const ref = useRef(null)
  const prefilled = useRef('')
  useEffect(() => { setTimeout(() => ref.current?.focus(), 250) }, [])
  useEffect(() => { loadConfig() }, [loadConfig])
  const lookup = async (raw) => {
    const c = String(raw || '').trim()
    if (c.length < 4) { setGymHint(''); return }
    try {
      const d = await api('/api/register/lookup', { method: 'POST', body: JSON.stringify({ code: c }) })
      setGymHint(d.gymName || '')
      if (d.kind === 'claim' && d.name) {
        setName(n => (!n.trim() || n === prefilled.current) ? d.name : n)
        prefilled.current = d.name
      }
    } catch (e) {
      setGymHint('')
      useUI.getState().toast(e.message || t('A gym code is required'))
    }
  }
  const go = async () => {
    const n = name.trim()
    if (!n) { useUI.getState().toast(t('Enter a name')); return }
    if (!email.trim()) { useUI.getState().toast(t('Enter an email')); return }
    if (password.length < 8) { useUI.getState().toast(t('Password must be at least 8 characters')); return }
    if (password !== confirm) { useUI.getState().toast(t('Passwords do not match')); return }
    if (joinRequired && !code.trim()) { useUI.getState().toast(t('A gym code is required')); return }
    setBusy(true)
    try {
      const u = await registerAccount({ name: n, email: email.trim(), password, code: code.trim() })
      setUser(u); close()
      if (hasData(useStore.getState().S)) { await pushState(); useUI.getState().toast(t('Profile created — data from this device moved into it')) }
      else { await pullState(); useUI.getState().toast(t('Welcome, {0}', u.name)) }
    } catch (e) { useUI.getState().toast(e.message || t('Registration failed')) }
    finally { setBusy(false) }
  }
  return <>
    <h3>{t('Create your profile')}</h3>
    <div className="muted small" style={{ marginBottom: 14 }}>{t('Pick a name, email and password. You can add a passkey later.')}</div>
    {joinRequired && <>
      <input ref={ref} className="input" placeholder={t('Gym code')} maxLength={40} value={code}
        onChange={e => setCode(e.target.value.toUpperCase())} onBlur={() => lookup(code)}
        style={{ letterSpacing: '.08em', fontWeight: 600, textAlign: 'center' }} autoComplete="off" />
      <div className="dim small" style={{ marginTop: 6, marginBottom: 10 }}>{gymHint || t('Enter the code your gym gave you.')}</div>
    </>}
    <input ref={joinRequired ? null : ref} className="input" placeholder={t('Your name')} maxLength={40} value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
    <div style={{ height: 10 }} />
    <input className="input" type="email" placeholder={t('Email')} maxLength={120} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
    <div style={{ height: 10 }} />
    <input className="input" type="password" placeholder={t('Password')} maxLength={200} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
    <div style={{ height: 10 }} />
    <input className="input" type="password" placeholder={t('Confirm password')} maxLength={200} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
    <div style={{ height: 12 }} />
    <Button variant="primary" onClick={go} disabled={busy}>{t('Create account')}</Button>
  </>
}

export default function Login() {
  const { setUser, pullState, setGuest } = useStore()
  const config = useStore(s => s.config)
  const canGuest = guestAllowed(config)
  const name = instanceAppName(config)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const signInPasskey = async () => {
    try { const u = await passkeyLogin(); setUser(u); await pullState(); useUI.getState().toast(t('Welcome back, {0}', u.name)) }
    catch (e) { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') useUI.getState().toast(e.message || t('Sign-in failed')) }
  }
  const signInPassword = async () => {
    if (!email.trim()) { useUI.getState().toast(t('Enter an email')); return }
    if (!password) { useUI.getState().toast(t('Enter a password')); return }
    setBusy(true)
    try {
      const u = await loginAccount(email.trim(), password)
      setUser(u); await pullState(); useUI.getState().toast(t('Welcome back, {0}', u.name))
    } catch (e) { useUI.getState().toast(e.message || t('Sign-in failed')) }
    finally { setBusy(false) }
  }
  const head = <>
    <div style={{ fontSize: 54, display: 'flex', justifyContent: 'center', color: 'var(--acc)' }}><Icon name="dumbbell" /></div>
    <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-.028em', margin: '10px 0 4px' }}>{name}</h1>
  </>
  const wrap = { display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '78vh', textAlign: 'center' }

  // Demo build: no backend to sign in against — the only way in is the local guest profile.
  if (DEMO) return (
    <div className="narrow" style={wrap}>
      {head}
      <div className="muted" style={{ marginBottom: 30 }}>{t('Live demo — everything stays in this browser.')}</div>
      <Button variant="primary" icon="sparkles" onClick={() => setGuest(true)}>{t('Start the demo')}</Button>
      <div className="card small muted" style={{ textAlign: 'left', marginTop: 16 }}>
        {t('This demo runs entirely in your browser on example data — nothing is sent anywhere. Passkey sign-in and sync across your devices come with the MiGYM server, which you get by self-hosting it.')}
      </div>
      <div className="dim small" style={{ marginTop: 22, lineHeight: 1.6 }}>
        <a href={SOURCE_REPO} target="_blank" rel="noopener">{t('Self-host it in a minute →')}</a>
      </div>
    </div>
  )

  return (
    <div className="narrow" style={wrap}>
      {head}
      <div className="muted" style={{ marginBottom: 34 }}>{t('Your workouts. Your weights. Your profile.')}</div>
      <input className="input" type="email" placeholder={t('Email')} maxLength={120} value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
      <div style={{ height: 10 }} />
      <input className="input" type="password" placeholder={t('Password')} maxLength={200} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"
        onKeyDown={e => { if (e.key === 'Enter') signInPassword() }} />
      <div style={{ height: 12 }} />
      <Button variant="primary" icon="person" onClick={signInPassword} disabled={busy}>{t('Sign in')}</Button>
      <div style={{ height: 10 }} />
      <Button icon="sparkles" onClick={() => useUI.getState().openSheet(close => <RegisterSheet close={close} />)}>{t('Create new profile')}</Button>
      {webauthnOK() && <>
        <div style={{ height: 10 }} />
        <Button variant="ghost" onClick={signInPasskey}>{t('Sign in with passkey')}</Button>
      </>}
      {canGuest && <>
        <div style={{ height: 10 }} />
        <Button variant="ghost" className="dim" onClick={() => setGuest(true)}>{t('Continue without account')}</Button>
      </>}
      <div className="dim small" style={{ marginTop: 26, lineHeight: 1.5 }}>
        {webauthnOK() ? <>{t('Passkeys use {0} — add one in Settings after you sign in.', BIO)}<br /></> : null}
        {t('Each profile keeps its own plan, workouts & body weight.')}
      </div>
    </div>
  )
}
