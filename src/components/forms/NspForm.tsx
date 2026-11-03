"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, Check, ChevronRight, ExternalLink, Printer, X } from "lucide-react";
import { useActiveSession } from "@/lib/hooks";
import { prefillNsp, type Prefill } from "@/lib/prefill";
import { Spinner } from "@/components/ui";

// A prefilled copy of the National Scholarship Portal application form, so a first-time
// applicant can rehearse with their own checked values. Looks like the portal's form, but
// says whose site it is (header line), carries no emblem, and submits nothing — the "Final
// submit" only hands over to scholarships.gov.in. Nothing typed here leaves the browser.

type FieldType = "text" | "date" | "select" | "textarea";
interface Field {
  id: string;
  label: string;
  type?: FieldType;
  options?: string[];
  required?: boolean;
  help?: string;
}
interface Section {
  id: string;
  title: string;
  fields: Field[];
}

const SECTIONS: Section[] = [
  {
    id: "registration",
    title: "Registration details",
    fields: [
      { id: "domicile_state", label: "State of domicile", type: "select", options: [], required: true },
      { id: "scheme_category", label: "Scholarship category", type: "select", options: ["Post Matric", "Pre Matric", "Top Class / Merit"], required: true },
      { id: "name", label: "Name of student (as per Aadhaar)", required: true },
      { id: "dob", label: "Date of birth (DD/MM/YYYY)", required: true },
      { id: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Transgender"], required: true },
      { id: "mobile", label: "Mobile number (linked to Aadhaar)", required: true, help: "Not answered in RejectLess — enter the number that receives your OTP." },
      { id: "email", label: "Email ID" },
      { id: "bank_name", label: "Bank name", required: true },
      { id: "ifsc", label: "Bank IFSC code", required: true },
      { id: "account_number", label: "Bank account number", required: true, help: "Must be in the student's own name and Aadhaar-seeded." },
      { id: "aadhaar", label: "Aadhaar number", required: true, help: "RejectLess keeps only the last 4 digits. Enter the full 12-digit number on the portal." },
    ],
  },
  {
    id: "academic",
    title: "Academic details",
    fields: [
      { id: "institution", label: "Present institute", required: true },
      { id: "course", label: "Present course", required: true },
      { id: "course_year", label: "Present class / year", required: true },
      { id: "study_mode", label: "Mode of study", type: "select", options: ["Regular", "Correspondence / Distance"], required: true },
      { id: "academic_year", label: "Academic year", required: true },
      { id: "admission_date", label: "Date of admission (DD/MM/YYYY)", help: "From your fee receipt or ID card." },
      { id: "board", label: "Previous board / university", required: true },
      { id: "roll_number", label: "Previous roll number", required: true },
      { id: "year_of_passing", label: "Previous passing year", required: true },
      { id: "percentage", label: "Previous class % marks", required: true },
      { id: "stream", label: "Stream" },
      { id: "hosteller", label: "Day scholar / hosteller", type: "select", options: ["Day scholar", "Hosteller"] },
      { id: "fees", label: "Total fees paid this year (₹)" },
    ],
  },
  {
    id: "basic",
    title: "Basic details",
    fields: [
      { id: "father_name", label: "Father's name", required: true },
      { id: "mother_name", label: "Mother's name", required: true },
      { id: "religion", label: "Religion", type: "select", options: ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Parsi", "Other"], required: true },
      { id: "community", label: "Community / category", type: "select", options: ["General", "SC", "ST", "OBC", "EWS"], required: true },
      { id: "annual_income", label: "Annual family income (₹)", required: true },
      { id: "income_cert_authority", label: "Income certificate issued by" },
      { id: "income_cert_date", label: "Income certificate date (DD/MM/YYYY)" },
      { id: "disability", label: "Person with disability?", type: "select", options: ["No", "Yes"] },
      { id: "marital", label: "Marital status", type: "select", options: ["Unmarried", "Married"] },
      { id: "other_scholarship", label: "Availing any other scholarship?", type: "select", options: ["No", "Yes"], required: true },
    ],
  },
  {
    id: "contact",
    title: "Contact details",
    fields: [
      { id: "address", label: "Address", type: "textarea", required: true, help: "Not answered in RejectLess." },
      { id: "district", label: "District", required: true },
      { id: "block", label: "Block / taluk" },
      { id: "pincode", label: "PIN code", required: true },
    ],
  },
  {
    id: "documents",
    title: "Upload documents",
    fields: [],
  },
];

const DOCS = ["Income certificate", "Previous year marksheet", "Bonafide / institute verification form", "Bank passbook (first page)", "Aadhaar", "Caste / community certificate (if applicable)", "Photograph"];

export function NspFormPage() {
  const { session, hydrated, latestRun } = useActiveSession();
  const base = useMemo(() => (session ? prefillNsp(session, latestRun) : {}), [session, latestRun]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  // Autofill animation: each section is typed in, field by field, the first time it is shown.
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [filling, setFilling] = useState<{ title: string; i: number; n: number; id?: string } | null>(null);
  const animated = useRef(new Set<string>());
  const section = SECTIONS[step] as Section | undefined;
  useEffect(() => {
    if (!section || !hydrated || animated.current.has(section.id)) return;
    animated.current.add(section.id);
    const fields = section.fields.filter((f) => base[f.id]?.value);
    let cancelled = false;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      await wait(450);
      if (cancelled) return;
      setFilling({ title: section.title, i: 0, n: fields.length });
      for (let k = 0; k < fields.length; k++) {
        const f = fields[k];
        const v = base[f.id].value;
        setFilling({ title: section.title, i: k, n: fields.length, id: f.id });
        if (f.type === "select") {
          await wait(220);
          if (cancelled) return;
          setTyped((t) => ({ ...t, [f.id]: v }));
        } else {
          for (let c = 1; c <= v.length; c++) {
            await wait(v.length > 25 ? 8 : 16);
            if (cancelled) return;
            setTyped((t) => ({ ...t, [f.id]: v.slice(0, c) }));
          }
        }
        await wait(110);
      }
      if (cancelled) return;
      setFilling(null);
    })();
    return () => {
      cancelled = true;
      // If the user leaves mid-way, complete the section instantly so nothing is left half-typed.
      setTyped((t) => ({ ...t, ...Object.fromEntries(fields.map((f) => [f.id, base[f.id].value])) }));
      setFilling(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, hydrated, base]);
  const val = (id: string) => values[id] ?? typed[id] ?? "";

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-ink-3">
        <Spinner /> Loading your details…
      </div>
    );
  }
  if (!session) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-[22px] font-bold text-accent">No application to fill from</p>
        <p className="mt-2 text-ink-2">Run a check first; the form fills itself from your documents.</p>
        <Link href="/start" className="mt-6 inline-block bg-accent px-5 py-3 font-semibold text-white">Start a check</Link>
      </main>
    );
  }

  const filled = Object.keys(base).length;
  const flaggedCount = Object.values(base).filter((p) => p.flagged).length;

  return (
    <div className="min-h-screen bg-[#eef3f9] text-ink">
      {/* Portal-style masthead (deliberately not the real one: no emblem, our own name) */}
      <header className="border-b border-[#c9d6e8] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-[22px] font-bold text-[#1a4f9c]">Scholarship Application Form <span className="font-dev text-[16px] font-semibold">· छात्रवृत्ति आवेदन पत्र</span></p>
            <p className="text-[13px] text-ink-2">Post-Matric Scholarship · prefilled by RejectLess from your checked documents</p>
          </div>
          <a href="https://scholarships.gov.in/" target="_blank" rel="noreferrer" className="hidden items-center gap-1 text-[13px] font-semibold text-[#1a4f9c] underline underline-offset-2 sm:inline-flex">
            Official portal: scholarships.gov.in <ExternalLink className="size-3.5" />
          </a>
        </div>
        <nav className="bg-[#1a4f9c] text-white">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 text-[12px] font-semibold uppercase tracking-wide">
            {["Home", "Applicant corner", "Schemes", "Help desk"].map((t) => (
              <span key={t} className={clsx("px-3 py-2.5", t === "Applicant corner" && "bg-white/15")}>{t}</span>
            ))}
          </div>
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-3 border border-[#f3c98b] bg-[#fff6e5] px-4 py-3 text-[14px]">
          {filling ? <Spinner className="size-4 shrink-0 text-[#1a4f9c]" /> : <Check className="size-4 shrink-0 text-pass" />}
          <p className="min-w-0 flex-1" aria-live="polite">
            {filling ? (
              <><span className="font-semibold">RejectLess is filling {filling.title}…</span> {Math.min(filling.i + 1, filling.n)} of {filling.n}</>
            ) : (
              <><span className="font-semibold">{filled} fields filled from what you typed in RejectLess.</span> Green = from your answers or documents; red = a mismatch is still open in your results.{flaggedCount ? ` (${flaggedCount} to fix)` : ""}</>
            )}
          </p>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 border border-[#1a4f9c] px-3 py-1.5 text-[13px] font-semibold text-[#1a4f9c] hover:bg-[#1a4f9c]/5">
            <Printer className="size-4" /> Print this sheet
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <ol className="border border-[#c9d6e8] bg-white lg:sticky lg:top-4 lg:self-start">
            {SECTIONS.map((s, i) => (
              <li key={s.id} className="border-b border-[#e3eaf4] last:border-b-0">
                <button onClick={() => setStep(i)} className={clsx("flex w-full items-center gap-3 px-3 py-3 text-left text-[14px]", i === step ? "bg-[#1a4f9c] font-semibold text-white" : "hover:bg-[#f3f7fc]")}>
                  <span className={clsx("flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold", i < step ? "bg-pass text-white" : i === step ? "bg-white text-[#1a4f9c]" : "bg-[#e3eaf4] text-ink-2")}>
                    {i < step ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  {s.title}
                </button>
              </li>
            ))}
            <li>
              <button onClick={() => setStep(SECTIONS.length)} className={clsx("flex w-full items-center gap-3 px-3 py-3 text-left text-[14px]", step === SECTIONS.length ? "bg-[#1a4f9c] font-semibold text-white" : "hover:bg-[#f3f7fc]")}>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e3eaf4] text-[12px] font-bold text-ink-2">{SECTIONS.length + 1}</span>
                Final submit
              </button>
            </li>
          </ol>

          <div className="border border-[#c9d6e8] bg-white">
            {section ? (
              <>
                <h2 className="border-b border-[#c9d6e8] bg-[#eaf1fb] px-5 py-3 text-[16px] font-bold text-[#1a4f9c]">{section.title}</h2>
                {section.id === "documents" ? (
                  <div className="p-5">
                    <p className="text-[14px] text-ink-2">Upload a PDF or JPG for each. Use the files you already checked, or the DigiLocker copies.</p>
                    <ul className="mt-4 divide-y divide-[#e3eaf4] border border-[#e3eaf4]">
                      {DOCS.map((d) => {
                        const have = d === "Photograph" ? !!session.photo : session.documents.some((x) => x.status !== "failed" && d.toLowerCase().includes(x.typeId === "marksheet_12" ? "marksheet" : x.typeId === "bank_passbook" ? "passbook" : x.typeId.replace("_", " ")));
                        return (
                          <li key={d} className="flex items-center gap-3 px-4 py-3 text-[14px]">
                            {have ? <Check className="size-4 text-pass" /> : <span className="size-4 border border-ink-3" />}
                            <span className="flex-1">{d}</span>
                            <span className="text-[12px] text-ink-3">{have ? (d === "Photograph" && session.photo ? `Ready · ${Math.round(session.photo.bytes / 1024)} KB` : "Verified") : "Required"}</span>
                            {d === "Photograph" && session.photo && <a href={session.photo.dataUrl} download="passport-photo.jpg" className="text-[12px] font-semibold text-accent underline underline-offset-2">Download</a>}
                            <span className="border border-[#c9d6e8] px-2 py-1 text-[12px] text-ink-2">Choose file</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <div className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
                    {section.fields.map((f) => (
                      <FieldRow key={f.id} f={f} base={base} value={val(f.id)} typing={filling?.id === f.id} onChange={(v) => setValues((s) => ({ ...s, [f.id]: v }))} />
                    ))}
                  </div>
                )}
                <div className="flex justify-between border-t border-[#c9d6e8] bg-[#f7f9fc] px-5 py-3">
                  <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="px-4 py-2 text-[14px] font-semibold text-[#1a4f9c] disabled:opacity-40">Back</button>
                  <button onClick={() => setStep(step + 1)} className="inline-flex items-center gap-1 bg-[#1a4f9c] px-5 py-2 text-[14px] font-semibold text-white hover:bg-[#143d7a]">
                    Save &amp; continue <ChevronRight className="size-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="p-5">
                <h2 className="text-[18px] font-bold text-[#1a4f9c]">Final submit</h2>
                <p className="mt-2 text-[14px] text-ink-2">Submitting locks the form and sends it to your institute for verification. Check every section once more before you proceed.</p>
                <label className="mt-4 flex items-start gap-2 text-[14px]">
                  <input type="checkbox" className="mt-1 size-4" /> I declare that the information given above is correct to the best of my knowledge.
                </label>
                <button onClick={() => setDone(true)} className="mt-5 bg-[#1a4f9c] px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-[#143d7a]">Final submit</button>
              </div>
            )}
          </div>
        </div>
      </main>

      {done && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal>
          <div className="max-w-md border border-line bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[20px] font-bold text-accent">Your form is ready</h2>
              <button onClick={() => setDone(false)} aria-label="Close"><X className="size-5" /></button>
            </div>
            <p className="mt-2 text-[14px] text-ink-2">Applications are accepted only on the official portal. Finish there in four steps:</p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[14px] text-ink-2">
              <li>Fix anything marked red in your RejectLess results.</li>
              <li>Open scholarships.gov.in, complete One-Time Registration (OTR) with your Aadhaar-linked mobile.</li>
              <li>Enter the values from this form field by field (print it if that helps).</li>
              <li>Upload the same documents, then track the status until your institute verifies it.</li>
            </ol>
            <a href="https://scholarships.gov.in/" target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 bg-saffron px-5 py-2.5 text-[14px] font-semibold text-white">
              Continue on scholarships.gov.in <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ f, base, value, typing, onChange }: { f: Field; base: Prefill; value: string; typing?: boolean; onChange: (v: string) => void }) {
  const p = base[f.id];
  const shown = !!value;
  const cls = clsx("mt-1 w-full border bg-white px-3 py-2 text-[14px] transition-colors duration-300", typing ? "border-[#1a4f9c] ring-2 ring-[#1a4f9c]/25" : p?.flagged && shown ? "border-action bg-action-soft/40" : p && shown ? "border-pass/50 bg-pass-soft/30" : "border-[#c9d6e8]");
  const options = f.id === "domicile_state" && p ? [p.value] : f.options;
  return (
    <label className={clsx("block", f.type === "textarea" && "sm:col-span-2")}>
      <span className="text-[13px] font-semibold text-ink">
        {f.label} {f.required && <span className="text-action">*</span>}
      </span>
      {f.type === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={cls}>
          <option value="">-- Select --</option>
          {(options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
          {value && !(options ?? []).includes(value) && <option value={value}>{value}</option>}
        </select>
      ) : f.type === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
      <span className="mt-1 flex items-center gap-1.5 text-[12px]">
        {typing ? (
          <span className="text-[#1a4f9c]">Filling…</span>
        ) : p?.flagged && shown ? (
          <span className="inline-flex items-center gap-1 font-semibold text-action"><AlertTriangle className="size-3.5" /> Mismatch open in your check — fix before using</span>
        ) : p && shown ? (
          <span className="inline-flex items-center gap-1 text-pass"><Check className="size-3.5" /> From {p.source}</span>
        ) : p ? (
          <span className="text-ink-3">&nbsp;</span>
        ) : (
          <span className="text-ink-3">{f.help ?? "Enter on the portal"}</span>
        )}
      </span>
    </label>
  );
}
