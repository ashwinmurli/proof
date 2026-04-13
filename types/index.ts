export type ProjectMode = 'strategist' | 'client'

export type ProjectStatus = 'brief' | 'debrief' | 'research' | 'synthesis' | 'complete'

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  shareToken?: string
  createdAt: string
  updatedAt: string
  brief?: BriefData
  debrief?: DebriefData
}

export interface BriefAnswer {
  id: string
  value: string
  proofThought?: string
  committedAt?: string
}

export interface BriefData {
  answers: Record<string, BriefAnswer>
  completedAt?: string
}

export interface DebriefData {
  situation: string
  challenge: string
  angle: string
  completedAt?: string
}

export interface ProofMessage {
  id: string
  role: 'proof' | 'user'
  content: string
  createdAt: string
}

export interface BriefQuestion {
  id: string
  cat: string
  // Strategist-facing version
  text: string
  placeholder: string
  // Client-facing version
  clientText: string
  clientPlaceholder: string
}
