export interface BrandIdentity {
  primaryColor?: string      // hex e.g. "#1E3F49"
  backgroundColor?: string   // hex e.g. "#F5F0E8"
  textColor?: string         // hex e.g. "#1A1816"
  accentColor?: string       // hex e.g. "#FF7E45"
  displayFont?: string       // Google Font name e.g. "Playfair Display"
  bodyFont?: string          // Google Font name e.g. "DM Sans"
  logoUrl?: string           // uploaded logo URL
}

export type ProjectMode = 'strategist' | 'client'

export type ProjectStatus = 'brief' | 'debrief' | 'research' | 'synthesis' | 'complete'

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  language: 'en' | 'nl'
  shareToken?: string
  createdAt: string
  updatedAt: string
  brief?: BriefData
  debrief?: DebriefData
  discoverySummary?: string
  synthesis?: SynthesisData
  identity?: BrandIdentity
}

export interface BriefAnswer {
  id: string
  value: string
  proofThought?: string
  committedAt?: string
}

export interface BriefData {
  answers: Record<string, BriefAnswer>
  proofSummary?: string
  completedAt?: string
}

export interface DebriefData {
  situation: string
  challenge: string
  angle: string
  proofSummary?: string
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
  catNl?: string
  // Strategist-facing version
  text: string
  placeholder: string
  textNl?: string
  placeholderNl?: string
  // Client-facing version
  clientText: string
  clientPlaceholder: string
  clientTextNl?: string
  clientPlaceholderNl?: string
}

export interface BeliefData {
  belief: string      // What we believe
  building: string    // What we're building
  working: string     // How we work
  proofSummary?: string
}

export interface Value {
  id: string
  name: string
  definition: string
  behaviour: string   // What it looks like in action
  proofChallenge?: string
}

export interface PersonalityData {
  tensions: string[]        // e.g. "Rigorous but never cold"
  dinner: string            // Brand at a dinner party
  difficult: string         // Brand in a difficult conversation
  decision: string          // Brand making a decision under pressure
  proofSummary?: string
}

export interface ToneData {
  poleA: string             // One end of the spectrum
  poleB: string             // Other end
  doesSoundLike: string     // Concrete example
  doesntSoundLike: string   // Concrete counter-example
  proofSummary?: string
}

export interface NamingData {
  territory: string         // The naming territory
  candidates: string[]      // Generated candidates
  chosen?: string           // Final name
  rationale?: string
}

export interface TaglineData {
  directions: string[]      // Strategic directions
  variations: string[]      // Variations per direction
  chosen?: string           // Locked tagline
}

export interface ManifestoData {
  prompts: Record<string, string>   // Fill-in-the-blank responses
  final?: string                     // Synthesised manifesto
}

export interface SynthesisData {
  contextSummary?: string
  beliefs?: BeliefData
  values?: Value[]
  personality?: PersonalityData
  tone?: ToneData
  naming?: NamingData
  tagline?: TaglineData
  manifesto?: ManifestoData
}
