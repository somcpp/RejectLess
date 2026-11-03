import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site";
import { BasisTag, Eyebrow } from "@/components/ui";
import { SOURCES } from "@/knowledge/sources";
import { LIMITATIONS } from "@/lib/reportData";

export const metadata: Metadata = { title: "About, methodology & terms" };

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl space-y-14 px-4 py-12 text-[15px] leading-relaxed text-ink-2 sm:px-6">
        <section>
          <Eyebrow>About</Eyebrow>
          <h1 className="mt-2 text-[32px] font-semibold tracking-tight text-ink">Know what is wrong before you submit.</h1>
          <p className="mt-4">
            Many applications for government services are returned for avoidable reasons: a name spelt differently by the bank, a date of birth that does not match Aadhaar, a missing document or a rule that changed. RejectLess moves those checks to before you apply.
          </p>
          <p className="mt-3">
            RejectLess is an independent preparation tool. It is not a government platform, does not submit applications, does not access government databases and cannot guarantee approval.
          </p>
        </section>

        <section id="methodology" className="scroll-mt-24">
          <h2 className="text-[22px] font-semibold text-ink">Methodology</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5">
            <li><strong className="text-ink">Reading documents.</strong> Digital PDFs are read from their text layer (Hindi text stored in visual order is repaired). Photos and scans are recognised on-device with Tesseract (English + Hindi). Only the fields an application needs are extracted, each with its page location and a confidence score.</li>
            <li><strong className="text-ink">Quality.</strong> Sharpness (variance of the Laplacian), brightness, contrast, resolution and ink at the edges are measured to flag blurred, dark or cropped images.</li>
            <li><strong className="text-ink">Names.</strong> Names are Unicode-normalised, honorifics removed, Devanagari transliterated with schwa deletion, and compared part by part using exact, transliteration, phonetic, initial and one-vowel matches. Differences in consonants are treated as different names. The outcome is one of: consistent, minor variation (review), significant mismatch, or insufficient information — never a single opaque score.</li>
            <li><strong className="text-ink">Formats.</strong> Aadhaar (12 digits, Verhoeff checksum), PAN (structure and holder type), IFSC (structure, then a dated reference snapshot). These are format checks, not verification.</li>
            <li><strong className="text-ink">Rules.</strong> Each application has versioned rules with a source, effective date and last-verified date. The rule engine is deterministic; AI never decides a result.</li>
            <li><strong className="text-ink">Assistant.</strong> Answers are retrieved from a knowledge base built from the rule pack and curated guidance. Optional AI reasoning (Groq-hosted open models) receives only privacy-safe summaries and must cite passages; uncited answers are labelled.</li>
          </ol>
          <h3 className="mt-6 font-semibold text-ink">How rules are labelled</h3>
          <ul className="mt-2 space-y-2">
            <li><BasisTag basis="official" /> taken from an official government source.</li>
            <li><BasisTag basis="secondary" /> based on reputable reporting; the official text could not be retrieved — check the official portal.</li>
            <li><BasisTag basis="engine" /> a data-quality check by RejectLess, not an official requirement.</li>
            <li><BasisTag basis="demo" /> an illustrative rule for the demo.</li>
          </ul>
          <h3 className="mt-6 font-semibold text-ink">Sources</h3>
          <ul className="mt-2 space-y-2 text-[14px]">
            {SOURCES.filter((s) => !s.url.startsWith("/")).map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{s.title}</a>
                <span className="text-ink-3"> — {s.publisher} · {s.kind} · accessed {s.accessedOn}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="limitations" className="scroll-mt-24">
          <h2 className="text-[22px] font-semibold text-ink">Limitations</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            {LIMITATIONS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>

        <section id="terms" className="scroll-mt-24">
          <h2 className="text-[22px] font-semibold text-ink">Terms of use</h2>
          <p className="mt-3">RejectLess provides general information and automated checks to help you prepare. It is not legal, tax or financial advice and not an official determination of eligibility. Always follow the instructions of the authority you are applying to. Use RejectLess only with your own documents or documents you are authorised to handle.</p>
        </section>

        <section id="feedback" className="scroll-mt-24">
          <h2 className="text-[22px] font-semibold text-ink">Feedback</h2>
          <p className="mt-3">Found a rule that is out of date or a check that got it wrong? Please tell us which application and rule ID (shown on every finding) — but never send us your documents.</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
