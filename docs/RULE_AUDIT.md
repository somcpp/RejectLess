# Rule audit — the four working applications

_Audited 2026-11-02. Re-run this audit whenever a rule pack version changes. Boundary tests live in `src/engine/checks.test.ts`._

Legend for **Basis** (shown to users as a tag):

| Basis | Meaning |
|---|---|
| `official` | Condition read from a government publisher (portal page, guidelines PDF, gazette). |
| `secondary` | Reported by reputable secondary sources; official text not retrieved. UI shows **Verify**. |
| `engine` | Generic RejectLess data-quality / consistency check — not a government requirement. |
| `demo` | Illustrative only. |

Every row answers: instrument → source → exact condition → exceptions → changed? → test.

## A. Generic checks (all four applications)

| Rule | Instrument | Source | Condition as implemented | Exceptions / notes | Basis | Test |
|---|---|---|---|---|---|---|
| GEN-DOCS | — | RejectLess | Required documents present; conditional PAN for EPF TDS. | Missing document → `action`; "could not check" for TDS when dates/balance missing. | engine | scenarios `missing-docs` |
| GEN-QUALITY | — | RejectLess | Document "read well" (key fields ≥ 65%) suppresses pixel-level warnings; `action` only when details were lost. | See `engine/readability.ts`. | engine | harness `poor-scan`, photo runs |
| GEN-KEYFIELDS | — | RejectLess | Key fields per document type found and ≥ 65%. | Aadhaar may show year of birth only. | engine | `extract.test.ts` |
| GEN-AADHAAR-FORMAT | UIDAI Verhoeff checksum | uidai.gov.in | 12 digits; checksum valid; masked numbers evaluable only on last 4. | Format ≠ validity. | engine | `validators.test.ts` |
| GEN-PAN-FORMAT | PAN structure (Income Tax Dept.) | incometax.gov.in | `AAAAA9999A`, 4th char `P` for individuals. | Non-individual PANs flagged. | engine | `validators.test.ts` |
| GEN-PAN-SURNAME | PAN 5th char = first letter of surname (Protean/UTIITSL practice) | pan-services | Compared with name on PAN/Aadhaar. | Convention, not law; `review` only. | secondary | — |
| GEN-IFSC-FORMAT | RBI IFSC structure | rbi.org.in | 4 letters + `0` + 6 alphanumerics. | | official | `validators.test.ts` |
| GEN-IFSC-REFERENCE | RBI IFSC list | rbi.org.in | Lookup in a **dated snapshot of fictional demo banks** — real banks are "not in snapshot" → `review`. | **Gap**: bundle a real RBI extract. | engine | `ifsc` tests |
| GEN-ACCOUNT/IFSC-CONSISTENCY, GEN-DOB-CONSISTENCY | — | RejectLess | Same value across documents and the typed draft; swapped-digit / DD-MM hints. | | engine | `nameMatch.test.ts`, scenarios |

## B. EPFO — Form 19 / 10C / 31

Instrument: **Employees' Provident Funds Scheme, 2026** (reported notified 29 June 2026, replacing the 1952 Scheme). The gazette text could not be retrieved (egazette.gov.in search); all 2026-specific conditions rely on Business Standard / TaxGuru / Tribune reporting and remain **Verify**.

| Rule | Condition implemented | Official? | Exceptions | Changed? | Boundary test |
|---|---|---|---|---|---|
| EPF-FINAL-WAIT | ≥ 12 months since date of exit for premature final settlement. | secondary (BS 2026-07-09, TaxGuru) | Age ≥ 58 → not applicable. Assumes no new EPF-covered job (EPFO confirms). | Yes — was 2 months before the 2026 Scheme. | 12 mo pass / 11 mo fail / 58+ / no DOE → could-not-check |
| EPF-TDS-PAN | TDS applies if service < 5 years **and** amount ≥ ₹50,000; 10% with PAN, 20% without (s.192A). | Income Tax Dept. (portal) + secondary summary | Form 15G/15H (Form 121 from 1 Apr 2026 under the 2025 Act) if below taxable limit. | Form name change 2026. | 59 mo + ₹50,000 → likely; 60 mo → no; ₹49,999 → no |
| EPF-10C-SERVICE | Eligible service < 10 years for withdrawal benefit. | EPS 1995 para 14 (via secondary) | ≥ 10 years → scheme certificate / pension. | No. | 119 mo pass / 120 fail |
| EPF-10C-MIN | ≥ 6 months service. | secondary (sources disagree) | — | Unclear post-2024. | — (marked Verify) |
| EPF-10C-WAIT | ≥ 36 months since exit (reported). | secondary | Age ≥ 58. | Yes (2026). | shares code with EPF-FINAL-WAIT |
| EPF-31-MEMBERSHIP | ≥ 12 months membership for any partial withdrawal. | secondary (TaxGuru, BS) | — | Yes (was 5–7 yrs for some purposes). | 12 pass / 11 fail |
| EPF-31-AMOUNT | ≤ 75% of balance (25% must remain); min ₹1,000. | secondary — **sources conflict (75% vs 100%)** | — | Yes. | 75% pass / 75%+1 fail / ₹999 fail |
| EPF-31-PURPOSE | Purpose selected (essential / housing / special). | secondary (CBT Oct 2025) | — | 13 categories merged into 3. | — |
| EPF-NAME / EPF-FATHER / EPF-DOE-PRESENT / EPF-DATE-ORDER | Consistency checks on UAN/Aadhaar/bank names, dates. | engine / EPFO member portal | — | — | `nameMatch.test.ts` |
| EPF-BANK-NOTE | Cheque/passbook upload not required since Apr 2025. | secondary (PTI/BS reporting a Ministry statement) | — | Yes (2025). | — |
| EPF-EXTERNAL | UAN KYC, DOE recorded, OTP mobile. | EPFO member portal (official) | — | — | — |

**Open items**: retrieve the 2026 Scheme gazette; settle the 75%/100% cap; confirm the 6-month EPS minimum.

## C. NSP — Central Sector Scholarship (CSSS)

Instrument: **CSSS scheme guidelines (Dept. of Higher Education, 2019 edition; official page education.gov.in/node/255)**. The official page was reached; the figures below are from it unless noted.

| Rule | Condition implemented | Official? | Exceptions | Changed? | Boundary test |
|---|---|---|---|---|---|
| NSP-INCOME | Family income **< ₹4,50,000**. | Official page says "**up to** ₹4.5 lakh" — i.e. ₹4,50,000 itself is eligible. **Implemented as strict `<`; see note.** | — | No. | ₹4,49,999 pass / ₹4,50,000 fail (documents the current strictness) |
| NSP-MARKS | Above 80th percentile of the board → always `external` (cut-off not available offline). | official | — | — | — |
| NSP-REGULAR | Regular (not distance/correspondence) course. | official | — | — | — |
| NSP-OTHER-SCHOLARSHIP | Not availing another scholarship. | official | — | — | — |
| NSP-OWN-ACCOUNT | Bank account in the student's own name, Aadhaar-seeded (DBT). | NSP portal | Parent's account → `action`. | — | — |
| NSP-INCOME-RECENT | Certificate ≤ 12 months old. | **demo** — issuer/validity differ by state. | — | — | — |
| Amount | ₹10,000 p.a. (UG, 3 yrs) / ₹20,000 (PG) per 2019 guidelines; ₹12,000 reported by secondary sites **not confirmed**. Not a rule; shown nowhere as fact. | | | | |

**Decision needed**: change NSP-INCOME to `<=` to match "up to"? Kept strict until the current-year guidelines PDF is read, because some state portals phrase it as "less than". Flagged in UI copy as "below the limit".

## D. PM-KISAN — new farmer registration

Instrument: **Revised Operational Guidelines, 21 June 2019** (pmkisan.gov.in PDF, official). e-KYC mandate is a later portal notice (official portal banner), not in the PDF.

| Rule | Condition implemented | Official? | Exceptions | Changed? | Boundary test |
|---|---|---|---|---|---|
| PMK-EXCLUSIONS | Any of: institutional landholder; constitutional-post holder; serving/retired govt employee; pensioner ≥ ₹10,000/month; income-tax payer last AY; professional (doctor, engineer, lawyer, CA, architect). | official (guidelines §exclusions) | Group D / MTS employees and pensioners are **not** excluded. | Landholding ceiling (2 ha) removed in 2019 — not implemented as a limit. | any yes → action; all no → pass; unanswered → review |
| PMK-LAND | Land record present (khata number). | official (land in family's name per state records) | State verifies; RejectLess only checks presence + name match. | — | missing → action |
| PMK-NAME / PMK-OWN-ACCOUNT | Aadhaar name = bank holder = land-record holder; own account. | official (Aadhaar-seeded DBT) | Family = husband, wife, minor children. | — | — |
| PMK-EXTERNAL | Aadhaar seeding (NPCI), e-KYC, state land verification, one beneficiary per family. | official portal | — | e-KYC added. | — |

## E. Income tax return — ITR-1 (Sahaj), AY 2026-27

Instrument: **Income-tax Act 1961 s.139 / s.139AA; ITR-1 conditions as published on the e-Filing portal**. For FY 2026-27 onward the **Income-tax Act 2025** applies — rules here are for AY 2026-27 (FY 2025-26) and must be re-audited next year.

| Rule | Condition implemented | Official? | Exceptions | Changed? | Boundary test |
|---|---|---|---|---|---|
| ITR-FORM | Resident individual; total income ≤ ₹50 lakh; salary/pension, ≤ 2 house properties, other sources; agri ≤ ₹5,000; LTCG u/s 112A ≤ ₹1.25 lakh; no business/foreign. | official (portal) | Brought-forward losses also exclude ITR-1 (not asked). | Two house properties and 112A gains allowed from AY 2025-26/2026-27 (secondary). | ₹50,00,000 pass / +1 fail; agri 5,000/5,001; LTCG 1,25,000/1,25,001; business; non-resident |
| ITR-PAN-LINK | PAN linked to Aadhaar (s.139AA); unlinked = inoperative. | official | Exempt categories (NRIs, 80+, non-citizens, some states) not modelled. | Fee for late linking. | no → action; unsure → review |
| ITR-DUE | Due 31 Jul 2026; belated until 31 Dec 2026; late fee u/s 234F (₹1,000 ≤ ₹5 lakh income, else ₹5,000). | **secondary** — CBDT circular not retrieved | Audit cases 31 Oct (reported extended to 21 Nov 2026). | Yearly. | on due date pass; after → review; after 31 Dec → action |
| ITR-FORM16-PAN | Employee PAN on Form 16 equals PAN card. | engine | — | — | same/different |
| ITR-NAME | Name across PAN/Aadhaar/Form 16/bank. | engine | — | — | — |
| ITR-EXTERNAL | 26AS/AIS match, bank pre-validation, e-verify within 30 days, PAN operative. | official (portal) | — | e-verify window 30 days since Aug 2022. | — |

## F. What was NOT confirmed (do not present as official)

1. EPF Scheme 2026 gazette text (G.S.R. number unverified) — every EPF-2026 number stays **Verify**.
2. EPF partial-withdrawal cap: 75% (BS, Bajaj) vs 100% (Tribune, CBT decision Oct 2025).
3. EPS withdrawal 6-month minimum after the 2024 amendment.
4. CSSS scholarship amount (₹10,000 official 2019 vs ₹12,000 reported).
5. ITR due-date extensions for AY 2026-27 (secondary only).
6. State department names/portals beyond the 22 portals listed in `knowledge/ministries.ts`; all per-state scheme entries are `secondary`.
7. DigiLocker availability of the EPF passbook (not confirmed; parsers point to the EPFO portal).
