# RejectLess — progress

_Last updated: 2026-11-02. Update this file when you finish or start something; Claude reads it via CLAUDE.md._

## Done (MVP)

- **Applications**: EPFO final settlement (Form 19), pension withdrawal (Form 10C), partial withdrawal (Form 31); NSP Central Sector Scholarship (fresh). Others shown as "coming soon".
- **Rules**: 34 versioned rules with sources and basis labels. EPF rules follow the EPF Scheme, 2026 (G.S.R. 525(E), 29 Jun 2026).
- **Document reading (in browser)**: pdf.js text layer + Hindi visual-order repair; Tesseract OCR (English + Hindi); doc-type detection; field extraction with page boxes and confidence; image quality checks; file validation by magic bytes.
- **Checks**: completeness, quality, cross-document consistency (name, DOB, father's name, account, IFSC, income), Indian-name matching (scripts, spellings, initials, order), Aadhaar/PAN/IFSC formats, IFSC merger reference, EPF eligibility (waiting periods, TDS, service, limits), scholarship eligibility, external-verification items, explicit "could not check".
- **Workspace**: consent gate → prepare → review (evidence highlights, corrections) → profile → staged check → findings (evidence, reasoning, sources, resolution history) → PDF report.
- **Assistant**: offline answers from the knowledge base (BM25); optional Groq AI with redaction, privacy-safe summaries and validated citations. Groq key verified working (API level).
- **Privacy**: local processing, 24 h sliding expiry, originals not kept, Privacy Centre with verified deletion.
- **Demo**: 14 seeded scenarios with fix walkthroughs; Scenario Builder with 17 plantable defects; dev harness `window.__rl`.
- **Quality**: 71 unit tests; all scenarios verified in browser.
- **Guided UX (redesign)**: minimal landing page; onboarding at /start (who you are, work type, state, goal, "not sure" PF recommender, plan + consent); guided workspace (documents one at a time → confirm only unclear/differing values → details → check → plain-language results with one action per issue, evidence on demand, "Explain this"); floating Ask; detailed views kept under "All details". AI reasoning clicked through in the UI with Groq (grounded, cited).

- **Clear results & help for first-time applicants (2026-11-02)**: results grouped into five tappable groups — Fix now, Documents needed, Check these, Confirm on portal, Passed (`lib/triage.ts`; engine statuses unchanged, "could not check" findings now carry `missingInput`). Passed shows which document and which details matched; Documents needed shows where to get each document (`knowledge/authorities.ts` → `DOC_SOURCES`) with a clearly-labelled **simulated DigiLocker** flow (adds a fictional specimen in demo sessions; otherwise explains the real download); Confirm-on-portal is a tickable checklist. Ministry/department, portal, helpline, fee and timeline per application (`AUTHORITIES`) shown on the goal and plan screens and in results. Government-portal visual cues (tricolour band, bilingual labels, A/A/A text size) without any emblem or claim to be official. Guided workspace now has Back, Home, numbered icon stages (tap a completed stage to return), and "Listen" (browser speech) on every step title.

## Known gaps

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

1. **Demo readiness** — deploy (Vercel, set `GROQ_API_KEY`), test on a phone, Playwright tests for the demo path, rehearse README demo script.
2. **Trust** — real IFSC dataset, confirm "Verify" rules, Devanagari font in report, accessibility pass.
3. **Hindi-first** — Hindi UI, Hindi assistant answers, optional voice (Groq Whisper).
4. **Smarter AI** — embedding retrieval, Private mode (in-browser LLM via WebLLM; deferred by decision), opt-in vision model for messy scans.
5. **More applications** — PM-KISAN, certificates, more scholarships, more EPFO claim types. Research-backed rules only.
6. **Assisted service** — CSC operator dashboard, multiple applicants, consent-based handover.
7. **Integrations** (with authorisation) — DigiLocker, official verification APIs, rejection-notice reading.

## Decisions log

- 2026-11-02 — AI provider: Groq (`openai/gpt-oss-120b`, fallback `llama-3.3-70b-versatile`). AI only explains; it never sees exact personal details.
- 2026-11-02 — Private mode (in-browser LLM) deferred to a later phase.
- 2026-11-02 — Scope: EPFO (3 claim types) + one scholarship pack, broad demo rather than many shallow applications.

## Who is working on what

| Area | Person | Status |
|---|---|---|
| _example: Playwright tests_ | _name_ | _in progress_ |
