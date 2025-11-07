import React, { useMemo, useState } from 'react'
import { loadPromptConfig, savePromptConfig, composePrompt, PromptConfig, PromptMode, TargetId } from '../config/promptModes'

type Props = {
  brief: string
  onClose: () => void
}

const small = { fontSize: 13, opacity: 0.8 }

export default function PromptComposer({ brief, onClose }: Props) {
  const [cfg, setCfg] = useState<PromptConfig>(() => loadPromptConfig())
  const mode = useMemo(() => cfg.modes.find(m => m.id === cfg.activeModeId)!, [cfg])
  const [extraTasks, setExtraTasks] = useState('')

  function updateMode(next: Partial<PromptMode>) {
    const idx = cfg.modes.findIndex(m => m.id === cfg.activeModeId)
    if (idx < 0) return
    const updated: PromptMode = { ...cfg.modes[idx], ...next } as PromptMode
    const nextCfg: PromptConfig = { ...cfg, modes: cfg.modes.map((m, i) => i === idx ? updated : m) }
    setCfg(savePromptConfig(nextCfg))
  }

  function setActive(id: TargetId) {
    const nextCfg: PromptConfig = { ...cfg, activeModeId: id }
    setCfg(savePromptConfig(nextCfg))
  }

  const preview = useMemo(() => composePrompt({ mode, brief, extraTasks }), [mode, brief, extraTasks])

  async function copyAll() {
    await navigator.clipboard.writeText(preview)
    alert('Copied to clipboard!');
  }

  return (
    <>
     <style>{`
        .prompt-composer { position: fixed; inset: 5%; background:#1f2937; color: #f9fafb; border:1px solid #374151; border-radius:12px; z-index:10000; display:flex; flex-direction:column; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .pc-head { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #374151; }
        .pc-head h3 { font-weight: 600; font-size: 1.1rem; }
        .pc-row { padding:10px 16px; border-bottom:1px solid #374151; }
        .pc-columns { flex:1; display:grid; grid-template-columns: 1fr 1fr; gap:16px; padding:16px; overflow:hidden; }
        .pc-col { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-right: 8px; }
        .pc-col label { display:block; font-size: 0.9rem; }
        .pc-col textarea, .pc-col select, .pc-col input[type=number] { width:100%; border: 1px solid #374151; background: #111827; color: #f9fafb; border-radius: 4px; padding: 6px 8px; font-size: 0.9rem; margin-top: 4px; }
        .pc-col textarea { min-height:84px; resize:vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.85rem; }
        .pc-inline { display:flex; flex-wrap: wrap; gap:12px; align-items:center; padding:8px; border:1px solid #374151; border-radius:8px; }
        .pc-inline legend { font-weight: 500; padding: 0 4px; font-size: 0.9rem; }
        .pc-inline label { display: flex; align-items: center; gap: 4px; }
        .pc-preview-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px }
        .pc-preview-head strong { font-weight: 600; }
        .pc-preview-head button, .pc-head button { background: #374151; border: 1px solid #4b5563; border-radius: 4px; padding: 4px 10px; color: #f9fafb; }
        .pc-preview { flex: 1; resize:none; background:#111827; border:1px solid #374151; border-radius:8px; padding:10px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.85rem; }
      `}</style>
      <div className="prompt-composer">
        <div className="pc-head">
          <h3>Prompt Builder</h3>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="pc-columns">
          <div className="pc-col">
            <label>
              <div>Target / Mode</div>
              <select value={cfg.activeModeId} onChange={(e)=>setActive(e.target.value as TargetId)}>
                {cfg.modes.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>

            <label><div>Preamble</div>
              <textarea value={mode.preamble} onChange={e=>updateMode({ preamble: e.target.value })}/>
            </label>

            <label><div>Enforcement (no placeholders)</div>
              <textarea value={mode.enforcement} onChange={e=>updateMode({ enforcement: e.target.value })}/>
              <div style={small}>This is sprinkled at positions you choose below.</div>
            </label>

            <fieldset className="pc-inline">
              <legend>Sprinkle</legend>
              <label><input type="checkbox" checked={mode.sprinkle.positions.includes('head')} onChange={e=>{
                const set = new Set(mode.sprinkle.positions); e.target.checked ? set.add('head') : set.delete('head')
                updateMode({ sprinkle: { ...mode.sprinkle, positions: Array.from(set) } })
              }}/> Head</label>
              <label><input type="checkbox" checked={mode.sprinkle.positions.includes('middle')} onChange={e=>{
                const set = new Set(mode.sprinkle.positions); e.target.checked ? set.add('middle') : set.delete('middle')
                updateMode({ sprinkle: { ...mode.sprinkle, positions: Array.from(set) } })
              }}/> Middle</label>
              <label><input type="checkbox" checked={mode.sprinkle.positions.includes('tail')} onChange={e=>{
                const set = new Set(mode.sprinkle.positions); e.target.checked ? set.add('tail') : set.delete('tail')
                updateMode({ sprinkle: { ...mode.sprinkle, positions: Array.from(set) } })
              }}/> Tail</label>
              <label style={{marginLeft:12}}>
                repeats (middle):
                <input type="number" min={0} max={5} value={mode.sprinkle.repeatsPerMiddle ?? 0}
                  onChange={e=>updateMode({ sprinkle: { ...mode.sprinkle, repeatsPerMiddle: Number(e.target.value||0) } })} style={{width:64, marginLeft:6}}/>
              </label>
            </fieldset>

            <fieldset className="pc-inline">
              <legend>Connection Points</legend>
              {(['scaffoldBackendEndpoints','returnDiffSummary','returnFinalSrcTree','addFrontendWiringNotes','addBackendAttachmentStubs'] as const).map(k=>(
                <label key={k}><input type="checkbox" checked={(mode.connectionPoints as any)[k] || false}
                  onChange={e=>updateMode({ connectionPoints: { ...mode.connectionPoints, [k]: e.target.checked } })}/> {k.replace(/([A-Z])/g, ' $1').trim()}</label>
              ))}
            </fieldset>

            <label><div>Body Template</div>
              <textarea value={mode.bodyTemplate} onChange={e=>updateMode({ bodyTemplate: e.target.value })}/>
              <div style={small}>Tokens: {'{{BRIEF}}'}, {'{{TASKS}}'}</div>
            </label>

            <label><div>Closing</div>
              <textarea value={mode.closing} onChange={e=>updateMode({ closing: e.target.value })}/>
            </label>

            <label><div>Extra Tasks (optional)</div>
              <textarea value={extraTasks} onChange={e=>setExtraTasks(e.target.value)} placeholder="Any one-off tasks to include"/>
            </label>
          </div>

          <div className="pc-col">
            <div className="pc-preview-head">
              <strong>Composed Prompt Preview</strong>
              <button onClick={copyAll}>Copy</button>
            </div>
            <textarea className="pc-preview" readOnly value={preview}/>
            <div style={small}>Preview includes your current Brief inserted in place of {'{{BRIEF}}'}.</div>
          </div>
        </div>
      </div>
    </>
  )
}
