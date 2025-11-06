import { useState } from 'react'
import type { AgentOSDoc, BacklogItem, LinkHint } from '../types/agentos'
import { AGENT_OS_SECTION_LIST } from '../constants/agentOSSections'
import { apiOutline, apiFeature } from '../services/api'

export default function Editor() {
  const [brief, setBrief] = useState('')
  const [links] = useState<LinkHint[]>([])
  const [doc, setDoc] = useState<AgentOSDoc | null>(null)
  const [backlog, setBacklog] = useState<BacklogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onGenerate() {
    setLoading(true); setError(null)
    try {
      const d = await apiOutline({ brief, links })
      setDoc(d); setBacklog(d.backlog || [])
    } catch (e:any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function onAddFeatureAI() {
    const t = prompt('Feature title?'); if (!t) return
    try {
      const f = await apiFeature({ title: t })
      setBacklog(prev => [...prev, f])
    } catch (e:any) { alert(e.message) }
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">PRD Genius — Agent-OS</h1>

      <div className="border rounded p-3 space-y-2">
        <label className="block text-sm font-medium">Brief</label>
        <textarea value={brief} onChange={e=>setBrief(e.target.value)} rows={6} className="w-full border rounded p-2" placeholder="Describe the product idea, goals, users, constraints..." />
        <button onClick={onGenerate} disabled={loading || brief.trim().length<10} className="px-3 py-2 rounded bg-black text-white">
          {loading ? 'Generating…' : 'Generate Agent-OS Blueprint'}
        </button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>

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
                      if (!doc) return
                      const updated = doc.sections.map(x => x.id===s.id ? { ...s, md: e.target.value } : x)
                      setDoc({ ...doc, sections: updated })
                    }}
                  />
                </div>
              )
            })}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Backlog</h2>
              <button className="px-2 py-1 text-sm rounded border" onClick={onAddFeatureAI}>+ Add Feature (AI)</button>
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
    </div>
  )
}
