import { Project } from '@/types'
import { BRIEF_QUESTIONS } from './questions'

export function buildSynthesisContext(project: Project): string {
  const parts: string[] = []

  parts.push(`Project: ${project.name} — ${project.description}`)

  // Brief answers
  const briefAnswers = BRIEF_QUESTIONS
    .filter(q => project.brief?.answers?.[q.id]?.value?.trim())
    .map(q => `${q.cat}: ${project.brief!.answers![q.id].value}`)
  if (briefAnswers.length) {
    parts.push('Brief:\n' + briefAnswers.join('\n\n'))
  }

  // Brief summary
  if (project.brief?.proofSummary) {
    parts.push('proof. on the brief:\n' + project.brief.proofSummary)
  }

  // Debrief
  if (project.debrief?.situation) {
    parts.push(`Debrief:\nSituation: ${project.debrief.situation}\nChallenge: ${project.debrief.challenge}\nAngle: ${project.debrief.angle}`)
  }

  // Debrief summary
  if (project.debrief?.proofSummary) {
    parts.push('proof. on the debrief:\n' + project.debrief.proofSummary)
  }

  // Discovery Summary — the closing statement of Discovery
  if (project.discoverySummary) {
    parts.push('Discovery Summary:\n' + project.discoverySummary)
  }

  // Synthesis so far
  const s = project.synthesis
  if (!s) return parts.join('\n\n---\n\n')

  if (s.beliefs?.belief) {
    parts.push(`What we believe: ${s.beliefs.belief}\nWhat we're building: ${s.beliefs.building}\nHow we work: ${s.beliefs.working}`)
  }

  if (s.values?.length) {
    const vals = s.values.map(v => `${v.name}: ${v.definition}. In practice: ${v.behaviour}`).join('\n')
    parts.push(`Values:\n${vals}`)
  }

  if (s.personality?.tensions?.length) {
    parts.push(`Personality tensions: ${s.personality.tensions.join(' / ')}`)
  }

  if (s.tone?.poleA) {
    parts.push(`Tone: between ${s.tone.poleA} and ${s.tone.poleB}`)
  }

  if (s.naming?.chosen) {
    parts.push(`Brand name: ${s.naming.chosen}`)
  }

  if (s.tagline?.chosen) {
    parts.push(`Tagline: ${s.tagline.chosen}`)
  }

  return parts.join('\n\n---\n\n')
}
