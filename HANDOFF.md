# proof. — Handoff Document
*Last updated: April 2026*

---

## What this is

**proof.** is an AI-powered brand strategy tool. A creative director or strategist uses it to guide a client through Discovery (Brief → Debrief) and Synthesis (7 modules) to produce a complete brand foundation.

The AI partner is called **proof.** (lowercase, with period) — she has a point of view, challenges weak thinking, drafts from context, and responds to feedback. She speaks in short sentences, asks rather than tells, never flatters, never uses em dashes.

**Live URL:** https://proof-pi-umber.vercel.app  
**GitHub:** https://github.com/ashwinmurli/proof.git  
**Token:** ghp_RRnRfeHLmPSu363eWfLqBJMKdACNN0xx7pj  
**Stack:** Next.js 16, TypeScript, Tailwind CSS v4, Framer Motion, Zustand, Anthropic SDK  
**Deploy:** Push to main → Vercel auto-deploys (~30s)

---

## Codebase structure

```
/home/claude/proof/  (or clone from GitHub)

app/
  page.tsx                          — Homepage, recent projects
  layout.tsx
  globals.css                       — Design tokens, grain texture
  settings/page.tsx                 — API key storage in localStorage
  api/proof/route.ts                — Server-side streaming, reads x-proof-key header
  project/[id]/
    page.tsx                        — Project overview
    brief/page.tsx
    debrief/page.tsx
    synthesis/
      page.tsx                      — Synthesis overview with module nav
      beliefs/page.tsx
      values/page.tsx
      personality/page.tsx
      tone/page.tsx
      naming/page.tsx               — Stub (not yet built)
      tagline/page.tsx
      manifesto/page.tsx
  share/[token]/page.tsx            — Client-facing brief

components/
  proof/
    Strip.tsx                       — Sticky top nav, progress dots, Ask proof. button
    ProofDrawer.tsx                 — Floating panel, sentence-fade streaming, summary mode
    ProofButton.tsx                 — Reusable: mango dot + label, outline/solid variants
    ProofContext.tsx                — Single synthesised card (replaces two-card pattern)
  modules/
    BriefModule.tsx                 — 5 questions, floating active card, proof. notes
    DebriefModule.tsx               — proof. presents interpretation, push-back/revise flow
    synthesis/
      BeliefsModule.tsx             — What we believe / What we're building / How we work
      ValuesModule.tsx              — 3 values, stress test with verdict pills
      PersonalityModule.tsx         — Tension pairs with swappable poles, scenario carousel
      ToneModule.tsx                — Interactive spectrum selector, auto-updating examples
      TaglineModule.tsx             — Auto-generates directions+variations, select-to-refine
      ManifestoModule.tsx           — Fill-in-the-blank prompts, proof. synthesises

lib/
  questions.ts                      — 5 brief questions (strategist + client versions)
  prompts.ts                        — System prompts
  useProofStream.ts                 — Streaming hook, reads proof-api-key from localStorage
  useStreamSentences.ts             — Sentence-buffered streaming hook (built, not yet wired inline)
  synthesisContext.ts               — buildSynthesisContext() — full project context for API calls

store/index.ts                      — Zustand with localStorage persistence
types/index.ts                      — All types: Project, BriefData, DebriefData, SynthesisData, etc.
```

---

## Design system

**Palette:**
- `--mango` #FFA10A — proof.'s colour. Used only for proof.'s presence, buttons, dots
- `--marble` #EBE8E1
- `--bg` #F5F2EB — page background
- `--surface-0` #FAF8F4 — card surface (active floating card, scenario cards)
- `--surface-1` #EDE9E2 — secondary surface (tension pole chips, inactive)
- `--aluminum` #D5D4D6
- `--stone` #8C8780 — labels, secondary text
- `--concrete` #686562 — body text
- `--dark` #1A1816 — headings, primary text

**Typography:**
- Display/headings: Playfair Display (serif), italic for proof.'s short quotes only
- Body/UI: DM Sans, weight 300 for body text, 500 for labels
- Rule: **serif italic = short proof. quotes only** — all paragraphs, body text, proof. responses use DM Sans 300

**proof.'s visual identity:**
- Mango dot (5-6px) + label = proof. is present or being invoked
- `ProofButton` component: always has the dot, used for every action that invokes proof.
- Send button in drawer: mango circle (not dark)
- Summary labels: "On the beliefs", "On the project", etc. — never repeat "proof." twice

**Active question / floating card:**
```js
{
  background: '#FAF8F4',
  borderRadius: 12,
  padding: '28px 32px',
  marginLeft: -32,
  marginRight: -32,
  boxShadow: '0 1px 2px rgba(26,24,22,0.04), 0 4px 8px rgba(26,24,22,0.06), 0 16px 32px rgba(26,24,22,0.08), 0 0 0 0.5px rgba(26,24,22,0.05)',
}
```
Inactive questions: 38% opacity. Active: full opacity + lifted card.

**Grain texture:** CSS noise overlay on body, mix-blend-mode multiply, 0.028 opacity.

---

## Key interaction patterns

### Debrief pattern (proof. presents first)
1. proof. auto-generates Situation / Challenge / Angle on load
2. Renders as static italic prose (read mode)
3. Click text → switches to edit mode (textarea with autoFocus)
4. Action row below field: "Edit" pill | "● Ask proof. to revise" ProofButton
5. Active edit mode: "Done" pill | ⌘ Enter hint
6. Feedback panel: "proof. will rewrite this" header, textarea, "● Revise →" ProofButton
7. ⌘ Enter on last field → proof. summary in drawer panel

### Synthesis module pattern (all 7 modules)
- proof. drafts from `buildSynthesisContext()` (full project context) on load
- Same push-back / revise flow as Debrief
- ⌘ Enter → fetchSummary() → summary in drawer → Continue button
- **Stale closure fix:** all `handleAdvance` callbacks use a `summaryStateRef` to avoid capturing stale state

### ProofDrawer
- Summary mode: dims page, expands to 520px, sentences fade in one by one
- Normal mode: 380px, notes tab + ask tab
- `SentenceText` component: buffers streaming text, reveals complete sentences with opacity fade
- Close (×) always clears both `drawerOpen` and `summaryState`

### ProofContext card
- Single synthesised card (not two separate brief/debrief cards)
- On Debrief page: shows brief summary directly
- On Synthesis page: proof. synthesises brief + debrief summaries into one unified 3-4 sentence statement on first load, persists to `synthesis.contextSummary`

---

## Module-specific notes

### Beliefs (1/7)
- Three fields: "What we believe" / "What we're building" / "How we work"
- proof. drafts all three from context
- Summary label: "On the beliefs"

### Values (2/7)
- Exactly 3 values (not 5)
- Each: name (28px italic serif input) + definition + behaviour
- Stress test: ProofButton → proof. applies 3 hardest Motto questions
- **Verdict pills:** green (PASSES) / amber (NEEDS WORK) / red (fails)

### Personality (3/7) — most complex
- **Tension pairs:** 3 cards. Each card: `pos` chip | "but never" | `neg` chip + description below
- Click either pole → proof. generates 3 context-specific alternatives + freeform input
- Selecting an alternative triggers `regenerateDesc()` to update the explanation
- **Scenario carousel:** 3 cards (300px wide), horizontal scroll with `marginLeft: -24` breakout
- **Auto-examples:** generated on load without button click. "New example" to regenerate.
- Brand name used in labels: "Keel at a dinner party"

### Tone (4/7)
- proof. generates 3 options per pole as clickable chips
- Selecting a different pole auto-regenerates the "sounds like / doesn't sound like" examples (800ms debounce)
- Existing data: `generateOptions()` fetches alternatives if `poleOptions` is empty

### Naming (5/7)
- **Not yet built** — stub page exists at `/synthesis/naming`
- Should implement Van Lancker naming process from the PDF

### Tagline (6/7)
- **Auto-generates** on arrival (directions + 12 variations in one pass)
- Directions shown as compact reference card at top
- Select up to 3 variations → "Refine N selected →" → 6 refined options
- After refining: `selected` resets, phase back to 'selecting', lock buttons appear
- Lock any variation → `phase: 'locked'`, locked tagline editable inline

### Manifesto (7/7)
- 6 Motto fill-in-the-blank prompts
- Minimum 4 filled to unlock synthesis
- "Write the manifesto →" → proof. synthesises into flowing brand voice piece
- "Edit source material" returns to prompts. "Rewrite →" regenerates.

---

## API / streaming

**Route:** `POST /api/proof`  
**Auth:** `x-proof-key` header (client's API key) or `ANTHROPIC_API_KEY` env var  
**Model:** claude-sonnet-4-20250514  
**Stream:** text/event-stream, chunked

**Key hook:** `useProofStream` — reads key from localStorage, sends as header, handles streaming

**Context builder:** `buildSynthesisContext(project)` in `lib/synthesisContext.ts`
- Passes: project name, all brief answers, brief summary, debrief (situation/challenge/angle), debrief summary, all synthesis modules completed so far
- Every Synthesis API call uses this — proof. always has full context

---

## Known issues / pending work

### High priority
- [ ] **Naming module** — not built. Stub exists. Should implement Van Lancker 6-step process.
- [ ] **Brand Home** — not built. The output page where all synthesis modules live as a coherent document.
- [ ] **Design pass** — planned but not done. Key items:
  - Question text too small (should be 32-36px)
  - More breathing room between sections
  - Motion that feels "inevitable" not just functional

### Medium priority
- [ ] Wire `useStreamSentences` into inline proof. notes (currently still word-by-word in Brief module)
- [ ] Research module (Stage 3 of Discovery) — not started
- [ ] Discovery Summary (Stage 4) — not started
- [ ] Client share mode improvements

### Low priority
- [ ] proof. drawer in Tone module doesn't pass full synthesis context when asking questions (passes brief context only)
- [ ] Naming module page is currently a stub

---

## What was just being worked on

The **Personality module** (`PersonalityModule.tsx`) was being actively iterated on. The last state:
- Tension pairs show with swappable poles ✓
- Brand-specific descriptions under each pair ✓
- Scenario carousel with auto-examples ✓
- The user wanted a different visual layout for the tension pair cards — they exported the page to Figma to sketch a new design. The Figma file is: https://www.figma.com/design/WqoEQcB4CXvfLn8W16gLZY

The user will share a sketch of the desired tension card layout. When they do, implement it in `PersonalityModule.tsx`.

---

## Product vision (brief)

From `lucid-vision.md` and `lucid-method.md` (project files):

- proof. is the AI presence. She challenges, not just assists. She never uses em dashes, never flatters, never says "you should" — she says "this tends to" or "a competitor could say this."
- The design should feel like a **creative sanctuary** — strategy as painting, not typing. Warm, considered, alive. Not SaaS dashboard energy.
- Design references: Ferrari Luce (LoveFrom), Linn LP12, Braun/Dieter Rams, *Her* (film)
- "We made painting feel like typing, but we should have made typing feel like painting." — Amelia Wattenberger
- Brands are relational not transactional. Every output gets the competitor test. Generic values get challenged structurally.

---

## How to run locally

```bash
cd /home/claude/proof
npm install
npm run dev
# Visit http://localhost:3000
# Set API key at /settings
```

## How to deploy

```bash
git add -A
git commit -m "your message"
git push
# Vercel auto-deploys in ~30 seconds
```
