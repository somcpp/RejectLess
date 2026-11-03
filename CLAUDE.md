# RejectLess — guide for Claude and the team

@AGENTS.md

RejectLess is a privacy-first **application-readiness checker** for Indian government applications. A user picks an application, adds documents, and RejectLess reads them **in the browser**, compares them with each other and with versioned rules, and explains every problem with evidence and a fix. It is NOT a government service: it never submits applications, verifies against government databases, or promises approval.

Current status and roadmap: [docs/PROGRESS.md](docs/PROGRESS.md) — update it when you finish something.

## Commands

```bash
npm install        # postinstall copies pdf.js worker + Devanagari font into /public
npm run dev        # http://localhost:3000
npm test           # Vitest engine tests — must stay green
npx tsc --noEmit   # type-check
npx eslint src
npm run build      # production build (stop `npm run dev` first; both use .next)
```

Optional `.env` (gitignored): `GROQ_API_KEY`, `GROQ_MODEL`. See `.env.example`. Never commit keys.

## Product rules (non-negotiable)

1. **Code decides, models extract, the LLM only explains.** Every pass/fail comes from a deterministic check in `src/engine/checks.ts`. The AI never creates, changes or re-judges a finding.
2. **No exact personal details to any AI.** The assistant receives only the redacted question (`redact()`), the engine's `Finding.abstract` (written without names/numbers/dates) and knowledge-base passages. If you add a finding, write its `abstract` without personal values.
3. **Documents never leave the browser.** No server storage. Originals aren't kept; only extracted fields + small previews in IndexedDB. Aadhaar is reduced to last 4 digits + checksum result at extraction (`minimised`).
4. **Never invent requirements or sources.** Every rule cites `sourceIds` and a `basis`: `official` | `secondary` (UI shows "Verify") | `engine` (RejectLess data-quality check) | `demo`. Research before adding a rule; if you can't confirm the official text, mark it `secondary`.
5. **Honest outcomes.** Format checks are not verification. Missing input → an explicit "Could not check" (`insufficient()`), never a silent skip or a pass. Things only EPFO/NSP/banks can confirm are `external`.
6. **Demo data is fictional** — invented people, fictional banks (`BDBK`, `JSBX`, `UDCB`), SPECIMEN watermark. Never use real identifiers.

## Architecture

```
src/
  engine/            pure TypeScript, no React/browser APIs — unit-test everything here
    types.ts         domain model (DocumentRecord, ExtractedField, RuleDef, Finding, …)
    text/            transliterate (Devanagari→Latin, schwa deletion), normalize + phoneticKey,
                     similarity, devanagariRepair (fix visual-order Hindi from PDFs)
    identity/        compareNames → consistent | minor_variation | mismatch | insufficient
    validators/      Aadhaar Verhoeff, PAN, IFSC, dates (DD/MM default), amounts, masking
    reference/ifsc   dated IFSC snapshot (fictional banks only for now)
    extract/         classify() + per-document label parsers → fields with bbox + confidence
    quality.ts       sharpness/brightness/contrast/edge-ink metrics → QualityIssue[]
    profile.ts       merges document fields + user's draft into one comparison profile
    checks.ts        CHECKS registry: rule.check → implementation producing Findings
    run.ts           staged runner (STAGES), sorting, reconcile() for resolution history
  knowledge/         sources.ts, documents.ts (doc types, field labels), rules.ts, applications.ts,
                     authorities.ts (ministry/department/portal/helpline per app; DOC_SOURCES = where to get each document),
                     ministries.ts (54 Union ministries + per-state department template + state portals),
                     schemes.ts (browseable catalogue; only entries with appId are checkable — the rest are "Coming soon")
  lib/
    ingest/          pdf.ts (pdf.js), ocr.ts (Tesseract eng+hin), raster.ts, pipeline.ts
    store/session.ts Zustand + IndexedDB persistence, 24 h sliding expiry, deleteSession()
    actions.ts       addFiles (queued), changeDocType, loadScenario, applyFix
    assistant/       kb.ts (knowledge base), retrieval.ts (BM25), assistant.ts (redact, local answers, AI client)
    report.ts        jsPDF readiness report (client-side)
  demo/              personas, scenarios (+ buildScenario), render.ts (canvas specimens),
                     package.ts (→ searchable PDF or degraded JPEG), devHarness.ts (dev-only window.__rl)
  knowledge/onboarding.ts  roles, work types, states, goals (→ app + variant), stateNote(), recommendPf()
  lib/useRunCheck.ts       shared staged check runner + inputSignature() (detects changes since a run)
  lib/triage.ts            groups findings into the 5 result groups shown to users (does not change engine statuses)
  engine/scan/geometry.ts  pure scanner maths: Otsu sheet detection, homography, warp, enhancement, glare (tested)
  lib/scanner.ts + components/scanner/DocumentScanner.tsx   camera scanner (setInterval, never rAF) → JPEG/PDF → addFiles
  lib/photo.ts + guide/PhotoStep.tsx                        passport photo crop + compress (variant.photoSpec)
  knowledge/eligibility.ts + assistant/SchemeFinder.tsx     deterministic scheme screens (only researched schemes)
  knowledge/rejections.ts + lib/rejection.ts + assistant/RejectionDecoder.tsx   rejection-notice decoder (OCR on device)
  components/gov.tsx       GovBand (tricolour strip, text size), ReadAloud (speech), AuthorityCard
  components/workspace/DigiLockerMock.tsx  simulated DigiLocker fetch — always labelled as a simulation
  app/               Next.js routes:
                     /            landing (one CTA: Get started)
                     /start       onboarding: role → work → state → goal (or "not sure" helper) → plan + consent
                     /workspace   GUIDED flow (session.guideStep): documents → confirm → details → check → results
                     /workspace/documents|review|profile|findings|check|report   "All details" views for power users
                     /apply, /apply/[appId], /demo, /privacy, /about, /api/assistant (only server code; calls Groq)
  components/        ui.tsx (design primitives), site.tsx (TopBar+Masthead+NavBar header, portal footer),
                     flow.tsx (onboarding StepFrame/Choice), guide/* (guided steps), workspace/* (shell, assistant, findings, evidence)
```

### Visual language: Indian government portal

The UI deliberately looks like an NIC-built government portal (GIGW / UX4G conventions) so first-time applicants feel at home — while saying everywhere that RejectLess is independent. Keep to it:

- **Chrome on every page**: `TopBar` (skip link, tricolour + bilingual line, screen-reader link, A-/A/A+) → white `Masthead` with the bilingual logo → navy `NavBar` with a saffron CTA. Pages wrap content in `<main id="main">` (the skip-link target). Footer lists website policies and "Last updated".
- **Colours**: navy `accent` for headings/nav/primary buttons, `saffron` for the single "go" action, left borders and panel accents, `india-green`/`pass` for success. Red/amber/green/blue stay reserved for validation states.
- **Shapes**: square corners. Radius tokens are overridden in `globals.css` (`--radius-2xl: 6px` etc.), so keep using `rounded-*` utilities; never add big literal radii. Use `.gov-panel` + `.gov-panel-head` (or `<Panel>`) for boxed sections with a header strip.
- **Type**: Noto Sans + Noto Sans Devanagari; bold navy headings with a saffron left bar (`Question`, `StepTitle`, `Eyebrow`); labels bilingual where cheap (English · हिंदी).
- **Never** use the State Emblem, Digital India / Swachh Bharat logos, or ministry branding — the look is borrowed, the identity is not.

### UX principles (keep the guided flow simple)

- One question or one task per screen; one primary button; plain words. Details (evidence, sources, reasoning) sit behind "Show evidence" / "All details".
- New screens use `StepFrame`/`Choice` (onboarding) or `StepTitle`/`ActionBar` (guide) and the `.step-fwd`/`.step-back`/`.rise` transitions in globals.css.
- The onboarding profile (role, work, state, goal) is not personal data; it may be sent to the AI as context. State-specific rules are NOT researched yet — `stateNote()` must say so rather than guess.

### Adding things

- **A new rule**: add a `RuleDef` in `knowledge/rules.ts` (reuse an existing `check` with `params` if possible), add its id to the variant's `ruleIds` in `knowledge/applications.ts`, add sources to `sources.ts`. New check logic goes in `CHECKS` in `engine/checks.ts` with a test.
- **A new application**: add an `ApplicationDef` (variants, documents with a `why`, draftFields, ruleIds). Research first.
- **A new document type**: `DocTypeId` in `engine/types.ts`, definition + keywords in `knowledge/documents.ts`, a parser in `engine/extract/index.ts`, a layout in `demo/render.ts`, and tests in `extract.test.ts`.
- **A demo scenario**: `demo/scenarios.ts` (`SCENARIOS`), with `fixes` if it should show the re-check flow.

## Gotchas we already hit (read before debugging)

- **Next.js 16.4 with Cache Components** — read `node_modules/next/dist/docs/` first. Every client-only page (`/workspace/*`, `/start`, `/forms/*`, `/demo`, `/privacy`) is a thin **server** `page.tsx` that `export const instant = false` and renders a client component (`components/guide/GuidePage`, `components/StartFlow`, `components/forms/NspForm`, `components/pages/*`). New client pages must follow the same pattern. `instant` cannot be exported from a `"use client"` module (500 error), and a layout's `instant` does not cover its page (dev shows "Could not validate … Dropped segment"). Server `GET` route handlers are prerendered unless they call `await connection()`.
- **No `requestAnimationFrame` in processing code.** It pauses in background tabs and froze document processing. pdf.js renders with `intent: "print"` for this reason; the check page yields with `setTimeout`.
- **Zustand selectors must return stable values** — `useSession(s => s.session?.x.filter(...))` causes an infinite render loop. Select the raw value, derive outside.
- **Tesseract runs in PSM 11 (sparse text).** Auto mode dropped large isolated text like the masked Aadhaar number.
- **Hindi PDF text comes out in visual order** ("शमार्" for "शर्मा"); `repairVisualOrder` fixes it in `pdf.ts`.
- **Devanagari regex**: use `\uXXXX` escapes — nukta characters are decomposed and break character ranges.
- **Don't edit files with `node -e`/`sed` containing backslashes** — escapes get mangled (we shipped literal backspace characters once). Use the editor tool or a script file with `String.raw`.
- `pdf-lib`'s fontkit needs `regenerator-runtime` (imported in `demo/package.ts`).
- jsPDF fonts are Latin-1 only; `report.ts` transliterates Devanagari and replaces symbols.
- `btn()` already sets `inline-flex`; for responsive hiding wrap it (`<span className="hidden sm:block">`) instead of adding `hidden`.

## Rule audit

`docs/RULE_AUDIT.md` lists, for every rule of the four working applications (EPFO, NSP CSSS, PM-KISAN, ITR-1), the instrument, source, exact condition, exceptions, whether it changed, and the boundary test. When you touch a rule: update the row, keep `basis` honest (`secondary` until the official text is read), and add/adjust a boundary test in `src/engine/checks.test.ts`.

## Testing

- `npm test` covers name matching, transliteration, Hindi repair, validators, extraction (incl. Form 16 and land records) and rule boundary conditions.
- End-to-end in the browser (dev only): open `/demo`, then in the console
  `await window.__rl.evaluate("multiple")`, `await window.__rl.evaluate("multiple", true)` (with fixes applied), or
  `await window.__rl.evaluateCustom({ variantId: "nsp", defects: ["dob_swap"], photoDocs: true })`.
  Each scenario's `expected` text in `scenarios.ts` says what should be found. Re-run all scenarios after changing extraction, OCR or checks.

## Conventions

- TypeScript strict; match the surrounding style (small helpers, short comments explaining *why*).
- UI copy: plain language for first-time applicants; never "approved/eligible for sure"; say what was checked and what wasn't.
- Design tokens live in `app/globals.css` (navy/saffron portal palette, square radii); red/amber/green/blue are reserved for validation states.
- Commits: conventional style (`feat(engine): …`, `fix(ingest): …`). Keep `docs/PROGRESS.md` current.
