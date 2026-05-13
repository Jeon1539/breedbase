import { useState, useCallback } from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  useRealtime, useCages, useMice, useLitters, useTodayTasks,
  createCage, updateCage, deleteCage,
  createMouse, updateMouse, deleteMouse, setGenotype,
  createLitter, separateMale, weanLitter
} from './hooks/useDB'

/* ── utils ── */
const addDays = (s, n) => { const d = new Date(s); d.setDate(d.getDate() + n); return d.toISOString().slice(0,10) }
const diffDays = s => Math.ceil((new Date(s).getTime() - Date.now()) / 86400000)
const fmtD = s => s ? new Date(s).toLocaleDateString('ko-KR', { month:'2-digit', day:'2-digit' }) : '—'
const fmtFull = s => s ? new Date(s).toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' }) : '—'
const GC = g => { if(!g) return 'b-unk'; const n=g.toLowerCase(); if(n==='wt') return 'b-wt'; if(n.startsWith('het')) return 'b-het'; if(n==='homo'||n==='hom') return 'b-hom'; return 'b-unk' }
const SC = s => ({'생존':'b-alive','mating중':'b-mating','실험중':'b-exp','안락사':'b-euth','폐사':'b-dead'}[s] ?? 'b-unk')
const TL = t => ({'mating':'교배 cage','male':'수컷 cage','female':'암컷 cage','holding':'holding'}[t] ?? t ?? '')
const CAGE_ICON  = { mating:'ti-heart', male:'ti-gender-male', female:'ti-gender-female', holding:'ti-home' }
const CAGE_COLOR = { mating:'var(--info-tx)', male:'var(--suc-tx)', female:'var(--err-tx)', holding:'var(--t3)' }
const STATUSES = ['생존','mating중','실험중','안락사','폐사']

/* ── Modal wrapper ── */
function Modal({ children, onClose }) {
  return (
    <div className="overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">{children}</div>
    </div>
  )
}

/* ══════════════════════════════
   APP SHELL
══════════════════════════════ */
export default function App() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [line, setLine] = useState('ALL')
  const [tick, setTick] = useState(0)
  const refetchAll = useCallback(() => setTick(t => t+1), [])

  useRealtime('mice',    refetchAll)
  useRealtime('cages',   refetchAll)
  useRealtime('litters', refetchAll)

  const lineFilter = l => { setLine(l); navigate('/') }

  const PAGE_LABELS = {
    '/':        { title: 'Dashboard',   sub: 'FAM19A5 KO · KI 통합 현황' },
    '/cages':   { title: '케이지 현황', sub: '' },
    '/mice':    { title: '개체 목록',   sub: '' },
    '/litters': { title: 'Litter',      sub: '' },
    '/trend':   { title: '출산 경향성', sub: '' },
  }
  const { title, sub } = PAGE_LABELS[location.pathname] ?? { title: 'BreedBase', sub: '' }

  return (
    <div style={{display:'flex', height:'100vh', overflow:'hidden'}}>
      {/* ── Sidebar ── */}
      <div style={{width:186, flexShrink:0, background:'var(--bg)', borderRight:'.5px solid var(--bd)', display:'flex', flexDirection:'column', overflowY:'auto'}}>
        <div className="logo">
          <div className="logo-name">BreedBase</div>
          <div className="logo-sub">FAM19A5 KO / KI</div>
        </div>
        <div className="nav-sec">Overview</div>
        <NavLink to="/" end className={({isActive})=>`nav-item${isActive?' active':''}`}><i className="ti ti-layout-dashboard"></i>Dashboard</NavLink>
        <div className="nav-sec">Data</div>
        <NavLink to="/cages"   className={({isActive})=>`nav-item${isActive?' active':''}`}><i className="ti ti-layout-grid"></i>케이지 현황</NavLink>
        <NavLink to="/mice"    className={({isActive})=>`nav-item${isActive?' active':''}`}><i className="ti ti-circle-dot"></i>개체 목록</NavLink>
        <NavLink to="/litters" className={({isActive})=>`nav-item${isActive?' active':''}`}><i className="ti ti-git-branch"></i>Litter</NavLink>
        <div className="nav-sec">Analytics</div>
        <NavLink to="/trend"   className={({isActive})=>`nav-item${isActive?' active':''}`}><i className="ti ti-chart-line"></i>출산 경향성</NavLink>
        <div style={{flex:1}}></div>
        <a className="iacuc-btn" href="https://kumc-iacuc.korea.ac.kr:472/index.htm" target="_blank" rel="noreferrer">
          <i className="ti ti-external-link"></i>동물실 예약 (IACUC)
        </a>
      </div>

      {/* ── Main ── */}
      <div style={{flex:1, minWidth:0, height:'100%', display:'flex', flexDirection:'column', overflow:'hidden'}}>
        {/* Topbar */}
        <div style={{flexShrink:0, padding:'12px 20px', borderBottom:'.5px solid var(--bd)', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10}}>
          <div>
            <div className="pg-title">{title}</div>
            {sub && <div className="pg-sub">{sub}</div>}
          </div>
          <div className="line-tabs">
            {['ALL','KO','KI','Cre'].map(l => (
              <div key={l} className={`ltab${line===l?' on':''}`} onClick={()=>lineFilter(l)}>
                {l==='ALL'?'전체':l}
              </div>
            ))}
          </div>
        </div>

        {/* Content - 이 div만 스크롤 */}
        <div style={{flexGrow:1, flexShrink:1, flexBasis:0, minHeight:0, overflowY:'scroll', overflowX:'hidden', padding:'16px 20px'}}>
          <Routes>
            <Route path="/"        element={<Dashboard  line={line} tick={tick} />} />
            <Route path="/cages"   element={<Cages      line={line} tick={tick} onRefetch={refetchAll} />} />
            <Route path="/mice"    element={<MicePage   line={line} tick={tick} onRefetch={refetchAll} />} />
            <Route path="/litters" element={<LitterPage line={line} tick={tick} onRefetch={refetchAll} />} />
            <Route path="/trend"   element={<TrendPage  line={line} tick={tick} />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════
   DASHBOARD
══════════════════════════════ */
function Dashboard({ line }) {
  const { data: tasks } = useTodayTasks()
  const { data: mice  } = useMice(line === 'ALL' ? undefined : line)
  const { data: lits  } = useLitters(line === 'ALL' ? undefined : line)
  const { data: cages } = useCages(line === 'ALL' ? undefined : line)

  const alive = mice?.filter(m => ['생존','mating중'].includes(m.status)).length ?? 0
  const genoMissing = mice?.filter(m => m.status==='생존' && !m.genotype).length ?? 0
  const dist = { WT:0, Het:0, Homo:0, Unknown:0 }
  mice?.forEach(m => { const k = m.genotype ?? 'Unknown'; dist[k] = (dist[k]||0)+1 })
  const total = mice?.length || 1

  return (<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <div className="stats">
      <div className="scard"><div className="sc-lbl">생존 개체</div><div className="sc-val">{alive}</div><div className="sc-note">전체 {mice?.length??0}마리</div></div>
      <div className="scard"><div className="sc-lbl">Mating cages</div><div className="sc-val">{cages?.filter(c=>c.type==='mating').length??0}</div><div className="sc-note">교배 진행 중</div></div>
      <div className="scard"><div className="sc-lbl">진행 중 Litter</div><div className="sc-val">{lits?.filter(l=>!l.weaned).length??0}</div><div className="sc-note">총 {lits?.length??0}개</div></div>
      <div className="scard"><div className="sc-lbl">Genotype 미입력</div><div className="sc-val" style={{color:genoMissing?'var(--warn-tx)':'inherit'}}>{genoMissing}</div><div className="sc-note">생존 개체 기준</div></div>
    </div>
    <div className="two-col">
      <div className="tbl-wrap">
        <div className="tbl-head"><span className="tbl-title">Today's tasks</span><span style={{fontSize:10,color:'var(--t3)'}}>{fmtFull(new Date().toISOString())}</span></div>
        {tasks?.length ? tasks.map((t,i) => {
          const urg = t.days_until<=0?'urgent':t.days_until<=3?'soon':'ok'
          return <div key={i} className="todo-item">
            <div className={`todo-dot dot-${urg}`}></div>
            <div>
              <div className="todo-lbl">Weaning — {t.cage_num} ({t.line})</div>
              <div className="todo-sub">D{t.days_until>=0?'+'+t.days_until:t.days_until} · 출생 {fmtD(t.birth_date)} · {t.pup_count}마리</div>
            </div>
          </div>
        }) : <div className="empty">오늘 예정된 작업 없음</div>}
      </div>
      <div className="tbl-wrap">
        <div className="tbl-head"><span className="tbl-title">Genotype 분포</span></div>
        <div style={{padding:'11px 13px'}}>
          <div className="gbar">
            <div className="gs b-wt"  style={{flex:dist.WT}}></div>
            <div className="gs b-het" style={{flex:dist.Het}}></div>
            <div className="gs b-hom" style={{flex:dist.Homo}}></div>
            <div className="gs b-unk" style={{flex:dist.Unknown}}></div>
          </div>
          {['WT','Het','Homo','Unknown'].map(k => (
            <div key={k} style={{display:'flex',justifyContent:'space-between',marginTop:7,fontSize:11}}>
              <span className={`bdg ${GC(k)}`}>{k}</span>
              <span className="mono">{dist[k]}마리 ({Math.round(dist[k]/total*100)}%)</span>
            </div>
          ))}
          <div style={{marginTop:9,paddingTop:9,borderTop:'.5px solid var(--bd)',fontSize:10,color:'var(--t3)'}}>기대값 (HET×HET): WT 25% · Het 50% · Homo 25%</div>
        </div>
      </div>
    </div>
  </div>)
}

/* ══════════════════════════════
   CAGES
══════════════════════════════ */
function Cages({ line, onRefetch }) {
  const { data: cages, refetch } = useCages(line==='ALL'?undefined:line)
  const { data: mice  } = useMice()
  const { data: lits  } = useLitters()
  const [modal, setModal]     = useState(null)
  const [target, setTarget]   = useState(null)
  const [targetLit, setTargetLit] = useState(null)
  const refresh = () => { refetch(); onRefetch() }
  const miceIn = cid => mice?.filter(m => m.cage_id===cid) ?? []

  const CageCard = ({ cg }) => {
    const ml  = miceIn(cg.id)
    const lit = lits?.find(l => l.id===cg.litter_id)
    const canSep  = cg.type==='mating' && ml.some(m=>m.sex==='M')
    const canWean = cg.type==='mating' && lit && !lit.weaned
    let parentInfo = null
    if (cg.type!=='mating' && cg.litter_id) {
      const plit = lits?.find(l=>l.id===cg.litter_id)
      if (plit) {
        const pm = miceIn(plit.cage_id)
        const dad = pm.find(m=>m.sex==='M'), mom = pm.find(m=>m.sex==='F')
        if (dad||mom) parentInfo = { dad, mom, cageNum: cages?.find(c=>c.id===plit.cage_id)?.num }
      }
    }
    return (
      <div className={`cage-card type-${cg.type}`}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:4}}>
          <div>
            <div className="cage-num">{cg.num}</div>
            <div style={{display:'flex',alignItems:'center',gap:5,marginTop:4}}>
              <span className={`bdg b-type-${cg.type}`} style={{fontSize:9}}>{TL(cg.type)}</span>
              <span className={`bdg b-${cg.line}`} style={{fontSize:9}}>{cg.line}</span>
            </div>
          </div>
          <button className="btn btn-sm" onClick={()=>{setTarget(cg);setModal('edit-cage')}}><i className="ti ti-edit"></i></button>
        </div>
        {lit && <div style={{fontSize:10,color:'var(--t3)',marginTop:5}}>Litter 출생: {fmtD(lit.birth_date)}</div>}
        {cg.notes && <div style={{fontSize:10,color:'var(--t3)',marginTop:3}}>{cg.notes}</div>}
        <div className="cage-mice">
          {ml.length ? ml.map(m => (
            <div key={m.id} className="cmrow">
              <span className="mid">{m.mid}</span>
              <span>{m.sex==='M'?'♂':'♀'}</span>
              <span className={`bdg ${GC(m.genotype)}`} style={{fontSize:9}}>{m.genotype??'?'}</span>
              <span className={`bdg ${SC(m.status)}`} style={{fontSize:9}}>{m.status}</span>
            </div>
          )) : <div style={{fontSize:10,color:'var(--t3)',padding:'4px 2px'}}>개체 없음</div>}
        </div>
        {parentInfo && (
          <div className="parent-info">
            <div style={{fontSize:9,color:'var(--t3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.04em'}}>부모 ({parentInfo.cageNum})</div>
            {parentInfo.dad && <div className="parent-row"><span style={{color:'var(--suc-tx)'}}>♂</span><span className="mono">{parentInfo.dad.mid}</span><span className={`bdg ${GC(parentInfo.dad.genotype)}`} style={{fontSize:9}}>{parentInfo.dad.genotype??'?'}</span></div>}
            {parentInfo.mom && <div className="parent-row"><span style={{color:'var(--err-tx)'}}>♀</span><span className="mono">{parentInfo.mom.mid}</span><span className={`bdg ${GC(parentInfo.mom.genotype)}`} style={{fontSize:9}}>{parentInfo.mom.genotype??'?'}</span></div>}
          </div>
        )}
        <div className="cage-actions">
          {canSep  && <button className="btn btn-warn btn-sm" onClick={()=>{setTarget(cg);setModal('separate')}}><i className="ti ti-arrow-bar-right"></i>수컷 분리</button>}
          {canWean && <button className="btn btn-primary btn-sm" onClick={()=>{setTarget(cg);setTargetLit(lit);setModal('wean')}}><i className="ti ti-scissors"></i>Weaning</button>}
        </div>
      </div>
    )
  }

  const mating  = cages?.filter(c=>c.type==='mating') ?? []
  const general = cages?.filter(c=>c.type!=='mating') ?? []

  return (<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <div className="sec-row">
      <div className="sec-title">케이지 현황 ({cages?.length??0})</div>
      <button className="btn btn-primary" onClick={()=>{setTarget(null);setModal('add-cage')}}><i className="ti ti-plus"></i>케이지 추가</button>
    </div>
    <div className="tbl-wrap">
      <div className="tbl-head"><span className="tbl-title" style={{color:'var(--info-tx)'}}><i className="ti ti-heart" style={{fontSize:12,marginRight:4}}></i>교배 Cage ({mating.length})</span></div>
      <div style={{padding:12}}>{mating.length ? <div className="cage-grid">{mating.map(cg=><CageCard key={cg.id} cg={cg}/>)}</div> : <div className="empty">교배 중인 케이지 없음</div>}</div>
    </div>
    <div className="tbl-wrap">
      <div className="tbl-head"><span className="tbl-title"><i className="ti ti-home" style={{fontSize:12,marginRight:4}}></i>일반 Cage ({general.length})</span></div>
      <div style={{padding:12}}>{general.length ? <div className="cage-grid">{general.map(cg=><CageCard key={cg.id} cg={cg}/>)}</div> : <div className="empty">일반 케이지 없음</div>}</div>
    </div>

    {(modal==='add-cage'||modal==='edit-cage') && (
      <CageModal cage={target} onClose={()=>setModal(null)}
        onSave={async d => { target ? await updateCage(target.id,d) : await createCage(d); setModal(null); refresh() }}
        onDelete={async () => { if(target){await deleteCage(target.id);setModal(null);refresh()} }}
      />
    )}
    {modal==='separate' && target && (
      <SeparateModal cage={target} mice={miceIn(target.id).filter(m=>m.sex==='M')}
        onClose={()=>setModal(null)}
        onSave={async opts => { await separateMale(opts); setModal(null); refresh() }}
      />
    )}
    {modal==='wean' && target && targetLit && (
      <WeanModal cage={target} litter={targetLit} mice={mice??[]}
        onClose={()=>setModal(null)}
        onSave={async opts => { await weanLitter(opts); setModal(null); refresh() }}
      />
    )}
  </div>)
}

/* ══════════════════════════════
   MICE
══════════════════════════════ */
function MicePage({ line, onRefetch }) {
  const { data: mice, refetch } = useMice(line==='ALL'?undefined:line)
  const { data: cages } = useCages()
  const [search, setSearch] = useState('')
  const [sort, setSort]     = useState(null)
  const [modal, setModal]   = useState(null)
  const [target, setTarget] = useState(null)
  const refresh = () => { refetch(); onRefetch() }

  const sorted = [...(mice??[])].sort((a,b) => {
    if (!sort) return 0
    let av = String(a[sort.col]??''), bv = String(b[sort.col]??'')
    if (sort.col==='cage_id') { av=a.cage_num??''; bv=b.cage_num??'' }
    return av<bv?-sort.dir:av>bv?sort.dir:0
  }).filter(m => !search || JSON.stringify(m).toLowerCase().includes(search.toLowerCase()))

  const Th = ({ label, col }) => {
    const cls = sort?.col===col ? (sort.dir===1?'sort-asc':'sort-desc') : ''
    return <th className={cls} onClick={()=>setSort(s=>s?.col===col?{col,dir:-s.dir}:{col,dir:1})}>
      {label}<span className="si"></span>
    </th>
  }

  const CageCell = ({ m }) => {
    if (!m.cage_id || !m.cage_num) return <span style={{color:'var(--t3)',fontSize:11}}>—</span>
    const icon  = CAGE_ICON[m.cage_type]  ?? 'ti-home'
    const color = CAGE_COLOR[m.cage_type] ?? 'var(--t3)'
    return (
      <div style={{display:'flex',flexDirection:'column',gap:2}}>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          <i className={`ti ${icon}`} style={{fontSize:12,color}}></i>
          <span className="mono" style={{fontWeight:500,color:'var(--t1)'}}>{m.cage_num}</span>
          <span className={`bdg b-${m.line}`} style={{fontSize:9}}>{m.line}</span>
        </div>
        <div style={{fontSize:10,color:'var(--t3)',paddingLeft:17}}>{TL(m.cage_type)}</div>
      </div>
    )
  }

  return (<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <div className="sec-row">
      <div className="sec-title">개체 목록 ({sorted.length})</div>
      <div style={{display:'flex',gap:7}}>
        <input style={{background:'var(--bg2)',border:'.5px solid var(--bd)',borderRadius:7,padding:'4px 9px',fontSize:11,color:'var(--t1)',outline:'none',width:140}}
          placeholder="ID / 케이지 검색..." value={search} onChange={e=>setSearch(e.target.value)} />
        <button className="btn btn-primary" onClick={()=>{setTarget(null);setModal('add-mouse')}}><i className="ti ti-plus"></i>개체 등록</button>
      </div>
    </div>
    <div className="tbl-wrap">
      <table>
        <thead><tr>
          <Th label="ID"         col="mid" />
          <Th label="성별"       col="sex" />
          <Th label="Line"       col="line" />
          <Th label="Generation" col="generation" />
          <Th label="DOB"        col="dob" />
          <Th label="Genotype"   col="genotype" />
          <Th label="상태"       col="status" />
          <Th label="케이지"     col="cage_id" />
          <th>메모</th><th>작업</th>
        </tr></thead>
        <tbody>
          {sorted.map(m => (
            <tr key={m.id}>
              <td><span className="mono" style={{color:'var(--t1)'}}>{m.mid}</span></td>
              <td>{m.sex==='M'?'♂':'♀'}</td>
              <td><span className={`bdg b-${m.line}`}>{m.line}</span></td>
              <td style={{color:'var(--t3)'}}>{m.generation??'—'}</td>
              <td><span className="mono">{fmtD(m.dob)}</span></td>
              <td>{m.genotype
                ? <span className={`bdg ${GC(m.genotype)}`}>{m.genotype}</span>
                : <span className="geno-add" onClick={()=>{setTarget(m);setModal('geno')}}>+ 입력</span>
              }</td>
              <td><span className={`bdg ${SC(m.status)}`}>{m.status}</span></td>
              <td><CageCell m={m} /></td>
              <td style={{maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--t3)',fontSize:10}}>{m.notes||'—'}</td>
              <td>
                <div style={{display:'flex',gap:4}}>
                  <button className="btn btn-sm" title="수정" onClick={()=>{setTarget(m);setModal('edit-mouse')}}><i className="ti ti-edit"></i></button>
                  <button className="btn btn-sm" title="가계도" onClick={()=>{setTarget(m);setModal('pedigree')}}><i className="ti ti-hierarchy"></i></button>
                  <button className="btn btn-danger btn-sm" title="삭제" onClick={async()=>{if(confirm('삭제하시겠습니까?')){await deleteMouse(m.id);refresh()}}}><i className="ti ti-trash"></i></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {(modal==='add-mouse'||modal==='edit-mouse') && (
      <MouseModal mouse={target} cages={cages??[]} onClose={()=>setModal(null)}
        onSave={async d => { target ? await updateMouse(target.id,d) : await createMouse(d); setModal(null); refresh() }}
        onDelete={async () => { if(target){await deleteMouse(target.id);setModal(null);refresh()} }}
      />
    )}
    {modal==='geno' && target && (
      <GenoModal mouse={target} onClose={()=>setModal(null)}
        onSave={async g => { await setGenotype(target.id,g); setModal(null); refresh() }}
      />
    )}
    {modal==='pedigree' && target && <PedigreeModal mouse={target} onClose={()=>setModal(null)} />}
  </div>)
}

/* ══════════════════════════════
   LITTERS
══════════════════════════════ */
function LitterPage({ line, onRefetch }) {
  const { data: lits, refetch } = useLitters(line==='ALL'?undefined:line)
  const { data: cages } = useCages()
  const [modal, setModal] = useState(false)
  const refresh = () => { refetch(); onRefetch() }

  return (<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <div className="sec-row">
      <div className="sec-title">Litter ({lits?.length??0})</div>
      <button className="btn btn-primary" onClick={()=>setModal(true)}><i className="ti ti-plus"></i>Litter 등록</button>
    </div>
    <div className="tbl-wrap">
      <table>
        <thead><tr><th>Line</th><th>Mating cage</th><th>출생일</th><th>Pup 수</th><th>Weaning 예정</th><th>D-day</th><th>상태</th></tr></thead>
        <tbody>
          {lits?.map(l => {
            const wDate = addDays(l.birth_date, 21)
            const wd = diffDays(wDate)
            return (
              <tr key={l.id}>
                <td><span className={`bdg b-${l.line}`}>{l.line}</span></td>
                <td><span className="mono">{l.cage?.num ?? '—'}</span></td>
                <td><span className="mono">{fmtD(l.birth_date)}</span></td>
                <td>{l.pup_count}</td>
                <td><span className={`bdg ${wd<0?'b-alive':wd<=3?'b-het':'b-unk'}`}>{fmtD(wDate)}</span></td>
                <td style={{color:wd<0?'var(--suc-tx)':wd<=3?'var(--warn-tx)':'var(--t3)',fontFamily:'monospace',fontSize:10}}>{wd<0?'D'+wd:'D+'+wd}</td>
                <td>{l.weaned ? <span className="bdg b-alive">완료</span> : <span className="bdg b-het">진행 중</span>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
    {modal && (
      <LitterModal cages={cages?.filter(c=>c.type==='mating')??[]} onClose={()=>setModal(false)}
        onSave={async d => { await createLitter(d); setModal(false); refresh() }}
      />
    )}
  </div>)
}

/* ══════════════════════════════
   TREND
══════════════════════════════ */
function TrendPage({ line }) {
  const { data: cages } = useCages(line==='ALL'?undefined:line)
  const { data: lits  } = useLitters()
  const { data: mice  } = useMice()
  const mating = cages?.filter(c=>c.type==='mating') ?? []
  if (!mating.length) return <div className="empty">교배 중인 케이지 없음</div>
  return (<div style={{display:'flex',flexDirection:'column',gap:14}}>
    {mating.map(cg => {
      const cgLits = lits?.filter(l=>l.cage_id===cg.id) ?? []
      const miceIn = mice?.filter(m=>m.cage_id===cg.id) ?? []
      const avg = cgLits.length ? Math.round(cgLits.reduce((s,l)=>s+l.pup_count,0)/cgLits.length) : 0
      return (
        <div key={cg.id} className="tbl-wrap" style={{marginBottom:10}}>
          <div className="tbl-head">
            <div><span className="tbl-title">{cg.num}</span><span className={`bdg b-${cg.line}`} style={{marginLeft:5}}>{cg.line}</span></div>
            <span style={{fontSize:10,color:'var(--t3)'}}>평균 {avg}마리/litter · {cgLits.length}회</span>
          </div>
          <div style={{padding:'11px 13px'}}>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
              {cgLits.map(l => (
                <div key={l.id} style={{padding:'6px 11px',background:l.pup_count===0?'var(--err-bg)':l.weaned?'var(--suc-bg)':'var(--info-bg)',borderRadius:8,textAlign:'center'}}>
                  <div style={{fontSize:12,fontWeight:500,color:l.pup_count===0?'var(--err-tx)':l.weaned?'var(--suc-tx)':'var(--info-tx)'}}>{l.pup_count===0?'FAIL':l.pup_count+'마리'}</div>
                  <div style={{fontSize:9,color:'var(--t3)'}}>{fmtD(l.birth_date)}</div>
                </div>
              ))}
              {!cgLits.length && <span style={{color:'var(--t3)',fontSize:11}}>출산 기록 없음</span>}
            </div>
            <div style={{fontSize:10,color:'var(--t3)'}}>현재: {miceIn.map(m=>`${m.mid}(${m.sex==='M'?'♂':'♀'}/${m.genotype??'?'})`).join(', ')||'없음'}</div>
          </div>
        </div>
      )
    })}
  </div>)
}

/* ══════════════════════════════
   MODAL COMPONENTS
══════════════════════════════ */
function CageModal({ cage, onClose, onSave, onDelete }) {
  const [num,   setNum]   = useState(cage?.num   ?? '')
  const [type,  setType]  = useState(cage?.type  ?? 'mating')
  const [line,  setLine]  = useState(cage?.line  ?? 'KO')
  const [notes, setNotes] = useState(cage?.notes ?? '')
  return (
    <Modal onClose={onClose}>
      <div className="modal-title">{cage ? `케이지 수정 — ${cage.num}` : '새 케이지 추가'}</div>
      <div className="fgrow">
        <div className="fg"><div className="flbl">케이지 번호</div><input className="finput" value={num} onChange={e=>setNum(e.target.value)} placeholder="KO-M02" /></div>
        <div className="fg"><div className="flbl">종류</div>
          <select className="finput" value={type} onChange={e=>setType(e.target.value)}>
            <option value="mating">교배 cage</option><option value="male">수컷 cage</option><option value="female">암컷 cage</option><option value="holding">holding</option>
          </select>
        </div>
        <div className="fg"><div className="flbl">Line</div>
          <select className="finput" value={line} onChange={e=>setLine(e.target.value)}>
            <option>KO</option><option>KI</option><option>Cre</option>
          </select>
        </div>
        <div className="fg"><div className="flbl">메모</div><input className="finput" value={notes} onChange={e=>setNotes(e.target.value)} /></div>
      </div>
      <div className="fact">
        {cage && <button className="btn btn-danger" onClick={onDelete}>삭제</button>}
        <button className="btn" onClick={onClose}>취소</button>
        <button className="btn btn-primary" onClick={()=>onSave({num,type,line,notes})}>저장</button>
      </div>
    </Modal>
  )
}

function MouseModal({ mouse, cages, onClose, onSave, onDelete }) {
  const [mid,    setMid]    = useState(mouse?.mid         ?? '')
  const [sex,    setSex]    = useState(mouse?.sex         ?? 'M')
  const [line,   setLine]   = useState(mouse?.line        ?? 'KO')
  const [gen,    setGen]    = useState(mouse?.generation  ?? '')
  const [dob,    setDob]    = useState(mouse?.dob         ?? '')
  const [geno,   setGeno]   = useState(mouse?.genotype    ?? '')
  const [status, setStatus] = useState(mouse?.status      ?? '생존')
  const [cageId, setCageId] = useState(mouse?.cage_id     ?? '')
  const [notes,  setNotes]  = useState(mouse?.notes       ?? '')
  return (
    <Modal onClose={onClose}>
      <div className="modal-title">{mouse ? `개체 수정 — ${mouse.mid}` : '개체 등록'}</div>
      <div className="fgrow">
        <div className="fg"><div className="flbl">Mouse ID</div><input className="finput" value={mid} onChange={e=>setMid(e.target.value)} placeholder="#000" /></div>
        <div className="fg"><div className="flbl">성별</div>
          <select className="finput" value={sex} onChange={e=>setSex(e.target.value)}>
            <option value="M">♂ 수컷</option><option value="F">♀ 암컷</option>
          </select>
        </div>
        <div className="fg"><div className="flbl">Line</div>
          <select className="finput" value={line} onChange={e=>setLine(e.target.value)}>
            <option>KO</option><option>KI</option><option>Cre</option>
          </select>
        </div>
        <div className="fg"><div className="flbl">Generation</div><input className="finput" value={gen} onChange={e=>setGen(e.target.value)} placeholder="F1" /></div>
        <div className="fg"><div className="flbl">DOB</div><input className="finput" type="date" value={dob} onChange={e=>setDob(e.target.value)} /></div>
        <div className="fg"><div className="flbl">Genotype</div>
          <select className="finput" value={geno} onChange={e=>setGeno(e.target.value)}>
            <option value="">미입력</option><option value="WT">WT</option><option value="Het">Het</option><option value="Homo">Homo</option>
          </select>
        </div>
        <div className="fg"><div className="flbl">상태</div>
          <select className="finput" value={status} onChange={e=>setStatus(e.target.value)}>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="fg"><div className="flbl">케이지</div>
          <select className="finput" value={cageId} onChange={e=>setCageId(e.target.value)}>
            <option value="">— 없음 —</option>
            {cages.map(c=><option key={c.id} value={c.id}>{c.num} ({TL(c.type)})</option>)}
          </select>
        </div>
        <div className="fg fg-full"><div className="flbl">메모</div>
          <textarea className="finput" rows={2} value={notes} onChange={e=>setNotes(e.target.value)} style={{resize:'vertical'}} />
        </div>
      </div>
      <div className="fact">
        {mouse && <button className="btn btn-danger" onClick={onDelete}>삭제</button>}
        <button className="btn" onClick={onClose}>취소</button>
        <button className="btn btn-primary" onClick={()=>onSave({mid,sex,line,generation:gen||null,dob:dob||null,genotype:geno||null,status,cage_id:cageId||null,notes})}>저장</button>
      </div>
    </Modal>
  )
}

function GenoModal({ mouse, onClose, onSave }) {
  const [result, setResult] = useState('Het')
  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Genotyping 결과 — {mouse.mid}</div>
      <div className="fhint"><i className="ti ti-dna"></i> Tail cutting 후 PCR 결과를 입력합니다.</div>
      <div className="fg"><div className="flbl">결과</div>
        <select className="finput" value={result} onChange={e=>setResult(e.target.value)}>
          <option value="WT">WT</option><option value="Het">Het</option><option value="Homo">Homo</option>
        </select>
      </div>
      <div className="fact">
        <button className="btn" onClick={onClose}>취소</button>
        <button className="btn btn-primary" onClick={()=>onSave(result)}>저장</button>
      </div>
    </Modal>
  )
}

function SeparateModal({ cage, mice, onClose, onSave }) {
  const [selected, setSelected] = useState(mice.map(m=>m.id))
  const [num,   setNum]   = useState(`${cage.line}-♂새`)
  const [notes, setNotes] = useState(`${cage.num}에서 수컷 분리 (임신 확인)`)
  return (
    <Modal onClose={onClose}>
      <div className="modal-title">수컷 분리 — {cage.num}</div>
      <div className="fhint"><i className="ti ti-info-circle"></i> 임신 확인 후 수컷을 분리합니다. 새 cage가 자동 생성됩니다.</div>
      <div className="fg"><div className="flbl">분리할 수컷</div>
        {mice.map(m=>(
          <label key={m.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,cursor:'pointer'}}>
            <input type="checkbox" checked={selected.includes(m.id)}
              onChange={e=>setSelected(s=>e.target.checked?[...s,m.id]:s.filter(x=>x!==m.id))}
              style={{accentColor:'var(--info-tx)'}} />
            <span className="mono">{m.mid}</span>
            <span className={`bdg ${GC(m.genotype)}`} style={{fontSize:9}}>{m.genotype??'?'}</span>
          </label>
        ))}
      </div>
      <div className="fg"><div className="flbl">새 cage 번호</div><input className="finput" value={num} onChange={e=>setNum(e.target.value)} /></div>
      <div className="fg"><div className="flbl">메모</div><input className="finput" value={notes} onChange={e=>setNotes(e.target.value)} /></div>
      <div className="fact">
        <button className="btn" onClick={onClose}>취소</button>
        <button className="btn btn-primary" onClick={()=>onSave({maleIds:selected,newCageNum:num,line:cage.line,notes})}>분리 실행</button>
      </div>
    </Modal>
  )
}

function WeanModal({ cage, litter, mice, onClose, onSave }) {
  const [gen, setGen]   = useState('')
  const [mCageNum, setMCageNum] = useState(`${litter.line}-♂새`)
  const [fCageNum, setFCageNum] = useState(`${litter.line}-♀새`)
  const [pups, setPups] = useState(Array.from({length:litter.pup_count},()=>({mid:'',sex:'M',notes:''})))
  const setPup = (i, field, val) => setPups(ps=>ps.map((p,idx)=>idx===i?{...p,[field]:val}:p))
  const miceInCage = mice.filter(m=>m.cage_id===cage.id)
  const dad = miceInCage.find(m=>m.sex==='M')
  const mom = miceInCage.find(m=>m.sex==='F')
  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Weaning — {cage.num} · 출생 {fmtD(litter.birth_date)} · {litter.pup_count}마리</div>
      <div className="fhint"><i className="ti ti-info-circle"></i> 개체번호·성별 입력 시 암수 cage 자동 생성, 개체 등록됩니다. Genotyping은 이후 추가하세요.</div>
      <div className="fg"><div className="flbl">Generation</div><input className="finput" value={gen} onChange={e=>setGen(e.target.value)} placeholder="F5" style={{width:80}} /></div>
      <div className="pup-hdr"><span>ID</span><span>성별</span><span>메모</span></div>
      {pups.map((p,i)=>(
        <div key={i} className="pup-row">
          <input className="finput" value={p.mid} onChange={e=>setPup(i,'mid',e.target.value)} placeholder={`#${600+i}`} />
          <select className="finput" value={p.sex} onChange={e=>setPup(i,'sex',e.target.value)}>
            <option value="M">♂</option><option value="F">♀</option>
          </select>
          <input className="finput" value={p.notes} onChange={e=>setPup(i,'notes',e.target.value)} placeholder="메모" />
        </div>
      ))}
      <div className="divider"></div>
      <div className="fgrow">
        <div className="fg"><div className="flbl">수컷 cage 번호</div><input className="finput" value={mCageNum} onChange={e=>setMCageNum(e.target.value)} /></div>
        <div className="fg"><div className="flbl">암컷 cage 번호</div><input className="finput" value={fCageNum} onChange={e=>setFCageNum(e.target.value)} /></div>
      </div>
      <div className="fact">
        <button className="btn" onClick={onClose}>취소</button>
        <button className="btn btn-primary" onClick={()=>onSave({
          litterId:litter.id, litLine:litter.line, birthDate:litter.birth_date,
          generation:gen, maleCageNum:mCageNum, femaleCageNum:fCageNum, pups,
          fatherId:dad?.id??null, motherId:mom?.id??null
        })}>완료 및 개체 등록</button>
      </div>
    </Modal>
  )
}

function LitterModal({ cages, onClose, onSave }) {
  const [cageId, setCageId] = useState(cages[0]?.id ?? '')
  const [bd, setBd]     = useState('')
  const [pc, setPc]     = useState(0)
  const [notes, setNotes] = useState('')
  const wean = bd ? addDays(bd, 21) : ''
  const line = cages.find(c=>c.id===cageId)?.line ?? 'KO'
  return (
    <Modal onClose={onClose}>
      <div className="modal-title">Litter 등록</div>
      <div className="fg"><div className="flbl">Mating cage</div>
        <select className="finput" value={cageId} onChange={e=>setCageId(e.target.value)}>
          {cages.map(c=><option key={c.id} value={c.id}>{c.num} ({c.line})</option>)}
        </select>
      </div>
      <div className="fgrow">
        <div className="fg"><div className="flbl">출생일</div><input className="finput" type="date" value={bd} onChange={e=>setBd(e.target.value)} /></div>
        <div className="fg"><div className="flbl">Pup 수</div><input className="finput" type="number" value={pc} onChange={e=>setPc(+e.target.value)} min={0} /></div>
      </div>
      {wean && <div className="fhint">Weaning 예정: {fmtD(wean)} (D+21)</div>}
      <div className="fg"><div className="flbl">메모</div><input className="finput" value={notes} onChange={e=>setNotes(e.target.value)} /></div>
      <div className="fact">
        <button className="btn" onClick={onClose}>취소</button>
        <button className="btn btn-primary" onClick={()=>onSave({cage_id:cageId,line,birth_date:bd,pup_count:pc,weaned:false,notes})}>저장</button>
      </div>
    </Modal>
  )
}

function PedigreeModal({ mouse, onClose }) {
  const GEN_COLORS = {
    WT:      {fill:'#e3f5ec',stroke:'#7ed4a8',txt:'#1a7f4b'},
    Het:     {fill:'#fef3e2',stroke:'#f5c77e',txt:'#a35c0a'},
    Homo:    {fill:'#fde8e8',stroke:'#f5a0a0',txt:'#b91c1c'},
    Unknown: {fill:'#f5f5f3',stroke:'#ccc',   txt:'#888'},
  }
  const c = GEN_COLORS[mouse.genotype] ?? GEN_COLORS.Unknown
  return (
    <Modal onClose={onClose}>
      <div className="modal-title"><i className="ti ti-hierarchy" style={{marginRight:6}}></i>가계도 — {mouse.mid} ({mouse.generation??'?'} · {mouse.line})</div>
      <div className="ped-wrap">
        <svg width={170} height={90} xmlns="http://www.w3.org/2000/svg">
          <rect x={10} y={10} width={150} height={70} rx={7} fill={c.fill} stroke={c.stroke} strokeWidth={2} />
          <text x={20} y={35} fontSize={13} fontWeight={500} fill={c.txt}>{mouse.mid}</text>
          <text x={20} y={52} fontSize={11} fill={mouse.sex==='M'?'#1a7f4b':'#b91c1c'}>{mouse.sex==='M'?'♂':'♀'} {mouse.generation??''}</text>
          <text x={20} y={68} fontSize={11} fill={c.txt}>{mouse.genotype??'Unknown'} · {mouse.line}</text>
        </svg>
      </div>
      <div style={{marginTop:10,padding:'8px 10px',background:'var(--info-bg)',borderRadius:8,fontSize:11,color:'var(--info-tx)'}}>
        <i className="ti ti-info-circle" style={{marginRight:5}}></i>
        전체 가계도: Supabase → Table Editor → <strong>mouse_parents</strong> 에서 child_id로 검색
      </div>
      <div className="fact"><button className="btn btn-primary" onClick={onClose}>닫기</button></div>
    </Modal>
  )
}
