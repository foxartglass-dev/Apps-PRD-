import { useEffect, useRef, useState } from 'react'
import type { AgentOSDoc, BacklogItem, LinkHint, Section } from '../types/agentos'
import { AGENT_OS_SECTION_LIST } from '../constants/agentOSSections'
import { apiOutline, apiFeature } from '../services/api'
import { apiRefineSection } from '../services/refine'
import { apiRice } from '../services/ranking'
import { downloadZip, downloadJson, downloadMarkdown, downloadCsv } from '../utils/export'
import { saveLocal, loadLocal, saveSnapshot, listSnapshots, loadSnapshot } from '../utils/local'
import { loadConfig, type RuntimeConfig } from '../config/runtime'
import { SettingsDrawer } from '../components/SettingsDrawer'
import { CogIcon } from '../components/icons/CogIcon'
import { onInflight, createStopwatch } from '../services/http'
import useAutoResize, { resizeTextarea } from '../hooks/useAutoResize'
import FabScrollBottom from '../components/FabScrollBottom'

const BRIEF_KEY = 'prd_brief_v1'

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const ss = String(s % 60).padStart(2, '0')
  return `${m}:${ss}`
}

export default function Editor() {
  const [brief, setBrief] = useState('')
  const [links] = useState<LinkHint[]>([])
  const [doc, setDoc] = useState<AgentOSDoc | null>(null)
  const [backlog, setBacklog] = useState<BacklogItem[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const [snaps, setSnaps] = useState<{ id: string; ts: number; title: string }[]>([])
  const [config, setConfig] = useState(loadConfig());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [inflightCount, setInflightCount] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const stopwatch = useRef<ReturnType<typeof createStopwatch> | null>(null);
  const [toast, setToast] = useState<{ key: number; msg: string; details?: string } | null>(null);
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);
  const toastKeyRef = useRef(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingFeature, setIsAddingFeature] = useState(false);
  const [refiningSectionId, setRefiningSectionId] = useState<string | null>(null)
  const [scoringItemIndex, setScoringItemIndex] = useState<number | null>(null)

  useAutoResize('.autoresize');

  useEffect(() => {
    const existingDoc = loadLocal()
    if (existingDoc) {
      setDoc(existingDoc)
      setBacklog(existingDoc.backlog || [])
    }
    const existingBrief = localStorage.getItem(BRIEF_KEY)
    if (existingBrief) {
      setBrief(existingBrief)
    }
    setSnaps(listSnapshots())

    const unsub = onInflight(n => {
      setInflightCount(n)
      if (n > 0 && !stopwatch.current) {
        stopwatch.current = createStopwatch()
        const unsubStopwatch = stopwatch.current.subscribe(ms => setElapsedMs(ms))
        ;(stopwatch.current as any)._unsub = unsubStopwatch;
      }
      if (n === 0 && stopwatch.current) {
        stopwatch.current.stop()
        ;(stopwatch.current as any)._unsub?.()
        stopwatch.current = null
        setElapsedMs(0)
      }
    });
    return unsub;
  }, [])

  function persist(next: AgentOSDoc) {
    setDoc(next)
    saveLocal(next)
  }

  function handleBriefChange(value: string) {
    setBrief(value)
    localStorage.setItem(BRIEF_KEY, value)
  }

  function showError(msg: string, details?: string, retry?: () => void) {
    toastKeyRef.current += 1
    setToast({ key: toastKeyRef.current, msg, details })
    setLastAction(() => (retry ? retry : null))
  }

  async function onGenerate() {
    if (isGenerating) return;
    const handler = async () => {
        setIsGenerating(true);
        setToast(null);
        try {
          const d = await apiOutline({ brief, links })
          persist({ sections: d.sections, backlog: d.backlog || [] })
          setBacklog(d.backlog || [])
        } catch (e: any) {
          const m = String(e?.message || e);
          const det = (e?.stack || '') as string;
          showError(m.includes('timeout') ? `Timeout after ${fmt(elapsedMs)}` : m, det, handler);
        } finally {
          setIsGenerating(false)
        }
    };
    handler();
  }

  async function onAddFeatureAI() {
    if (isAddingFeature) return;
    const t = prompt('Feature title?'); if (!t) return
    
    const handler = async () => {
        setIsAddingFeature(true);
        setToast(null);
        try {
          const f = await apiFeature({ title: t, context: brief })
          const currentDoc = doc || { sections: [], backlog: [] };
          const newBacklog = [...(currentDoc.backlog || []), f];
          const next = { ...currentDoc, backlog: newBacklog };
          setBacklog(newBacklog); 
          persist(next);
        } catch (e: any) {
            const m = String(e?.message || e);
            const det = (e?.stack || '') as string;
            showError(m.includes('timeout') ? `Timeout after ${fmt(elapsedMs)}` : m, det, handler);
        } finally {
            setIsAddingFeature(false);
        }
    };
    handler();
  }

  async function onRefineSection(section: Section) {
    if (refiningSectionId || !doc) return
    const handler = async () => {
      setRefiningSectionId(section.id)
      setToast(null);
      try {
        const res = await apiRefineSection({ sectionId: section.id as any, currentMd: section.md, brief })
        const updatedSections = doc.sections.map(s => s.id === res.sectionId ? { ...s, md: res.md } : s)
        persist({ ...doc, sections: updatedSections })
      } catch (e: any) {
        const m = String(e?.message || e);
        const det = (e?.stack || '') as string;
        showError(m.includes('timeout') ? `Timeout after ${fmt(elapsedMs)}` : m, det, handler);
      } finally {
        setRefiningSectionId(null)
      }
    };
    handler();
  }

  async function onScoreItem(item: BacklogItem, index: number) {
    if (scoringItemIndex !== null) return
    const handler = async () => {
        setScoringItemIndex(index)
        setToast(null);
        try {
          const riceScore = await apiRice({ title: item.title, context: brief })
          const newBacklog = [...backlog]
          newBacklog[index] = { ...newBacklog[index], rice: riceScore }
          setBacklog(newBacklog)
          persist({ ...(doc!), backlog: newBacklog })
        } catch (e: any) {
          const m = String(e?.message || e);
          const det = (e?.stack || '') as string;
          showError(m.includes('timeout') ? `Timeout after ${fmt(elapsedMs)}` : m, det, handler);
        } finally {
          setScoringItemIndex(null)
        }
    };
    handler();
  }

  function onSortByRice() {
    const sorted = [...backlog].sort((a, b) => {
      const scoreA = a.rice?.score ?? -Infinity
      const scoreB = b.rice?.score ?? -Infinity
      return scoreB - scoreA
    })
    setBacklog(sorted)
    persist({ ...(doc!), backlog: sorted })
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
  
  const handleConfigChange = (newConfig: RuntimeConfig) => {
    setConfig(newConfig);
  };

  function expandAllTextareas() {
    const nodes = document.querySelectorAll<HTMLTextAreaElement>('textarea.autoresize')
    nodes.forEach((el) => resizeTextarea(el))
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      <FabScrollBottom />
      <style>{`
        .hud { position:fixed; top:0; left:0; right:0; display:flex; gap:8px; align-items:center; padding:6px 10px; background:rgba(0,0,0,0.35); backdrop-filter: blur(4px); z-index:9999 }
        .hud .bar { height:3px; flex:1; background: linear-gradient(90deg,#60a5fa,#a78bfa,#60a5fa); background-size:200% 100%; animation:shine 1.2s linear infinite }
        .hud .tm { color:#fff; font-weight:600; font-size: 0.8rem; }
        @keyframes shine { 0%{background-position:0 0} 100%{background-position:-200% 0} }

        .toast.error { position:fixed; right:16px; bottom:16px; background:#1f2937; color:#fff; padding:12px 14px; border-radius:10px; border:1px solid #374151; max-width:420px; z-index:10000 }
        .toast button { margin-left:8px; background: #374151; padding: 4px 8px; border-radius: 4px; }
        .toast button:hover { background: #4b5563; }
        .toast details { margin-top: 8px; font-size: 0.8em; color: #9ca3af; }
        .toast pre { white-space: pre-wrap; word-break: break-all; max-height: 150px; overflow-y: auto; background: #111827; padding: 8px; border-radius: 4px; margin-top: 4px; }

        textarea.autoresize { overflow: hidden; }
      `}</style>
      {inflightCount > 0 && (
        <div className="hud">
            <div className="bar" />
            <span className="tm">Elapsed {fmt(elapsedMs)}</span>
        </div>
      )}
      {toast && (
        <div className="toast error" key={toast.key}>
          <strong>Request failed:</strong> {toast.msg}
          {toast.details && <details><summary>Details</summary><pre>{toast.details.slice(0, 2000)}</pre></details>}
          <div>
            {lastAction && <button onClick={() => { setToast(null); lastAction?.() }}>Retry</button>}
            <button onClick={() => setToast(null)}>Dismiss</button>
          </div>
        </div>
      )}
      <h1 className="text-xl font-semibold">PRD Genius — Agent-OS</h1>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={onGenerate} disabled={isGenerating || brief.trim().length < 10} className="px-3 py-2 rounded bg-black text-white flex items-center gap-2 disabled:opacity-70">
          {isGenerating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
          {isGenerating ? 'Generating…' : 'Generate Blueprint'}
        </button>
        <button onClick={onAddFeatureAI} disabled={isAddingFeature} className="px-3 py-2 rounded border flex items-center gap-2 disabled:opacity-70">
           {isAddingFeature && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
          + Feature (AI)
        </button>
        <button onClick={expandAllTextareas} className="px-3 py-2 rounded border">Expand All</button>
        <button onClick={() => doc && downloadZip(doc)} className="px-3 py-2 rounded border">Export ZIP</button>
        <button onClick={() => doc && downloadJson(doc)} className="px-3 py-2 rounded border">Export JSON</button>
        <button onClick={() => doc && downloadMarkdown(doc)} className="px-3 py-2 rounded border">Export MD</button>
        <button onClick={() => downloadCsv(backlog)} className="px-3 py-2 rounded border">Export CSV</button>
        <button onClick={onSaveSnapshot} className="px-3 py-2 rounded border">Save Snapshot</button>
        <label className="px-3 py-2 rounded border cursor-pointer">
          Import JSON
          <input ref={fileRef} type="file" accept="application/json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onImportJson(f); if (fileRef.current) fileRef.current.value = '' }}
          />
        </label>
        <div className="flex-1"></div>
        {config.studioMode && (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800">
            Studio Mode
          </span>
        )}
        <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded border" title="Settings">
          <CogIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Brief */}
      <div className="border rounded p-3 space-y-2">
        <label className="block text-sm font-medium">Brief</label>
        <textarea value={brief} onChange={e => handleBriefChange(e.target.value)} rows={5} className="w-full border rounded p-2 autoresize" placeholder="Describe the product idea, goals, users, constraints..." />
      </div>

      {/* Sections + Backlog */}
      {doc && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h2 className="font-semibold">Sections</h2>
            {AGENT_OS_SECTION_LIST.map(meta => {
              const s = doc.sections.find(x => x.id === meta.id) || { id: meta.id, title: meta.title, md: '' }
              const isRefiningThis = refiningSectionId === s.id
              return (
                <div key={meta.id} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{s.title}</div>
                    <button onClick={() => onRefineSection(s)} disabled={!!refiningSectionId} className="px-2 py-1 text-sm rounded border flex items-center gap-1 disabled:opacity-50">
                      {isRefiningThis && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
                      Refine (AI)
                    </button>
                  </div>
                  <textarea
                    className="w-full border rounded p-2 autoresize"
                    rows={8}
                    defaultValue={s.md}
                    onBlur={(e) => {
                      const updated = (doc?.sections || []).map(x => x.id === s.id ? { ...s, md: e.target.value } : x)
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
              <div className="flex items-center gap-2">
                <button onClick={onSortByRice} className="px-2 py-1 text-sm rounded border disabled:opacity-50" disabled={backlog.every(b => !b.rice)}>Sort by RICE</button>
                <div className="text-sm text-gray-600">{backlog.length} items</div>
              </div>
            </div>
            {backlog.length ? backlog.map((b, i) => {
              const isScoringThis = scoringItemIndex === i;
              return (
                <div key={i} className="border rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium pr-2">
                      {b.title}
                      {b.rice && <span className="text-xs text-gray-400 ml-2 font-normal">· RICE: {b.rice.score.toFixed(1)}</span>}
                    </div>
                    <button onClick={() => onScoreItem(b, i)} disabled={scoringItemIndex !== null} className="text-xs px-2 py-1 border rounded flex items-center gap-1 disabled:opacity-50 whitespace-nowrap">
                      {isScoringThis && <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
                      Score (RICE)
                    </button>
                  </div>
                  {b.problem && <p className="text-sm mt-1">{b.problem}</p>}
                  {b.outcome && <p className="text-sm mt-1 italic">{b.outcome}</p>}
                  {b.acceptance?.length ? (
                    <ul className="list-disc ml-6 text-sm mt-2">
                      {b.acceptance.map((a, j) => <li key={j}>{a}</li>)}
                    </ul>
                  ) : null}
                </div>
              )
            }) : <div className="text-sm text-gray-600">No features yet.</div>}
          </div>
        </div>
      )}

      {/* Snapshots */}
      <div id="combined-export-anchor" />
      <div className="border rounded p-3">
        <div className="font-semibold mb-2">Snapshots</div>
        {snaps.length ? (
          <ul className="text-sm space-y-1">
            {snaps.map(s => (
              <li key={s.id} className="flex items-center justify-between">
                <span>{new Date(s.ts).toLocaleString()} — {s.title}</span>
                <button className="px-2 py-1 border rounded" onClick={() => onLoadSnapshot(s.id)}>Load</button>
              </li>
            ))}
          </ul>
        ) : <div className="text-sm text-gray-600">No snapshots yet.</div>}
      </div>
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfigChange={handleConfigChange}
      />
    </div>
  )
}
