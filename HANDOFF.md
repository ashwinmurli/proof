# proof. — Handoff Document
*Last updated: April 2026*

---

## What this is

**proof.** is an AI-powered brand strategy tool. A creative director or strategist uses it to guide a brand through Discovery (Brief → Debrief → Discovery Summary) and Synthesis (7 modules) to produce a complete brand foundation, delivered as a shareable Brand Home.

The AI partner is **proof.** — she has a point of view, challenges weak thinking, drafts from context, responds to feedback. Short sentences. Asks rather than tells. Never flatters. Never uses em dashes.

**Live URL:** https://proof-pi-umber.vercel.app  
**GitHub:** https://github.com/ashwinmurli/proof.git  
**Stack:** Next.js 16, TypeScript, Tailwind CSS v4, Framer Motion, Zustand, Anthropic SDK  
**Deploy:** Push to main → Vercel auto-deploys (~30s)  
**Git auth:** `git remote set-url origin "https://ashwinmurli:<token>@github.com/ashwinmurli/proof.git"`  
**Model:** `claude-sonnet-4-20250514`

---

## Codebase structure

```
app/
  page.tsx                    — Homepage: projects list first for returning users, new project toggles
  layout.tsx
  globals.css                 — CSS vars, grain texture
  settings/page.tsx           — API key in localStorage
  api/proof/route.ts          — Server-side streaming, x-proof-key header
  project/[id]/
    page.tsx                  — Overview: stages, Brand Home link, adaptive share card
    brief/page.tsx
    debrief/page.tsx
    discovery-summary/page.tsx
    synthesis/
      page.tsx                — Module nav, Brand Home CTA when manifesto done
      beliefs/  values/  personality/  tone/  naming/  tagline/  manifesto/
    brand-home/page.tsx
  share/[token]/page.tsx      — Brand Home (readOnly) if synthesis exists, Brief form otherwise

components/
  proof/
    Strip.tsx                 — Sticky nav, clamp padding (mobile-safe)
    ProofDrawer.tsx           — Floating panel, full synthesisContext for conversations
    ProofButton.tsx           — Mango dot + label
    ProofContext.tsx          — Context card on Debrief + Synthesis overview
  modules/
    BriefModule.tsx           — 5 questions, 30px active, inline notes with ↺ refresh
    DebriefModule.tsx         — proof. generates, push-back/revise, routes to Discovery Summary
    DiscoverySummary.tsx      — What we found / tension / question → persists to project.discoverySummary
    synthesis/
      BeliefsModule.tsx
      ValuesModule.tsx
      PersonalityModule.tsx   — Tension pairs with swappable poles, scenario carousel
      ToneModule.tsx          — Routes to Naming unless naming already done
      NamingModule.tsx        — Territory + 12 candidates, hover-reveal rationale
      TaglineModule.tsx       — Directions + variations → refine → lock
      ManifestoModule.tsx     — Prompts → synthesis, streams visibly, final CTA → Brand Home
  BrandHome.tsx               — Full document, scroll-spy nav, readOnly for sharing

lib/
  questions.ts                — 5 brief questions
  prompts.ts                  — System prompts with full brand strategy framework
  useProofStream.ts           — Streaming hook
  synthesisContext.ts         — buildSynthesisContext() — full Discovery + Synthesis state

store/index.ts                — Zustand + localStorage; includes deleteProject
types/index.ts                — All types; discoverySummary on Project
```

---

## Design system

- `--mango` #FFA10A — proof.'s colour only
- `--bg` #EFECE5 — page background
- `--surface-0` #F5F2EB — module page backgrounds
- `--surface-1` #FAF8F4 — raised cards
- `--surface-2` #FDFCFA — highest surface
- `--stone` #8C8780, `--concrete` #686562, `--dark` #1A1816

**Typography:** Playfair Display (serif), DM Sans 300/400/500  
**No h1 in module pages** — 10px uppercase eyebrow + 15px description  
**Layout:** `maxWidth: 660, padding: '72px 24px 120px'`  
**Strip:** `clamp(20px, 5vw, 44px)` padding — mobile-safe  
**ProofDrawer:** `right: max(16px, min(44px, 5vw)), maxWidth: calc(100vw - 32px)`

---

## Full product flow

```
/ → Brief → Debrief → Discovery Summary → Synthesis (7) → Brand Home → Share

Brief: 5 questions, inline proof. notes with ↺ refresh, Cmd+Enter
Debrief: proof. generates sit/challenge/angle, push-back/revise → Discovery Summary
Discovery Summary: what we found / tension / question
Synthesis 1-7: all auto-generate from full context on load
Brand Home: cover (name + tagline), all 7 sections, copy buttons
Share: one URL — Brief form before synthesis, Brand Home after
```

---

## Prompt quality

All generation prompts now include:
- What makes good output vs generic output
- Specific anti-patterns to avoid
- Tests that must be passed
- Quality criteria for final output

Key: **Personality** prompt includes a good vs bad tension pair example. **Values** lists exact value names that disqualify (Integrity, Excellence, Innovation). **Naming** includes what makes a name earn its place. **Tagline** includes what to avoid (questions, commands, category descriptions).

---

## Known issues / pending work

- [ ] Brief active card bleeds -32px each side — could clip on very narrow screens (<375px)
- [ ] Settings: no way to clear the API key, only replace
- [ ] Project: no rename functionality
- [ ] Personality scenario carousel: doesn't scroll on some touch devices

---

## How to deploy

```bash
git add -A && git commit -m "message" && git push
```
