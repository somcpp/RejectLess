# RejectLess

**Prepare. Validate. Resolve. Submit with confidence.**

RejectLess checks your documents and the details you plan to enter *before* you submit a government application, explains every problem with evidence, and helps you fix it. It is privacy-first: documents are read inside your browser and never uploaded.

Supported today:

| Application                                   | Claim types                                                                             |
| --------------------------------------------- | --------------------------------------------------------------------------------------- |
| EPF withdrawal & settlement (EPFO)            | Final settlement (Form 19), Pension withdrawal (Form 10C), Partial withdrawal (Form 31) |
| Central Sector Scholarship (NSP, PM-USP CSSS) | Fresh application                                                                       |

## Run it

```bash
npm install          # also copies the pdf.js worker and Devanagari font into /public
npm run dev          # http://localhost:3000
npm test             # engine unit tests (Vitest)
```

Optional AI answers: copy `.env.example` to `.env.local` and set `GROQ_API_KEY`. Without a key, the assistant still works offline from the knowledge base.

## Demo in 3 minutes

1. Landing page → **Get started**: show onboarding (who you are → work type → state → goal, or "I'm not sure" → recommendation → plan). Then go back.
2. Open **/demo** → scenario **10 "Fix it and check again"** (or 02, 07, 08). Fictional documents are generated and read on the device.
3. **Documents** → **Confirm**: only values that differ between documents (Saurabh vs Sourabh) are asked about; "Show on document" highlights where each was read.
4. **Your details** → **Check my application**: real stages, then plain-language results with one action per issue.
5. Open **Show evidence** on an issue, then **Explain this** for a cited answer (turn on AI reasoning for Groq).
6. In the demo guide, **Apply** the corrections → **Check again** → issues move to **Fixed**.
7. **Download report**; open **Privacy** to show what's stored, then delete it. "All details" opens the full findings, evidence and profile views.

The **Scenario Builder** on /demo lets you plant any combination of 17 defects (name variants, Hindi names, DOB swaps, account typos, merged IFSCs, blur, cropping, missing documents, eligibility problems) and generates fresh documents that the real pipeline analyses — nothing is pre-scripted.

## Architecture

```
Browser (everything below runs on the user's device)
  ingest/      pdf.js text layer (+ Devanagari visual-order repair) · Tesseract.js OCR (eng+hin, PSM 11)
               · image quality (Laplacian sharpness, brightness, contrast, resolution, edge ink)
  engine/      extraction → unified profile → deterministic rule checks → findings with evidence
    identity/  Indian-name matching: transliteration (schwa deletion), phonetic keys, token alignment
    validators Aadhaar Verhoeff, PAN structure, IFSC structure + dated reference snapshot, dates, amounts
  knowledge/   versioned rule packs with sources, basis (official/secondary/engine/demo), dates
  assistant/   BM25 retrieval over the knowledge base · offline grounded answers
  store/       Zustand + IndexedDB, 24 h sliding expiry, one-click deletion
Server
  /api/assistant  optional: Groq (OpenAI-compatible) with JSON output + citation validation.
                  Receives only redacted questions and privacy-safe finding summaries.
```

Key decisions:

- **Code decides, models extract, the LLM only explains.** Every finding comes from a deterministic, unit-tested check. The AI cannot create or change a result; its citations are validated against the passages it was given.
- **Local-first.** No document server exists. Original files are not retained — only extracted fields (Aadhaar reduced to last 4 digits + checksum result) and small page previews for evidence.
- **Honest sources.** EPF rules reflect the *Employees' Provident Funds Scheme, 2026* (G.S.R. 525(E), 29 June 2026). Where the official text could not be retrieved, rules are marked **Verify** and cite the secondary sources used. Generic checks are labelled as RejectLess checks; illustrative rules as demo rules.
- **Next.js 16** (App Router, Cache Components), Tailwind v4, TypeScript.

## Limitations

- No access to EPFO, NSP, UIDAI, banks or the Income Tax Department — those items are shown as *External verification*.
- The bundled IFSC snapshot covers the demo's fictional banks only; real codes are reported as "could not be checked", never "invalid".
- All demo people, documents and identifiers are fictional and watermarked SPECIMEN.

## Roadmap

Private mode (in-browser LLM via WebLLM), embedding-based retrieval, Hindi UI, more application packs, CSC operator workspace.
