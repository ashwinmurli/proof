import { BriefQuestion } from '@/types'

export const BRIEF_QUESTIONS: BriefQuestion[] = [
  {
    id: 'why',
    cat: 'Context',
    text: 'Why does this brand need work right now? What changed, or what was never right?',
    placeholder: 'Take your time. The real reason is usually underneath the first answer.',
    clientText: 'What made you decide this was the right moment to work on your brand?',
    clientPlaceholder: 'There\'s no wrong answer. Start wherever feels natural.',
  },
  {
    id: 'belief',
    cat: 'Conviction',
    text: 'Describe something this founder or company believes that most people in their category don\'t.',
    placeholder: 'Not a value. A specific, arguable belief.',
    clientText: 'What does your company believe that most others in your space wouldn\'t say out loud?',
    clientPlaceholder: 'The thing you\'d defend even if it cost you some customers.',
  },
  {
    id: 'decision',
    cat: 'Character',
    text: 'Describe a decision this company made that nobody outside would have made the same way.',
    placeholder: 'A real moment. Not a policy.',
    clientText: 'Tell us about a decision you made that surprised people — or that only made sense if you knew what you stood for.',
    clientPlaceholder: 'A real moment, not a principle.',
  },
  {
    id: 'audience',
    cat: 'Audience',
    text: 'Who would be furious if this brand disappeared — and why?',
    placeholder: 'Not your target demographic. The people who actually need this.',
    clientText: 'Who would miss you most if you disappeared tomorrow — and what would they lose?',
    clientPlaceholder: 'Think beyond your best customers. Who genuinely needs what you do.',
  },
  {
    id: 'ambition',
    cat: 'Ambition',
    text: 'What does success look like in five years? Be uncomfortably specific.',
    placeholder: 'Not revenue. What exists in the world that doesn\'t now.',
    clientText: 'Five years from now, what exists in the world because of you that doesn\'t exist today?',
    clientPlaceholder: 'Not a number. What is different.',
  },
]
