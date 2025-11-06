import * as FileSaver from 'file-saver'
import JSZip from 'jszip'
import { marked } from 'marked'
import type { AgentOSDoc, BacklogItem } from '../types/agentos'

export function toMarkdown(doc: AgentOSDoc) {
  const parts = doc.sections.map(s => `# ${s.title}\n\n${s.md || ''}\n`)
  return parts.join('\n')
}

export function toCSV(backlog: BacklogItem[]) {
  const rows = [['title','problem','outcome','acceptance_joined'].join(',')]
  backlog.forEach(b => {
    const acc = (b.acceptance || []).join(' | ')
    const cell = (v: string) => `"${(v || '').replace(/"/g,'""')}"`
    rows.push([cell(b.title||''), cell(b.problem||''), cell(b.outcome||''), cell(acc)].join(','))
  })
  return rows.join('\n')
}

export async function downloadZip(doc: AgentOSDoc) {
  const zip = new JSZip()
  zip.file('prd.json', JSON.stringify(doc, null, 2))
  zip.file('README.md', toMarkdown(doc))
  zip.file('backlog.csv', toCSV(doc.backlog || []))
  const blob = await zip.generateAsync({ type: 'blob' })
  FileSaver.saveAs(blob, 'prd.zip')
}

export function downloadJson(doc: AgentOSDoc) {
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
  FileSaver.saveAs(blob, 'prd.json')
}

export function downloadMarkdown(doc: AgentOSDoc) {
  const blob = new Blob([toMarkdown(doc)], { type: 'text/markdown' })
  FileSaver.saveAs(blob, 'README.md')
}

export function downloadCsv(backlog: BacklogItem[]) {
  const blob = new Blob([toCSV(backlog)], { type: 'text/csv' })
  FileSaver.saveAs(blob, 'backlog.csv')
}