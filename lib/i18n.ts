// proof. — Translation system
// Simple key-value map for EN/NL. No library needed.

export type Language = 'en' | 'nl'

const translations = {
  // ─── Navigation / global ─────────────────────────────────────────────────
  'nav.back_brief':        { en: '← Brief',            nl: '← Briefing' },
  'nav.back_debrief':      { en: '← Debrief',          nl: '← Debriefing' },
  'nav.back_discovery':    { en: '← Discovery Summary', nl: '← Ontdekkingssamenvatting' },
  'nav.back_values':       { en: '← Values',            nl: '← Waarden' },
  'nav.back_beliefs':      { en: '← Beliefs',           nl: '← Overtuigingen' },
  'nav.back_personality':  { en: '← Personality',       nl: '← Persoonlijkheid' },
  'nav.back_tone':         { en: '← Tone',              nl: '← Toon' },
  'nav.back_naming':       { en: '← Naming',            nl: '← Naamgeving' },
  'nav.back_tagline':      { en: '← Tagline',           nl: '← Tagline' },
  'nav.back_synthesis':    { en: '← Synthesis',         nl: '← Synthese' },
  'nav.ask_proof':         { en: 'Ask proof.',           nl: 'Vraag proof.' },
  'nav.notes_one':         { en: 'note',                 nl: 'noot' },
  'nav.notes_other':       { en: 'notes',                nl: 'noten' },

  // ─── Homepage / project creation ─────────────────────────────────────────
  'home.new_project':      { en: 'New project',          nl: 'Nieuw project' },
  'home.project_name':     { en: 'Project name',         nl: 'Projectnaam' },
  'home.description':      { en: 'One line description', nl: 'Één zin omschrijving' },
  'home.language':         { en: 'Language',             nl: 'Taal' },
  'home.language_en':      { en: 'English',              nl: 'Engels' },
  'home.language_nl':      { en: 'Dutch',                nl: 'Nederlands' },
  'home.create':           { en: 'Create project',       nl: 'Project aanmaken' },

  // ─── Common actions ───────────────────────────────────────────────────────
  'action.regenerate':     { en: 'Regenerate',           nl: 'Opnieuw genereren' },
  'action.revise':         { en: 'Revise →',             nl: 'Herzien →' },
  'action.revising':       { en: 'Revising…',            nl: 'Herzien…' },
  'action.edit':           { en: 'Edit',                 nl: 'Bewerken' },
  'action.save':           { en: 'Save',                 nl: 'Opslaan' },
  'action.copy':           { en: 'Copy',                 nl: 'Kopiëren' },
  'action.copied':         { en: 'Copied',               nl: 'Gekopieerd' },
  'action.share':          { en: 'Share',                nl: 'Delen' },
  'action.link_copied':    { en: 'Link copied',          nl: 'Link gekopieerd' },
  'action.new_example':    { en: 'New example',          nl: 'Nieuw voorbeeld' },
  'action.lock':           { en: 'Lock →',               nl: 'Vergrendelen →' },
  'action.locked':         { en: 'Locked.',              nl: 'Vergrendeld.' },
  'action.retest':         { en: 'Re-test →',            nl: 'Opnieuw testen →' },

  // ─── Brief ────────────────────────────────────────────────────────────────
  'brief.phase':           { en: 'Discovery — 1 of 4',   nl: 'Ontdekking — 1 van 4' },
  'brief.description':     { en: 'The foundation. The more specific and honest, the sharper everything that follows.', nl: 'De basis. Hoe specifieker en eerlijker, hoe scherper alles wat volgt.' },
  'brief.continue':        { en: 'Continue to Debrief →', nl: 'Naar debriefing →' },
  'brief.different_angle': { en: 'Different angle',      nl: 'Andere invalshoek' },

  // ─── Debrief ──────────────────────────────────────────────────────────────
  'debrief.phase':         { en: 'Discovery — 2 of 4',   nl: 'Ontdekking — 2 van 4' },
  'debrief.description':   { en: 'proof. reads the brief and draws out the real strategic challenge.', nl: 'proof. leest de briefing en destilleert de echte strategische uitdaging.' },
  'debrief.situation':     { en: 'The Situation',        nl: 'De Situatie' },
  'debrief.challenge':     { en: 'The Challenge',        nl: 'De Uitdaging' },
  'debrief.angle':         { en: 'Our Angle',            nl: 'Onze Invalshoek' },
  'debrief.situation_q':   { en: 'What is actually going on with this brand right now?', nl: 'Wat speelt er werkelijk bij dit merk op dit moment?' },
  'debrief.challenge_q':   { en: 'What is the real strategic problem to solve?', nl: 'Wat is het echte strategische probleem dat opgelost moet worden?' },
  'debrief.angle_q':       { en: 'What is your point of view on how to approach this?', nl: 'Wat is jouw visie op de aanpak?' },
  'debrief.continue':      { en: 'Continue to Discovery Summary →', nl: 'Naar ontdekkingssamenvatting →' },
  'debrief.generating':    { en: 'proof. is reading the brief…', nl: 'proof. leest de briefing…' },
  'debrief.ask_revise':    { en: 'Ask proof. to revise',  nl: 'Vraag proof. om te herzien' },

  // ─── Discovery Summary ────────────────────────────────────────────────────
  'discovery.phase':       { en: 'Discovery — 4 of 4',   nl: 'Ontdekking — 4 van 4' },
  'discovery.description': { en: 'What was found. The foundation Synthesis builds on.', nl: 'Wat werd gevonden. De basis waarop Synthese voortbouwt.' },
  'discovery.generating':  { en: 'proof. is closing Discovery…', nl: 'proof. sluit de ontdekkingsfase af…' },
  'discovery.found':       { en: "proof.'s thoughts on what we found", nl: "proof.'s gedachten over wat we vonden" },
  'discovery.tension':     { en: "proof.'s thoughts on the tension", nl: "proof.'s gedachten over de spanning" },
  'discovery.question':    { en: "proof.'s thoughts on the question we answer", nl: "proof.'s gedachten over de vraag die we beantwoorden" },
  'discovery.continue':    { en: 'Begin Synthesis →',    nl: 'Begin Synthese →' },

  // ─── Synthesis shared ─────────────────────────────────────────────────────
  'synthesis.continue_tone':        { en: 'Continue to Tone →',        nl: 'Naar toon →' },
  'synthesis.continue_naming':      { en: 'Continue to Naming →',      nl: 'Naar naamgeving →' },
  'synthesis.continue_tagline':     { en: 'Continue to Tagline →',     nl: 'Naar tagline →' },
  'synthesis.continue_manifesto':   { en: 'Continue to Manifesto →',   nl: 'Naar manifest →' },
  'synthesis.continue_brand_home':  { en: 'Go to Brand Home →',        nl: 'Naar Brand Home →' },
  'synthesis.continue_values':      { en: 'Continue to Values →',      nl: 'Naar waarden →' },
  'synthesis.continue_personality': { en: 'Continue to Personality →', nl: 'Naar persoonlijkheid →' },

  // ─── Beliefs ──────────────────────────────────────────────────────────────
  'beliefs.phase':         { en: 'Synthesis — 1 of 7',   nl: 'Synthese — 1 van 7' },
  'beliefs.description':   { en: 'Why the brand exists. What it believes. How it works.', nl: 'Waarom het merk bestaat. Wat het gelooft. Hoe het werkt.' },
  'beliefs.belief':        { en: 'Why does this brand exist beyond making money?', nl: 'Waarom bestaat dit merk, los van winst maken?' },
  'beliefs.building':      { en: "What we're building",  nl: 'Wat we bouwen' },
  'beliefs.working':       { en: 'How we work',          nl: 'Hoe we werken' },
  'beliefs.generating':    { en: 'proof. is building the belief system…', nl: 'proof. bouwt het overtuigingssysteem…' },

  // ─── Values ───────────────────────────────────────────────────────────────
  'values.phase':          { en: 'Synthesis — 2 of 7',   nl: 'Synthese — 2 van 7' },
  'values.description':    { en: 'Three values. Each one needs a definition and a behavioural description — what it looks like in action. Values without teeth are decorations.', nl: 'Drie waarden. Elke waarde heeft een definitie en gedragsbeschrijving nodig — hoe ziet het eruit in de praktijk. Waarden zonder tanden zijn decoratie.' },
  'values.what_it_means':  { en: 'What it means',        nl: 'Wat het betekent' },
  'values.what_it_looks':  { en: 'What it looks like',   nl: 'Hoe het eruitziet' },
  'values.stress_test':    { en: 'Stress test →',        nl: 'Stresstesten →' },
  'values.passes':         { en: 'Passes',               nl: 'Geslaagd' },
  'values.needs_work':     { en: 'Needs work',           nl: 'Verbetering nodig' },
  'values.ask_rewrite':    { en: 'Ask proof. to rewrite →', nl: 'Vraag proof. om te herschrijven →' },
  'values.rewriting':      { en: 'proof. is rewriting…', nl: 'proof. herschrijft…' },
  'values.rewrite_done':   { en: 'proof. has rewritten this. Run a fresh stress test to check it, or move on.', nl: 'proof. heeft dit herschreven. Voer een nieuwe stressttest uit of ga verder.' },
  'values.generating':     { en: 'proof. is building the values…', nl: 'proof. bouwt de waarden…' },

  // ─── Personality ──────────────────────────────────────────────────────────
  'personality.phase':     { en: 'Synthesis — 3 of 7',   nl: 'Synthese — 3 van 7' },
  'personality.description': { en: 'Brand as a person. Click either side of a tension to explore alternatives with different nuance.', nl: 'Het merk als persoon. Klik op een kant van een spanning om alternatieven te verkennen.' },
  'personality.pairs':     { en: 'Tension pairs',        nl: 'Spanningsparen' },
  'personality.person':    { en: 'The person',           nl: 'De persoon' },
  'personality.dinner':    { en: 'at a dinner party',    nl: 'op een dinnerparty' },
  'personality.difficult': { en: 'in a difficult conversation', nl: 'in een moeilijk gesprek' },
  'personality.decision':  { en: 'making a decision under pressure', nl: 'een beslissing nemen onder druk' },
  'personality.in_voice':  { en: 'In their voice',       nl: 'In hun stem' },
  'personality.generating': { en: 'proof. is imagining the person behind the brand…', nl: 'proof. stelt zich de persoon achter het merk voor…' },

  // ─── Tone ──────────────────────────────────────────────────────────────────
  'tone.phase':            { en: 'Synthesis — 4 of 7',   nl: 'Synthese — 4 van 7' },
  'tone.description':      { en: 'The spectrum between two poles. Concrete examples of what sounds like this brand and what doesn\'t.', nl: 'Het spectrum tussen twee polen. Concrete voorbeelden van wat klinkt als dit merk en wat niet.' },
  'tone.spectrum':         { en: 'The spectrum',         nl: 'Het spectrum' },
  'tone.sounds_like':      { en: 'This sounds like us',  nl: 'Dit klinkt als ons' },
  'tone.not_sounds_like':  { en: "This doesn't sound like us", nl: 'Dit klinkt niet als ons' },
  'tone.generating':       { en: 'proof. is finding the voice…', nl: 'proof. zoekt de stem…' },

  // ─── Naming ───────────────────────────────────────────────────────────────
  'naming.phase':          { en: 'Synthesis — 5 of 7',   nl: 'Synthese — 5 van 7' },
  'naming.description':    { en: 'A name earns its place when it couldn\'t have been made for anyone else.', nl: 'Een naam verdient zijn plek als hij voor niemand anders gemaakt had kunnen worden.' },
  'naming.territory':      { en: 'Naming territory',     nl: 'Naamgevingsgebied' },
  'naming.candidates':     { en: 'Candidates',           nl: 'Kandidaten' },
  'naming.generating':     { en: 'proof. is exploring name territory…', nl: 'proof. verkent naamgevingsgebied…' },
  'naming.select_refine':  { en: 'Select up to 3 to refine, or lock one directly.', nl: 'Selecteer maximaal 3 om te verfijnen, of vergrendel er direct één.' },
  'naming.refined':        { en: 'Refined',              nl: 'Verfijnd' },

  // ─── Tagline ──────────────────────────────────────────────────────────────
  'tagline.phase':         { en: 'Synthesis — 6 of 7',   nl: 'Synthese — 6 van 7' },
  'tagline.description':   { en: 'A tagline earns its place when it couldn\'t be said by anyone else and couldn\'t be said any other way.', nl: 'Een tagline verdient zijn plek als niemand anders hem had kunnen zeggen en hij niet anders gezegd had kunnen worden.' },
  'tagline.directions':    { en: 'Strategic directions',  nl: 'Strategische richtingen' },
  'tagline.refined':       { en: 'Refined',              nl: 'Verfijnd' },
  'tagline.generating':    { en: 'proof. is exploring directions…', nl: 'proof. verkent richtingen…' },
  'tagline.select_refine': { en: 'Select up to 3 to refine, or lock one directly.', nl: 'Selecteer maximaal 3 om te verfijnen, of vergrendel er direct één.' },

  // ─── Manifesto ────────────────────────────────────────────────────────────
  'manifesto.phase':       { en: 'Synthesis — 7 of 7',   nl: 'Synthese — 7 van 7' },
  'manifesto.description': { en: 'The brand\'s voice. Consumer-facing. In first person. Something that makes the people it\'s for feel seen.', nl: 'De stem van het merk. Gericht op de consument. In eerste persoon. Iets waardoor de doelgroep zich gezien voelt.' },
  'manifesto.generating':  { en: 'proof. is writing the manifesto…', nl: 'proof. schrijft het manifest…' },
  'manifesto.write':       { en: 'Write the manifesto →', nl: 'Schrijf het manifest →' },
  'manifesto.raw_material': { en: 'Raw material',         nl: 'Ruwe materiaal' },

  // ─── Brand Home ───────────────────────────────────────────────────────────
  'bh.foundation':         { en: 'Brand Foundation',     nl: 'Merkfundament' },
  'bh.beliefs':            { en: 'What we believe',      nl: 'Wat we geloven' },
  'bh.values':             { en: 'What we stand for',    nl: 'Waar we voor staan' },
  'bh.personality':        { en: 'Who we are',           nl: 'Wie we zijn' },
  'bh.tone':               { en: 'How we speak',         nl: 'Hoe we spreken' },
  'bh.naming':             { en: "What we're called",    nl: 'Hoe we heten' },
  'bh.tagline':            { en: 'The line',             nl: 'De lijn' },
  'bh.manifesto':          { en: "What we're about",     nl: 'Waar we voor gaan' },
  'bh.copy':               { en: 'Write with the brand', nl: 'Schrijf met het merk' },
  'bh.building':           { en: "What we're building",  nl: 'Wat we bouwen' },
  'bh.working':            { en: 'How we work',          nl: 'Hoe we werken' },
  'bh.tension_pairs':      { en: 'Tension pairs',        nl: 'Spanningsparen' },
  'bh.the_person':         { en: 'The person',           nl: 'De persoon' },
  'bh.dinner':             { en: 'At a dinner party',    nl: 'Op een dinnerparty' },
  'bh.difficult':          { en: 'In a difficult conversation', nl: 'In een moeilijk gesprek' },
  'bh.decision':           { en: 'Making a decision under pressure', nl: 'Een beslissing nemen onder druk' },
  'bh.sounds_like':        { en: 'Sounds like us',       nl: 'Klinkt als ons' },
  'bh.not_sounds_like':    { en: "Doesn't sound like us", nl: 'Klinkt niet als ons' },
  'bh.in_practice':        { en: 'In practice:',         nl: 'In de praktijk:' },
  'bh.copy_description':   { en: 'Describe what you need. proof. will write it in the brand\'s voice.', nl: 'Beschrijf wat je nodig hebt. proof. schrijft het in de stem van het merk.' },
  'bh.copy_placeholder':   { en: 'Write a tagline for our Instagram bio… / Give me three subject lines for a launch email…', nl: 'Schrijf een tagline voor onze Instagram-bio… / Geef me drie onderwerpsregels voor een lancerings-e-mail…' },
  'bh.copy_write':         { en: 'Write →',              nl: 'Schrijf →' },
  'bh.writing':            { en: 'Writing…',             nl: 'Schrijven…' },
  'bh.add_identity':       { en: 'Add identity',         nl: 'Identiteit toevoegen' },
  'bh.identity':           { en: 'Identity',             nl: 'Identiteit' },
  'bh.back_synthesis':     { en: '← Back to Synthesis',  nl: '← Terug naar synthese' },
  'bh.complete_synthesis': { en: 'Complete modules in Synthesis to build the brand home.', nl: 'Voltooi modules in Synthese om de brand home te bouwen.' },
  'bh.go_synthesis':       { en: 'Go to Synthesis →',    nl: 'Naar synthese →' },

  // ─── Identity wizard ──────────────────────────────────────────────────────
  'wizard.colours':        { en: 'Colours',              nl: 'Kleuren' },
  'wizard.typography':     { en: 'Typography',           nl: 'Typografie' },
  'wizard.of':             { en: 'of',                   nl: 'van' },
  'wizard.brand_identity': { en: 'Brand identity',       nl: 'Merkidentiteit' },
  'wizard.primary':        { en: 'Primary colour',       nl: 'Primaire kleur' },
  'wizard.accent':         { en: 'Accent colour',        nl: 'Accentkleur' },
  'wizard.background':     { en: 'Background',           nl: 'Achtergrond' },
  'wizard.text':           { en: 'Text colour',          nl: 'Tekstkleur' },
  'wizard.primary_hint':   { en: 'Used for headings and key elements', nl: 'Gebruikt voor koppen en sleutelelementen' },
  'wizard.accent_hint':    { en: 'Used for labels and highlights — defaults to primary', nl: 'Gebruikt voor labels en highlights — valt terug op primair' },
  'wizard.bg_hint':        { en: 'The page background',  nl: 'De paginaachtergrond' },
  'wizard.text_hint':      { en: 'Body text — defaults to near-black', nl: 'Lopende tekst — standaard bijna-zwart' },
  'wizard.choose_pair':    { en: 'Choose a type pairing, or leave blank to use neutral defaults.', nl: 'Kies een lettertypecombinatie, of laat leeg voor neutrale standaarden.' },
  'wizard.clear':          { en: 'Clear selection → use neutral defaults', nl: 'Selectie wissen → neutrale standaarden gebruiken' },
  'wizard.cancel':         { en: 'Cancel',               nl: 'Annuleren' },
  'wizard.back':           { en: '← Back',               nl: '← Terug' },
  'wizard.next':           { en: 'Next →',               nl: 'Volgende →' },
  'wizard.apply':          { en: 'Apply identity',       nl: 'Identiteit toepassen' },
} as const

export type TranslationKey = keyof typeof translations

export function t(key: TranslationKey, lang: Language = 'en'): string {
  return translations[key]?.[lang] ?? translations[key]?.['en'] ?? key
}

// Language instruction for prompts
export function langInstruction(lang: Language): string {
  if (lang === 'nl') {
    return `IMPORTANT: Respond entirely in Dutch. Use informal 'je/jij' (not 'u'). Write naturally as a native Dutch speaker — not translated English. Brand strategy terminology may stay in English where it is commonly used in the Dutch industry (e.g. 'briefing', 'brand', 'tagline', 'manifesto'). Do not use em dashes.\n\n`
  }
  return ''
}

// Convenience hook — use inside any component that has access to project
export function useLang(project: { language?: string }) {
  const lang: Language = (project.language as Language) || 'en'
  return (key: TranslationKey) => t(key, lang)
}
