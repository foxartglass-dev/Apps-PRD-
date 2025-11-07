import React, { useMemo, useState } from 'react'
import { loadPromptConfig, savePromptConfig, composePrompt, PromptConfig, PromptMode, TargetId } from '../config/promptModes'
import { runCopilot, CopilotParseError } from '../services/copilot';

type Props = {
  brief: string
  onClose: () => void
}

const small = { fontSize: 13, opacity: 0.8 }
const COPILOT_INSTRUCTION_KEY = 'prompt.copilot.lastInstruction';

const DiffView = ({ original, updated }: { original: PromptMode; updated: PromptMode }) => {
  const changes: React.ReactNode[] = [];
  const keys = Object.keys(original) as (keyof PromptMode)[];

  for (const key of keys) {
    const originalValue = original[key];
    const updatedValue = updated[key];

    if (JSON.stringify(originalValue) !== JSON.stringify(updatedValue)) {
      changes.push(
        <div key={key} className="diff-item">
          <strong className="diff-key">{key}</strong>
          <div>
            <pre className="diff-removed">- {JSON.stringify(originalValue, null, 2)}</pre>
            <pre className="diff-added">+ {JSON.stringify(updatedValue, null, 2)}</pre>
          </div>
        </div>
      );
    }
  }

  if (changes.length === 0) {
    return <p className="text-sm text-gray-400">No functional changes detected in the JSON structure.</p>;
  }

  return <div className="diff-container">{changes}</div>;
};


export default function PromptComposer({ brief, onClose }: Props) {
  const [cfg, setCfg] = useState<PromptConfig>(() => loadPromptConfig())
  const mode = useMemo(() => cfg.modes.find(m => m.id === cfg.activeModeId)!, [cfg])
  const [extraTasks, setExtraTasks] = useState('')
  
  // Copilot state
  const [instruction, setInstruction] = useState(() => localStorage.getItem(COPILOT_INSTRUCTION_KEY) || '');
  const [isCopilotRunning, setIsCopilotRunning] = useState(false);
  const [copilotResult, setCopilotResult] = useState<{ updatedMode: PromptMode; notes: string } | null>(null);
  const [copilotError, setCopilotError] = useState<{ message: string; rawText?: string } | null>(null);

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

  const handleInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInstruction(value);
    localStorage.setItem(COPILOT_INSTRUCTION_KEY, value);
  };

  const handleRunCopilot = async () => {
    if (!instruction.trim()) return;
    setIsCopilotRunning(true);
    setCopilotResult(null);
    setCopilotError(null);
    try {
      const result = await runCopilot({
        modeJson: JSON.stringify(mode, null, 2),
        instruction,
      });
      setCopilotResult(result);
    } catch (e: any) {
      setCopilotError({ message: e.message, rawText: e.rawText });
    } finally {
      setIsCopilotRunning(false);
    }
  };

  const handleApplyCopilotChanges = () => {
    if (!copilotResult) return;
    updateMode(copilotResult.updatedMode);
    setCopilotResult(null);
  };

  const handleDiscardCopilotChanges = () => {
    setCopilotResult(null);
    setCopilotError(null);
  };

  return (
    <>
     <style>{`
        .prompt-composer { position: fixed; inset: 5%; background:#1f2937; color: #f9fafb; border:1px solid #374151; border-radius:12px; z-index:10000; display:flex; flex-direction:column; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .pc-head { display:flex; align-items:center; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #374151; }
        .pc-head h3 { font-weight: 600; font-size: 1.1rem; }
        .pc-columns { flex:1; display:grid; grid-template-columns: 1fr 1fr; gap:16px; padding:16px; overflow:hidden; }
        .pc-col { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-right: 8px; }
        .pc-col-right { display: flex; flex-direction: column; overflow: hidden; }
        .pc-col label { display:block; font-size: 0.9rem; }
        .pc-col textarea, .pc-col select, .pc-col input[type=number] { width:100%; border: 1px solid #374151; background: #111827; color: #f9fafb; border-radius: 4px; padding: 6px 8px; font-size: 0.9rem; margin-top: 4px; }
        .pc-col textarea { min-height:84px; resize:vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.85rem; }
        .pc-inline { display:flex; flex-wrap: wrap; gap:12px; align-items:center; padding:8px; border:1px solid #374151; border-radius:8px; }
        .pc-inline legend { font-weight: 500; padding: 0 4px; font-size: 0.9rem; }
        .pc-inline label { display: flex; align-items: center; gap: 4px; }
        .pc-preview-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px }
        .pc-preview-head strong { font-weight: 600; }
        .pc-preview-head button, .pc-head button { background: #374151; border: 1px solid #4b5563; border-radius: 4px; padding: 4px 10px; color: #f9fafb; transition: background-color 0.2s; }
        .pc-preview-head button:hover, .pc-head button:hover { background-color: #4b5563; }
        .pc-preview { flex-grow: 1; min-height: 200px; resize:none; background:#111827; border:1px solid #374151; border-radius:8px; padding:10px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.85rem; }
        .copilot-panel { border-top: 1px solid #374151; padding-top: 12px; margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
        .copilot-title { font-size: 1.1rem; font-weight: 600; }
        .copilot-panel textarea { min-height: 60px; }
        .copilot-panel button { background: #374151; border: 1px solid #4b5563; color: #f9fafb; padding: 6px 12px; border-radius: 4px; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .copilot-panel button:disabled { opacity: 0.5; cursor: not-allowed; }
        .copilot-error { background: #4b1f24; border: 1px solid #ef4444; padding: 8px; border-radius: 4px; font-size: 0.9rem; }
        .copilot-error details { margin-top: 8px; }
        .copilot-error pre { white-space: pre-wrap; word-break: break-all; max-height: 100px; overflow-y: auto; background: #111827; padding: 4px; }
        .copilot-result { display: flex; flex-direction: column; gap: 8px; }
        .copilot-result h5 { font-size: 1rem; font-weight: 600; margin: 0; }
        .copilot-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
        .copilot-actions button:first-of-type { background-color: transparent; border-color: #4b5563; }
        .diff-container { background: #111827; border: 1px solid #374151; border-radius: 4px; padding: 8px; max-height: 200px; overflow-y: auto; font-family: ui-monospace, monospace; font-size: 0.8rem; }
        .diff-item { margin-bottom: 8px; border-bottom: 1px solid #374151; padding-bottom: 8px; }
        .diff-item:last-child { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }
        .diff-key { color: #9ca3af; }
        .diff-removed { color: #fca5a5; white-space: pre-wrap; word-break: break-all; }
        .diff-added { color: #86efac; white-space: pre-wrap; word-break: break-all; }
        .spinner { width: 16px; height: 16px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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

          <div className="pc-col-right">
            <div className="pc-preview-head">
              <strong>Composed Prompt Preview</strong>
              <button onClick={copyAll}>Copy</button>
            </div>
            <textarea className="pc-preview" readOnly value={preview}/>
            <div style={small}>Preview includes your current Brief inserted in place of {'{{BRIEF}}'}.</div>
            
            <div className="copilot-panel">
              <h4 className="copilot-title">Copilot</h4>
              
              {copilotError && (
                <div className="copilot-error">
                  <strong>Error:</strong> {copilotError.message}
                  {copilotError.rawText && (
                    <details>
                      <summary>Show raw response</summary>
                      <pre>{copilotError.rawText}</pre>
                    </details>
                  )}
                   <button onClick={handleDiscardCopilotChanges} style={{marginTop: '8px', fontSize: '0.8rem', padding: '2px 6px'}}>Dismiss</button>
                </div>
              )}

              {!copilotResult && !copilotError && (
                <>
                  <textarea
                    value={instruction}
                    onChange={handleInstructionChange}
                    rows={3}
                    placeholder="e.g., Make it stricter and sprinkle twice in the middle..."
                  />
                  <button onClick={handleRunCopilot} disabled={isCopilotRunning || !instruction.trim()}>
                    {isCopilotRunning ? <div className="spinner" /> : 'Run Copilot'}
                  </button>
                </>
              )}

              {copilotResult && (
                <div className="copilot-result">
                  <h5>Suggested Changes</h5>
                  <p className="text-sm italic text-gray-400">{copilotResult.notes}</p>
                  <DiffView original={mode} updated={copilotResult.updatedMode} />
                  <div className="copilot-actions">
                    <button onClick={handleDiscardCopilotChanges}>Discard</button>
                    <button onClick={handleApplyCopilotChanges}>Apply Changes</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
