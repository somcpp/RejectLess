# RejectLess — progress

_Last updated: 2026-11-03. Update this file when you finish or start something; Claude reads it via CLAUDE.md._

## Where things stand (2026-11-03)

- **Applications checkable end to end**: EPFO (Form 19 / 10C / 31), NSP Central Sector Scholarship, PM-KISAN registration, ITR-1 (Sahaj). ~40 central and 12+ per-state schemes browsable under their ministry / state department, marked "Coming soon".
- **Rules**: 46 versioned rules, each with sources, basis label and a row in `docs/RULE_AUDIT.md`; 10 document types (incl. Form 16, land record).
- **Quality**: 117 unit tests (engine, extraction, rule boundaries, scanner geometry, triage, rejection decoder); 15 seeded demo scenarios + Scenario Builder with 18 defects; CDP scripts drive the demo headlessly for screenshots.
- **Chrome**: government-portal visual language (GIGW/UX4G), bilingual labels, Listen, text size, accessibility statement.

## Done (MVP, 2026-11-02 baseline)

- **Applications**: EPFO final settlement (Form 19), pension withdrawal (Form 10C), partial withdrawal (Form 31); NSP Central Sector Scholarship (fresh). Others shown as "coming soon".
- **Rules**: 34 versioned rules with sources and basis labels. EPF rules follow the EPF Scheme, 2026 (G.S.R. 525(E), 29 Jun 2026).
- **Document reading (in browser)**: pdf.js text layer + Hindi visual-order repair; Tesseract OCR (English + Hindi); doc-type detection; field extraction with page boxes and confidence; image quality checks; file validation by magic bytes.
- **Checks**: completeness, quality, cross-document consistency (name, DOB, father's name, account, IFSC, income), Indian-name matching (scripts, spellings, initials, order), Aadhaar/PAN/IFSC formats, IFSC merger reference, EPF eligibility (waiting periods, TDS, service, limits), scholarship eligibility, external-verification items, explicit "could not check".
- **Workspace**: consent gate → prepare → review (evidence highlights, corrections) → profile → staged check → findings (evidence, reasoning, sources, resolution history) → PDF report.
- **Assistant**: offline answers from the knowledge base (BM25); optional Groq AI with redaction, privacy-safe summaries and validated citations. Groq key verified working (API level).
- **Privacy**: local processing, 24 h sliding expiry, originals not kept, Privacy Centre with verified deletion.
- **Demo**: 14 seeded scenarios with fix walkthroughs; Scenario Builder with 17 plantable defects; dev harness `window.__rl`.
- **Quality**: 71 unit tests; all scenarios verified in browser.

## Changes since the baseline (newest last)

- **Guided UX (redesign)**: minimal landing page; onboarding at /start (who you are, work type, state, goal, "not sure" PF recommender, plan + consent); guided workspace (documents one at a time → confirm only unclear/differing values → details → check → plain-language results with one action per issue, evidence on demand, "Explain this"); floating Ask; detailed views kept under "All details". AI reasoning clicked through in the UI with Groq (grounded, cited).

- **Clear results & help for first-time applicants (2026-11-02)**: results grouped into five tappable groups — Fix now, Documents needed, Check these, Confirm on portal, Passed (`lib/triage.ts`; engine statuses unchanged, "could not check" findings now carry `missingInput`). Passed shows which document and which details matched; Documents needed shows where to get each document (`knowledge/authorities.ts` → `DOC_SOURCES`) with a clearly-labelled **simulated DigiLocker** flow (adds a fictional specimen in demo sessions; otherwise explains the real download); Confirm-on-portal is a tickable checklist. Ministry/department, portal, helpline, fee and timeline per application (`AUTHORITIES`) shown on the goal and plan screens and in results. Government-portal visual cues (tricolour band, bilingual labels, A/A/A text size) without any emblem or claim to be official. Guided workspace now has Back, Home, numbered icon stages (tap a completed stage to return), and "Listen" (browser speech) on every step title.

- **Government-portal visual redesign (2026-11-02)**: the whole UI now follows the look of Indian government portals (GIGW / UX4G conventions, india.gov.in, NSP, EPFO): navy primary + saffron accent + India-green success, light-grey page with white square-cornered boxed panels, Noto Sans + Noto Sans Devanagari. Shared chrome in `components/site.tsx` (TopBar → Masthead → navy NavBar; dense footer with website policies and "Last updated") and `components/gov.tsx` (TopBar with Skip-to-content, screen-reader link, A-/A/A+; `Panel` with coloured header strip; `AuthorityCard`). Landing page rebuilt as a portal: hero band, notice strip, Services grid (each goal with its department and form), How it works, Official helplines panel. Onboarding uses the same chrome; workspace header has a navy tab bar (Home · Step by step · detail tabs); guide stepper is numbered circles joined by a line. Radius tokens are overridden globally in `globals.css` so every `rounded-*` class became square-cornered without touching each component. Accessibility statement added at `/privacy#accessibility`.

- **Less sensitive "hard to read" (2026-11-02)**: sharpness is now contrast-normalised (`engine/quality.ts`) so dark or faded photos aren't called blurred; OCR confidence is length-weighted (`lib/ingest/ocr.ts`); `doc_quality` drops exposure/focus warnings when OCR ≥ 80% and every key field was read, and is "action" only when details were actually lost (`engine/checks.ts`); field low-confidence threshold 0.75 → 0.65; marksheet labels matched loosely (CBSE/state-board wording, Hindi labels, "nn.nn %" fallback). Dev harness gained `window.__rl.photoOf(type, persona, degrade?)`; a CDP driver script lets Claude run the harness headlessly.

- **No more confidence numbers for users (2026-11-02)**: `engine/readability.ts` is the single answer to "could we read it?" — a document "read well" when its key details came out at ≥ 65% (or were confirmed/edited); then picture-level warnings (blur, dark, cropped, low OCR average) are dropped from findings, the review page and the document status. Percentages, meters and "certainty" are gone from the review page and finding details; a value below the threshold just gets a "Hard to read — check" tag. Real-photo case that motivated it: Aadhaar with a 42% OCR average but every field read at 77–82%.

- **Four working applications + scheme catalogue (2026-11-02)**: PM-KISAN registration and ITR-1 (Sahaj) are now checkable alongside EPFO and NSP. New document types `form16` and `land_record` (parsers + tests; no demo renderer yet). New checks: `declaration_any` (PM-KISAN exclusion list), `itr_form`, `deadline`, parametrised `declaration`/`own_account`. Onboarding now goes role → state → **ministry/department → scheme** → plan (`knowledge/ministries.ts`: 54 Union ministries with Hindi names + a 15-department template per state and 22 known state portals; `knowledge/schemes.ts`: ~40 central schemes and 12 template + flagship schemes per state, all non-working ones marked "Coming soon" with docs/portal). "I'm not sure" keeps the old role-based shortlist.
- **Rule audit (2026-11-02)**: `docs/RULE_AUDIT.md` — instrument, source, condition, exceptions, change status and test for every rule of the four applications; 28 boundary tests in `engine/checks.test.ts`. Findings: EPF-2026 numbers stay *Verify* (gazette not retrieved; 75%/100% conflict); CSSS income is "up to ₹4.5 lakh" officially while the rule is strict `<` (decision pending); CSSS ₹12,000 unconfirmed (official 2019: ₹10,000/₹20,000); ITR due dates secondary only.

- **Results page: five sections, vertical (2026-11-03)**: left-hand numbered list — 1 Passed (per document, which details matched), 2 Documents needed (missing docs, "could not check" details and poor photos, each with where to get it, what to fill in, DigiLocker, re-upload tips), 3 Needs review (all mismatches, with "Aadhaar (page 1) vs Bank passbook (page 2)" evidence and *where to fix it* per document from `CORRECTIONS`), 4 External verifications (new `knowledge/verifications.ts`: per-scheme official portals + a generic set for every scheme — link, what to enter, what you should see, why; state-specific e-District / Bhulekh portals filled in; tickable), 5 Confirm on portal (engine `external` findings, tickable). "Fix now"/"Check these" merged into Needs review.

- **Practice copy of the NSP form (2026-11-03)**: `/forms/nsp` (opened in a new tab from the results page for NSP checks) — a prefilled copy of the National Scholarship Portal application form (no "practice" wording; one header line says it is prefilled by RejectLess, no emblem) (Registration → Academic → Basic → Contact → Upload documents → Final submit), prefilled by `lib/prefill.ts` from document fields and typed details only; every field shows its source, fields with an open mismatch are marked red, and "Final submit" only shows a what-next checklist (nothing is stored or sent). Looks like the portal form; "Final submit" hands over to scholarships.gov.in.

- **NSP details step mirrors the portal; form autofills visibly (2026-11-03)**: the NSP "What will you type on the portal?" step now asks the form's own fields grouped as Registration / Academic / Basic / Contact details (`DraftFieldDef.section`). `/forms/nsp` fills strictly from those answers ("From what you typed"), using a document value only where an answer is blank (labelled "From your Aadhaar" etc.). The page loads empty and RejectLess types each field in turn with a progress strip ("Filling Registration details… 6 of 8"); each section animates the first time it is opened.

- **Sample answers + marksheet totals (2026-11-03)**: the NSP details step fills itself once with sample answers (`demo/sampleDraft.ts`, fictional "Saurabh Rajput" at KIET, UP Board 73%) when nothing has been typed, with a "sample — change anything / Clear all" banner. Marksheet percentage is now computed from the totals row ("कुल योग 365 / 500", or Total + Maximum marks) when no percentage line is printed, instead of grabbing a stray "nn%" (UP/Bihar board layouts); labelled percentages above 100 are ignored.

- **Dev fixes (2026-11-03)**: client-only pages are now server `page.tsx` wrappers exporting `instant = false` (the "Could not validate … Dropped segment" dev message is gone; `instant` cannot be exported from a `"use client"` file). Details step gained "Fill blanks with sample answers" for sessions that already have some answers. Marksheet totals parsing also accepts OCR'd columns ("Total 500 365"). Review page has a dev-only "Copy recognised text" button for diagnosing misread layouts.

- **Marksheet plausibility + demo overrides (2026-11-03)**: a Class XII percentage below the 33% pass mark is treated as a misread and not reported. `lib/demoOverrides.ts` reads `NEXT_PUBLIC_DEMO_OVERRIDES` (dev builds only, per-machine `.env`) to pin extracted values such as `marksheet_12.percentage`; applied at extraction and to already-stored documents on load; the review page labels it "demo override active".

- **Confirm step shows everything read (2026-11-03)**: one card per document listing every extracted detail with ✓ "That's right" / Fix / Show, flagged rows (hard to read, differs from another document) first with a saffron edge, and a "Show document" preview that highlights where each tapped detail was read. Previously only flagged values were listed, so a clean scan showed nothing.

- **Photo, scanner, finder, decoder (2026-11-03)**:
  - *Passport photo step* (`guide/PhotoStep.tsx`, `lib/photo.ts`): take/choose → drag-zoom crop to the portal size → JPEG compressed under the limit → download; stored locally as `session.photo`; NSP variant declares `photoSpec`. The filled form marks the photograph "Ready".
  - *Glare*: new `glare` quality metric (share of saturated pixels) and issue; demo degrade `glare`, builder defect, seeded scenario 15 "Glare on the Aadhaar photo". Confirm step shows advisories (issues dropped because the details were still read) with a Retake/replace button.
  - *Smart document scanner* (`engine/scan/geometry.ts` pure + tests; `lib/scanner.ts`; `components/scanner/DocumentScanner.tsx`): live Otsu-threshold sheet detection with corner overlay, guidance (closer/back/dark/glare/hold still), auto-capture when steady, homography perspective correction, "document mode" enhancement (local-background normalisation), up to 4 pages → JPEG or one PDF via pdf-lib; "Scan with camera" on the Documents step and in the assistant; file fallback without a camera.
  - *Scheme finder* (`knowledge/eligibility.ts`, `assistant/SchemeFinder.tsx`): deterministic screens for 8 schemes (CSSS, NMMSS, PM-KISAN, EPFO, ITR, APY, PM-SYM, e-Shram) → fits / needs info / doesn't apply, with each condition's basis and what's still missing; unresearched schemes are never offered as eligible. "Check my documents for this" starts a session.
  - *Rejection decoder* (`knowledge/rejections.ts` 20 reasons, `lib/rejection.ts` + tests, `assistant/RejectionDecoder.tsx`): upload a notice (OCR on device) or paste text → matched reasons with English/Hindi meaning, evidence lines, the RejectLess rule, fix steps and verification links; no match → optional redacted question to the assistant.
  - All three appear as *Tools* at the top of the assistant panel.

- **Photo assessment; no more "confidence is low" (2026-11-03)**: the pipeline no longer emits the `low_ocr_confidence` issue (the OCR average stays as a metric; readability is judged per field). The passport photo is assessed after cropping (`assessPhoto`: glare measured on the central face area, exposure, focus) and the ready card says "The image has glare — …" with retake advice, or "Looks clear".

## Known gaps

- [ ] Scanner tested on synthetic frames only; try on real phones (lighting, autofocus delays, rear-camera selection).

- [ ] Demo renderer layouts for Form 16 and land records (so PM-KISAN / ITR demos can run end to end).
- [ ] State departments are a template; real per-state structures and scheme pages not researched.
- [ ] NSP-INCOME strictness (`<` vs `<=`) — read the current-year CSSS guidelines PDF.

- [ ] Visual redesign verified by screenshots on desktop; check phone widths and the AssistantPanel / EvidenceViewer styling by hand.

- [ ] DigiLocker is simulated only; a real integration needs requester registration with MeitY.
- [ ] Helplines/timelines in `AUTHORITIES` are from the portals/citizen charter as accessed on 2026-11-02 — re-verify before launch; 14470 is secondary-sourced.

- [ ] No Playwright end-to-end tests yet.
- [ ] Hindi questions to the AI untested; Hindi UI not built.
- [ ] State-specific rules (income certificate issuer/validity per state) not researched — onboarding collects the state and says so.
- [ ] IFSC reference covers fictional demo banks only — bundle a dated RBI extract.
- [ ] "Verify" rules need confirming against the official EPF Scheme 2026 gazette text and NSP guidelines.
- [ ] PDF report shows Devanagari transliterated (no Devanagari font in jsPDF).
- [ ] Not deployed; no accessibility audit beyond basics.

## Next phases

1. **Demo readiness** — deploy (Vercel, set `GROQ_API_KEY`; do NOT set `NEXT_PUBLIC_DEMO_OVERRIDES` there), test the scanner and photo step on a phone, Playwright tests for the demo path (the CDP scripts in the scratchpad are a starting point), rehearse README demo script.
2. **Trust** — real IFSC dataset, confirm "Verify" rules (EPF 2026 gazette, CSSS current-year PDF, CBDT due-date circulars), Devanagari font in report, accessibility pass.
3. **Hindi-first** — Hindi UI, Hindi assistant answers (decoder already bilingual), optional voice (Groq Whisper).
4. **Smarter AI** — embedding retrieval, Private mode (in-browser LLM via WebLLM; deferred by decision), opt-in vision model for messy scans.
5. **More applications** — certificates (income/caste/domicile via state e-District), more scholarships (NMMSS, post-matric SC/ST/OBC), more EPFO claim types; demo renderers for Form 16 / land record. Research-backed rules only.
6. **Assisted service** — CSC operator dashboard, multiple applicants, consent-based handover.
7. **Integrations** (with authorisation) — real DigiLocker (requester registration), official verification APIs; filled forms for EPFO / PM-KISAN / ITR like `/forms/nsp`.

## Decisions log

- 2026-11-02 — AI provider: Groq (`openai/gpt-oss-120b`, fallback `llama-3.3-70b-versatile`). AI only explains; it never sees exact personal details.
- 2026-11-02 — Private mode (in-browser LLM) deferred to a later phase.
- 2026-11-02 — Scope: EPFO (3 claim types) + one scholarship pack, broad demo rather than many shallow applications.
- 2026-11-02 — Look like an Indian government portal (GIGW/UX4G grammar) but never use the State Emblem, ministry logos or "Government of India" as our identity; every page says RejectLess is independent.
- 2026-11-02 — Results are grouped for users by `lib/triage.ts`; engine statuses are never changed by the UI. "Could not check" and poor photos count as to-dos (Documents needed), not errors.
- 2026-11-02 — Users never see confidence percentages; readability is judged per field (`engine/readability.ts`) and shown as a "hard to read — check" tag only.
- 2026-11-03 — The filled NSP form (`/forms/nsp`) carries no "practice" wording but keeps one header line "prefilled by RejectLess" and a link to the official portal; no emblem; nothing is submitted. It is filled from the user's typed answers, with document values only as a labelled fallback.
- 2026-11-03 — Per-machine demo overrides (`NEXT_PUBLIC_DEMO_OVERRIDES`, dev only, labelled in the UI) are allowed for rehearsals; the parser is never hardcoded for one person's document.
- 2026-11-03 — Client-only pages are server `page.tsx` wrappers exporting `instant = false` (Next.js 16.4 Cache Components).
- 2026-11-03 — Scheme finder screens only schemes with researched conditions; rejection decoder matches only known reasons; AI may explain but never adds eligibility or reasons.

## Who is working on what

| Area | Person | Status |
|---|---|---|
| _example: Playwright tests_ | _name_ | _in progress_ |
