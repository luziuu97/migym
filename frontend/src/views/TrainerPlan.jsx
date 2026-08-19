import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { DAYN, exCount } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import Icon from '../components/Icon.jsx'
import { Button } from '../components/ui.jsx'
import { glyphOf } from '../lib/glyphs.js'

export default function TrainerPlan() {
  const { id } = useParams()
  const nav = useNavigate()
  const mine = useStore(s => s.S)
  const toast = useUI(s => s.toast)
  const [name, setName] = useState('')
  const [routines, setRoutines] = useState([])
  const [week, setWeek] = useState({})
  const [customEx, setCustomEx] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api('/api/trainer/plan?id=' + encodeURIComponent(id)).then(d => {
      setName(d.name || '')
      setRoutines(d.routines || [])
      setWeek(d.week || {})
      setCustomEx(d.customEx || [])
    }).catch(e => toast(e.message))
  }, [id])

  const save = () => {
    setBusy(true)
    api('/api/trainer/plan', { method: 'PUT', body: JSON.stringify({ id, routines, week, customEx }) })
      .then(() => { toast(t('Plan saved')); nav('/gym') })
      .catch(e => toast(e.message || t('Failed to load')))
      .finally(() => setBusy(false))
  }

  const copyMine = () => {
    setRoutines(JSON.parse(JSON.stringify(mine.routines || [])))
    setWeek({ ...(mine.week || {}) })
    setCustomEx(JSON.parse(JSON.stringify(mine.customEx || [])))
    toast(t('Copied your plan'))
  }

  const assign = (day, rid) => setWeek(w => {
    const next = { ...w }
    if (!rid) delete next[day]
    else next[day] = rid
    return next
  })

  return <div className="narrow">
    <div className="hdr">
      <button className="iconbtn" onClick={() => nav('/gym')} aria-label={t('Back')}><Icon name="chevronLeft" /></button>
      <div style={{ flex: 1, marginLeft: 10 }}><h1>{t('Edit plan')}</h1><div className="sub">{name}</div></div>
    </div>
    <Button icon="clipboard" onClick={copyMine}>{t('Copy my plan to this member')}</Button>
    <div style={{ height: 16 }} />
    <h4 className="sec">{t('Week schedule')}</h4>
    <div className="list" style={{ display: 'flex', flexDirection: 'column' }}>
      {[1, 2, 3, 4, 5, 6, 0].map(d => {
        const r = routines.find(x => x.id === week[d])
        return <div key={d} className="item">
          <div className="grow"><div className="tt">{t(DAYN[d])}</div></div>
          <select className="input" style={{ width: 'auto', minWidth: 140 }} value={week[d] || ''} onChange={e => assign(d, e.target.value)}>
            <option value="">{t('Rest')}</option>
            {routines.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          {r && <span className="tag acc" style={{ marginLeft: 8 }}><Icon name={glyphOf(r.emoji)} />{r.name}</span>}
        </div>
      })}
    </div>
    <h4 className="sec">{t('Routines')}</h4>
    {routines.length ? <div className="list">{routines.map(r => <div key={r.id} className="item">
      <span className="lrow-i"><Icon name={glyphOf(r.emoji)} /></span>
      <div className="grow"><div className="tt">{r.name}</div><div className="ss">{exCount((r.ex || []).length)}</div></div>
    </div>)}</div> : <div className="empty">{t('No routines yet.')}</div>}
    <div style={{ height: 16 }} />
    <Button variant="primary" disabled={busy} onClick={save}>{t('Save')}</Button>
  </div>
}
