# proof. — Handoff Document
*Last updated: April 2026*

---

## What this is

**proof.** is an AI-powered brand strategy tool. A creative director or strategist uses it to guide a client through Discovery (Brief → Debrief → Discovery Summary) and Synthesis (7 modules) to produce a complete brand foundation.

The AI partner is called **proof.** (lowercase, with period) — she has a point of view, challenges weak thinking, drafts from context, and responds to feedback. She speaks in short sentences, asks rather than tells, never flatters, never uses em dashes.

**Live URL:** https://proof-pi-umber.vercel.app  
**GitHub:** https://github.com/ashwinmurli/proof.git  
**Stack:** Next.js 16, TypeScript, Tailwind CSS v4, Framer Motion, Zustand, Anthropic SDK  
**Deploy:** Push to main → Vercel auto-deploys (~30s)  
**Git auth:** Use `https://ashwinmurli:<token>@github.com/ashwinmurli/proof.git`

---

## Codebase structure

```
app/
  page.tsx                          — Homepage (returning users see projects first, new project toggles)
  layout.tsx
  globals.css                       — Design tokens, grain texture, CSS vars
  settings/page.tsx                 — API key storage in localStorage
  api/proof/route.ts                — Server-side streaming, reads x-proof-key header
  project/[id]/
    page.tsx                        — Project overview (stages list)
    brief/page.tsx
    debrief/page.tsx
    discovery-summary/page.tsx      — NEW: Stage 4 of Discovery
    synthesis/
      page.tsx                      — Synthesis overview with module nav
      beliefs/page.tsx
      values/page.tsx
      personality/page.tsx
      tone/page.tsx
      naming/page.tsx
      tagline/page.tsx
      manifesto/page.tsx
    brand-home/page.tsx             — NEW: Full brand document output

components/
  proof/
    Strip.tsx                       — Sticky top nav: wordmark → project, phase label, Ask proof.
    ProofDrawer.tsx                 — Floating panel, sentence-fade streaming, summary mode
    ProofButton.tsx                 — Mango dot + label, outline/solid variants
    ProofContext.tsx                — Synthesised context card on Debrief + Synthesis pages
  modules/
    BriefModule.tsx                 — 5 questions, 30px active text, inline proof. notes
    DebriefModule.tsx               — proof. presents interpretation, push-back/revise flow
    DiscoverySummary.tsx            — NEW: What we found / tension / the question
    synthesis/
      BeliefsModule.tsx
      ValuesModule.tsx
      PersonalityModule.tsx         — Tension pairs, scenario carousel
      ToneModule.tsx
      NamingModule.tsx              — Territory + 12 candidates, hover-reveal rationale
      TaglineModule.tsx
      ManifestoModule.tsx           — Final CTA goes to /brand-home
  BrandHome.tsx                     — NEW: Full brand document, scroll-spy nav, copy buttons

lib/
  questions.ts                      — 5 brief questions
  prompts.ts                        — System prompts (strategist + client modes)
  useProofStream.ts                 — Streaming hook
  useStreamSentences.ts             — Sentence-buffered streaming (built, partially used)
  synthesisContext.ts               — buildSynthesisContext() — includes Discovery Summary,
                                      chosen name, tagline for all Synthesis AI calls

store/index.ts                      — Zustand with localStorage persistence
types/index.ts                      — All types including discoverySummary on Project
```

---

## Design system

**Palette:**
- `--mango` #FFA10A — proof.'s colour. Used only for proof.'s presence, buttons, dots
- `--bg` #EFECE5 — page background
- `--surface-0` #F5F2EB — page field (used as background in all module pages)
- `--surface-1` #FAF8F4 — raised cards (active brief card, scenario cards)
- `--surface-2` #FDFCFA — highest surface
- `--aluminum` #D5D4D6
- `--stone` #8C8780 — labels, secondary text
- `--concrete` #686562 — body text
- `--dark` #1A1816 — headings, primary text

**Typography:**
- Display/headings: Playfair Display (serif), italic for proof.'s short quotes only
- Body/UI: DM Sans, weight 300 for body text, 500 for labels
- **No h1 elements in module pages** — all modules use eyebrow (10px uppercase) + 15px description

**Layout:**
- All module main containers: `maxWidth: 660, padding: '72px 24px 120px'`
- Strip height: 52px, `var(--surface-0)` background
- Active question card: `var(--surface-1)`, borderRadius 14, shadow lift, -32px margin bleed

**proof.'s visual identity:**
- Mango dot (5-6px) + label = proof. is present or being invoked
- Strip shows phase label (uppercase, 10px) + progress bars centred
- Single proof. button (shows note count OR "Ask proof.", not both)

---

## Full product flow

```
/ (homepage)
  → returning users: see project list with status labels, "New project" toggle
  → new users: see new project form immediately

/project/[id] (overview)
  → Brief → Debrief → Discovery Summary → Synthesis → Brand Home

Discovery:
  Brief (5 questions, proof. notes inline, Cmd+Enter flow)
  Debrief (proof. generates situation/challenge/angle, revise flow)
  Discovery Summary (proof. generates: what we found / tension / question)

Synthesis (7 modules, each auto-generates from full context):
  1. Beliefs (what we believe / building / how we work)
  2. Values (3 values, stress test with verdict pills)
  3. Personality (tension pairs with swappable poles, scenario carousel)
  4. Tone (spectrum selector, auto-updating voice examples)
  5. Naming (territory + 12 candidates by type, hover-reveal rationale, lock)
  6. Tagline (auto-generate directions + variations, select to refine, lock)
  7. Manifesto (fill-in-blank prompts → proof. synthesises) → Brand Home

Brand Home (/project/[id]/brand-home):
  Scroll-spy left nav, all 7 sections, copy buttons, print export
```

---

## Key interaction patterns

### Brief
- 30px active question text, 19px inactive
- proof. note appears inline below textarea after blur (mango dot separator)
- Streaming shows live as proof. types
- Cmd+Enter advances to next question; on last question triggers brief summary in drawer

### Debrief pattern (proof. presents first)
- proof. auto-generates Situation / Challenge / Angle on load
- Read mode (italic prose) → click to edit → textarea with autoFocus
- "Ask proof. to revise" → feedback input → proof. rewrites that section
- Routes to Discovery Summary (not Synthesis directly)

### Discovery Summary
- proof. auto-generates on load from full brief + debrief context
- Three sections stream in: What we found (22px serif), The tension (italic), The question
- Persists to `project.discoverySummary`

### Synthesis module pattern (all 7 modules)
- proof. drafts from `buildSynthesisContext()` on load
- Same push-back / revise flow
- Cmd+Enter → fetchSummary() → summary in drawer → Continue button
- Stale closure fix: all handleAdvance callbacks use summaryStateRef

### ProofDrawer
- Summary mode: dims page, expands to 520px, sentences fade in
- Normal mode: 380px, ask tab (no notes tab unless thoughts exist)

---

## synthesisContext includes (in order):
1. Project name + description
2. Brief answers (all 5 questions)
3. proof.'s brief summary
4. Debrief (situation / challenge / angle)
5. proof.'s debrief summary
6. Discovery Summary (full text)
7. Beliefs (when done)
8. Values (when done)
9. Personality tensions (when done)
10. Tone spectrum (when done)
11. Chosen name (when done)
12. Chosen tagline (when done)

---

## Known issues / pending work

### High priority
- [ ] **Brand Home** — needs a "share" or "export as PDF" flow for client delivery
- [ ] **Share mode** — `/share/[token]` exists but hasn't been fully built out for post-synthesis sharing (currently only shares the brief)

### Medium priority
- [ ] Wire `useStreamSentences` into inline proof. notes in Brief (currently word-by-word)
- [ ] Mobile responsiveness — Strip 44px padding clips on small screens
- [ ] Tone module drawer doesn't pass full synthesis context when asking questions

### Low priority
- [ ] Discovery Summary doesn't show in project overview stages navigation (it's in the flow but not accessible via the overview page directly)
- [ ] Project deletion — no way to delete a project from the homepage

---

## What was just being worked on

The last session fixed a series of bugs and did a design pass:
- Removed all 52px h1 headers from synthesis modules (replaced with compact eyebrow + description)
- Normalized padding (72px/120px) and maxWidth (660px) across all pages
- Fixed `discoverySummary` typing (was `any` cast, now properly typed on Project)
- Fixed Manifesto final CTA → routes to Brand Home not Synthesis overview
- Replaced hardcoded `#F5F2EB` with `var(--surface-0)` across 9 files
- Redesigned homepage: returning users see projects first, new project is toggleable, description is required
- Redesigned Strip: single proof. button, clear phase label, CSS var background

## How to deploy

```bash
git add -A
git commit -m "your message"
git push
# Vercel auto-deploys in ~30 seconds
```
