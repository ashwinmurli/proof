import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Project, ProofMessage, ProjectMode } from '@/types'

interface ProofStore {
  projects: Record<string, Project>
  activeProjectId: string | null
  mode: ProjectMode
  messages: ProofMessage[]
  activeQuestionId: string | null
  drawerOpen: boolean

  createProject: (name: string, description: string, language?: 'en' | 'nl') => string
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  setActiveProject: (id: string) => void
  setMode: (mode: ProjectMode) => void
  saveAnswer: (questionId: string, value: string) => void
  saveProofThought: (questionId: string, thought: string) => void
  addMessage: (message: Omit<ProofMessage, 'id' | 'createdAt'>) => void
  clearMessages: () => void
  setActiveQuestion: (id: string | null) => void
  setDrawerOpen: (open: boolean) => void
  generateShareToken: (id: string) => string
  getActiveProject: () => Project | null
}

export const useProofStore = create<ProofStore>()(
  persist(
    (set, get) => ({
      projects: {},
      activeProjectId: null,
      mode: 'strategist',
      messages: [],
      activeQuestionId: null,
      drawerOpen: false,

      createProject: (name, description, language = 'en') => {
        const id = crypto.randomUUID()
        const project: Project = {
          id,
          name: name || 'Untitled project',
          description,
          status: 'brief',
          language,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          brief: { answers: {} },
        }
        set(state => ({
          projects: { ...state.projects, [id]: project },
          activeProjectId: id,
        }))
        return id
      },

      updateProject: (id, updates) => {
        set(state => ({
          projects: {
            ...state.projects,
            [id]: {
              ...state.projects[id],
              ...updates,
              updatedAt: new Date().toISOString(),
            },
          },
        }))
      },

      deleteProject: (id) => {
        set(state => {
          const next = { ...state.projects }
          delete next[id]
          return {
            projects: next,
            activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
          }
        })
      },

      setActiveProject: (id) => set({ activeProjectId: id }),

      setMode: (mode) => set({ mode }),

      saveAnswer: (questionId, value) => {
        const { activeProjectId, projects } = get()
        if (!activeProjectId) return
        const project = projects[activeProjectId]
        if (!project) return
        set(state => ({
          projects: {
            ...state.projects,
            [activeProjectId]: {
              ...project,
              brief: {
                ...project.brief,
                answers: {
                  ...project.brief?.answers,
                  [questionId]: {
                    ...project.brief?.answers?.[questionId],
                    id: questionId,
                    value,
                  },
                },
              },
              updatedAt: new Date().toISOString(),
            },
          },
        }))
      },

      saveProofThought: (questionId, thought) => {
        const { activeProjectId, projects } = get()
        if (!activeProjectId) return
        const project = projects[activeProjectId]
        if (!project) return
        set(state => ({
          projects: {
            ...state.projects,
            [activeProjectId]: {
              ...project,
              brief: {
                ...project.brief,
                answers: {
                  ...project.brief?.answers,
                  [questionId]: {
                    ...project.brief?.answers?.[questionId],
                    id: questionId,
                    value: project.brief?.answers?.[questionId]?.value || '',
                    proofThought: thought,
                  },
                },
              },
            },
          },
        }))
      },

      addMessage: (message) => {
        const msg: ProofMessage = {
          ...message,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        }
        set(state => ({ messages: [...state.messages, msg] }))
      },

      clearMessages: () => set({ messages: [] }),

      setActiveQuestion: (id) => set({ activeQuestionId: id }),

      setDrawerOpen: (open) => set({ drawerOpen: open }),

      generateShareToken: (id) => {
        const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
        set(state => ({
          projects: {
            ...state.projects,
            [id]: {
              ...state.projects[id],
              shareToken: token,
              updatedAt: new Date().toISOString(),
            },
          },
        }))
        return token
      },

      getActiveProject: () => {
        const { activeProjectId, projects } = get()
        if (!activeProjectId) return null
        return projects[activeProjectId] || null
      },
    }),
    {
      name: 'proof-storage',
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
    }
  )
)
