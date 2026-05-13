import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/* ─── 공통 useQuery ─── */
function useQuery(fetcher, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const run = useCallback(async () => {
    setLoading(true); setError(null)
    const { data: d, error: e } = await fetcher()
    if (e) setError(e.message); else setData(d)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { run() }, [run])
  return { data, loading, error, refetch: run }
}

/* ─── Realtime ─── */
export function useRealtime(table, onAny) {
  useEffect(() => {
    const ch = supabase
      .channel('rt:' + table)
      .on('postgres_changes', { event: '*', schema: 'public', table }, onAny)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [table, onAny])
}

/* ─── Cages ─── */
export function useCages(line) {
  return useQuery(() => {
    let q = supabase.from('cages').select('*').order('num')
    if (line && line !== 'ALL') q = q.eq('line', line)
    return q
  }, [line])
}
export const createCage  = (d)      => supabase.from('cages').insert(d).select().single()
export const updateCage  = (id, d)  => supabase.from('cages').update(d).eq('id', id).select().single()
export const deleteCage  = (id)     => supabase.from('cages').delete().eq('id', id)

/* ─── Mice ─── */
export function useMice(line) {
  return useQuery(() => {
    let q = supabase.from('v_mice_full').select('*').order('mid')
    if (line && line !== 'ALL') q = q.eq('line', line)
    return q
  }, [line])
}
export const createMouse = (d)      => supabase.from('mice').insert(d).select().single()
export const updateMouse = (id, d)  => {
  const { cage_num, cage_type, ...safe } = d
  return supabase.from('mice').update(safe).eq('id', id).select().single()
}
export const deleteMouse = (id)     => supabase.from('mice').delete().eq('id', id)
export const setGenotype = (id, g)  => supabase.from('mice').update({ genotype: g }).eq('id', id)

/* ─── Litters ─── */
export function useLitters(line) {
  return useQuery(() => {
    let q = supabase.from('litters').select('*, cage:cage_id(num)').order('birth_date', { ascending: false })
    if (line && line !== 'ALL') q = q.eq('line', line)
    return q
  }, [line])
}
export const createLitter = (d) => supabase.from('litters').insert(d).select().single()

/* ─── Today tasks ─── */
export function useTodayTasks() {
  return useQuery(() =>
    supabase.from('v_today_tasks').select('*').order('days_until')
  )
}

/* ─── 수컷 분리 ─── */
export async function separateMale({ maleIds, newCageNum, line, notes }) {
  const { data: newCage, error: ce } = await supabase
    .from('cages')
    .insert({ num: newCageNum, type: 'male', line, notes })
    .select().single()
  if (ce || !newCage) return { error: ce }

  const { error: me } = await supabase
    .from('mice')
    .update({ cage_id: newCage.id, status: '생존' })
    .in('id', maleIds)

  return { data: newCage, error: me }
}

/* ─── Weaning ─── */
export async function weanLitter({ litterId, litLine, birthDate, generation, maleCageNum, femaleCageNum, pups, fatherId, motherId }) {
  const { data: mCage, error: mce } = await supabase
    .from('cages')
    .insert({ num: maleCageNum, type: 'male', line: litLine, notes: 'Weaning 수컷' })
    .select().single()
  if (mce || !mCage) return { error: mce }

  const { data: fCage, error: fce } = await supabase
    .from('cages')
    .insert({ num: femaleCageNum, type: 'female', line: litLine, notes: 'Weaning 암컷' })
    .select().single()
  if (fce || !fCage) return { error: fce }

  const mouseRows = pups.map(p => ({
    mid: p.mid,
    sex: p.sex,
    line: litLine,
    generation,
    dob: birthDate,
    status: '생존',
    cage_id: p.sex === 'M' ? mCage.id : fCage.id,
    litter_id: litterId,
    notes: p.notes,
  }))

  const { data: newMice, error: mie } = await supabase.from('mice').insert(mouseRows).select()
  if (mie || !newMice) return { error: mie }

  if (fatherId || motherId) {
    const parentRows = []
    for (const m of newMice) {
      if (fatherId) parentRows.push({ child_id: m.id, parent_id: fatherId, role: 'father' })
      if (motherId) parentRows.push({ child_id: m.id, parent_id: motherId, role: 'mother' })
    }
    if (parentRows.length) await supabase.from('mouse_parents').insert(parentRows)
  }

  await supabase.from('litters').update({ weaned: true }).eq('id', litterId)
  return { data: newMice, error: null }
}
