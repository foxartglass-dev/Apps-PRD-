import { useEffect, useRef, useState } from 'react'
import type { AgentOSDoc, BacklogItem, LinkHint } from '../types/agentos'
import { AGENT_OS_SECTION_LIST } from '../constants/agentOSSections'
import { apiOutline, apiFeature } from '../services/api'
import { downloadZip, downloadJson, downloadMarkdown, downloadCsv } from '../utils/export'
import { saveLocal, loadLocal, saveSnapshot, listSnapshots, loadSnapshot } from '../utils/local'

export default function Editor() {
  const [brief, setBrief] = useState('')
  const [links] = useState<LinkHint[]>([])
  const [doc, setDoc] = useState<AgentOSDoc | null>(null)
  const [backlog, setBacklog] = useState<BacklogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [snaps, setSnaps] = useState<{id:string;ts:number;title:string}[]>([])

  useEffect(() => {
    const existing = loadLocal()
    if (existing) {
      setDoc(existing)
      setBacklog(existing.backlog || [])
    }
    setSnaps(listSnapshots())
  }, [])

  function persist(next: AgentOSDoc) {
    setDoc(next)
    saveLocal(next)
  }

  async function onGenerate() {
    setLoading(true); setError(null)
    try {
      const d = await apiOutline({ brief, links })
      persist({ sections: d.sections, backlog: d.backlog || [] })
      setBacklog(d.backlog || [])
    } catch (e:any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function onAddFeatureAI() {
    const t = prompt('Feature title?'); if (!t) return
    try {
      const f = await apiFeature({ title: t })
      const next = { ...(doc || { sections: [], backlog: [] }), backlog: [...backlog, f] }
      setBacklog(next.backlog); persist(next)
    } catch (e:any) { alert(e.message) }
  }

  function onSaveSnapshot() {
    if (!doc) return alert('Nothing to snapshot yet.')
    const title = prompt('Snapshot title?', new Date().toLocaleString()) || new Date().toLocaleString()
    saveSnapshot(doc, title)
    setSnaps(listSnapshots())
  }

  function onLoadSnapshot(id: string) {
    const next = loadSnapshot(id)
    if (!next) return alert('Snapshot missing.')
    setBacklog(next.backlog || [])
    persist(next)
  }

  function onImportJson(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const next = JSON.parse(String(reader.result)) as AgentOSDoc
        setBacklog(next.backlog || [])
        persist(next)
      } catch { alert('Invalid JSON file') }
    }
    reader.readAsText(file)
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">PRD Genius — Agent-OS</h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <button onClick={onGenerate} disabled={loading || brief.trim().length<10} className="px-3 py-2 rounded bg-black text-white">
          {loading ? 'Generating…' : 'Generate Blueprint'}
        </button>
        <button onClick={onAddFeatureAI} className="px-3 py-2 rounded border">+ Feature (AI)</button>
        <button onClick={()=>doc && downloadZip(doc)} className="px-3 py-2 rounded border">Export ZIP</button>
        <button onClick={()=>doc && downloadJson(doc)} className="px-3 py-2 rounded border">Export JSON</button>
        <button onClick={()=>doc && downloadMarkdown(doc)} className="px-3 py-2 rounded border">Export MD</button>
        <button onClick={()=>downloadCsv(backlog)} className="px-3 py-2 rounded border">Export CSV</button>
        <button onClick={onSaveSnapshot} className="px-3 py-2 rounded border">Save Snapshot</button>
        <label className="px-3 py-2 rounded border cursor-pointer">
          Import JSON
          <input ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={e=>{ const f=e.target.files?.[0]; if(f) onImportJson(f); if(fileRef.current) fileRef.current.value='' }}
          />
        </label>
      </div>

      {/* Brief */}
      <div className="border rounded p-3 space-y-2">
        <label className="block text-sm font-medium">Brief</label>
        <textarea value={brief} onChange={e=>setBrief(e.target.value)} rows={5} className="w-full border rounded p-2" placeholder="Describe the product idea, goals, users, constraints..." />
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>

      {/* Sections + Backlog */}
      {doc && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h2 className="font-semibold">Sections</h2>
            {AGENT_OS_SECTION_LIST.map(meta => {
              const s = doc.sections.find(x=>x.id===meta.id) || { id: meta.id, title: meta.title, md: '' }
              return (
                <div key={meta.id} className="border rounded p-3">
                  <div className="font-medium mb-2">{s.title}</div>
                  <textarea
                    className="w-full border rounded p-2"
                    rows={8}
                    defaultValue={s.md}
                    onBlur={(e) => {
                      const updated = (doc?.sections || []).map(x => x.id===s.id ? { ...s, md: e.target.value } : x)
                      const next = { ...(doc || { sections: [], backlog: [] }), sections: updated, backlog }
                      persist(next)
                    }}
                  />
                </div>
              )
            })}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Backlog</h2>
              <div className="text-sm text-gray-600">{backlog.length} items</div>
            </div>
            {backlog.length ? backlog.map((b,i)=>(
              <div key={i} className="border rounded p-3">
                <div className="font-medium">{b.title}</div>
                {b.problem && <p className="text-sm mt-1">{b.problem}</p>}
                {b.outcome && <p className="text-sm mt-1 italic">{b.outcome}</p>}
                {b.acceptance?.length ? (
                  <ul className="list-disc ml-6 text-sm mt-2">
                    {b.acceptance.map((a,j)=><li key={j}>{a}</li>)}
                  </ul>
                ) : null}
              </div>
            )) : <div className="text-sm text-gray-600">No features yet.</div>}
          </div>
        </div>
      )}

      {/* Snapshots */}
      <div className="border rounded p-3">
        <div className="font-semibold mb-2">Snapshots</div>
        {snaps.length ? (
          <ul className="text-sm space-y-1">
            {snaps.map(s => (
              <li key={s.id} className="flex items-center justify-between">
                <span>{new Date(s.ts).toLocaleString()} — {s.title}</span>
                <button className="px-2 py-1 border rounded" onClick={()=>onLoadSnapshot(s.id)}>Load</button>
              </li>
            ))}
          </ul>
        ) : <div className="text-sm text-gray-600">No snapshots yet.</div>}
      </div>
    </div>
  )
}
