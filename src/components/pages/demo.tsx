"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, Download, Eye, FlaskConical, Wand2 } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site";
import { Button, Card, Eyebrow, Notice, Spinner } from "@/components/ui";
import { BUILDER_DEFECTS, SCENARIOS, buildScenario, type BuilderOptions, type DocSpec, type Scenario } from "@/demo/scenarios";
import { PERSONAS } from "@/demo/personas";
import { loadScenario } from "@/lib/actions";
import { setCustomScenario } from "@/demo/custom";
import { getApplication } from "@/knowledge/applications";
import { DOC_TYPES } from "@/knowledge/documents";
import { useSession } from "@/lib/store/session";

export function DemoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string>();
  const [error, setError] = useState<string>();
  const session = useSession((s) => s.session);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") void import("@/demo/devHarness").then((m) => m.installHarness());
  }, []);

  async function open(s: Scenario) {
    if (session && !session.demoScenarioId && session.documents.length) {
      if (!window.confirm("Opening a demo replaces your current session and deletes its documents from this browser. Continue?")) return;
    }
    setLoading(s.id);
    setError(undefined);
    try {
      if (s.id === "custom") setCustomScenario(s);
      const pending = loadScenario(s);
      router.push("/workspace");
      await pending;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(undefined);
    }
  }

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <Eyebrow>Demo sandbox</Eyebrow>
        <h1 className="mt-2 text-[32px] font-semibold tracking-tight">Try RejectLess with fictional applicants</h1>
        <p className="mt-2 max-w-3xl text-ink-2">
          Each scenario generates real PDF and photo documents for a fictional person. They go through the same pipeline as your own uploads — text extraction, OCR, quality analysis, cross-document checks and rules. Nothing is pre-scripted: results are computed live.
        </p>
        <Notice tone="external" className="mt-4 flex items-start gap-2">
          <FlaskConical className="mt-0.5 size-4 shrink-0" />
          All people, documents, banks and identifiers here are invented and watermarked &ldquo;SPECIMEN&rdquo;. Results are not statistics about real applications.
        </Notice>
        {error && <Notice tone="action" className="mt-4">{error}</Notice>}

        <ScenarioBuilder onRun={open} loading={loading === "custom"} />

        <h2 className="mt-12 text-[20px] font-semibold">Seeded scenarios</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {SCENARIOS.map((s) => (
            <ScenarioCard key={s.id} s={s} onOpen={() => open(s)} loading={loading === s.id} disabled={!!loading} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function ScenarioCard({ s, onOpen, loading, disabled }: { s: Scenario; onOpen: () => void; loading: boolean; disabled: boolean }) {
  const app = getApplication(s.appId)!;
  const variant = app.variants.find((v) => v.id === s.variantId)!;
  const persona = PERSONAS[s.personaId];
  const [showDocs, setShowDocs] = useState(false);
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-[13px] font-semibold tabular text-ink-2">{s.number}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{s.title}</p>
          <p className="text-[13px] text-ink-3">
            {persona.name} · {app.shortName} · {variant.name}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[14px] text-ink-2">{s.story}</p>
      <p className="mt-2 text-[13px] text-ink-3">
        <span className="font-medium text-ink-2">Expected:</span> {s.expected}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {s.tags.map((t) => (
          <span key={t} className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-ink-3">{t}</span>
        ))}
        {s.fixes.length > 0 && <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">includes fix walkthrough</span>}
      </div>
      {showDocs && <DocPack docs={s.docs} />}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <Button onClick={onOpen} disabled={disabled}>
          {loading ? <Spinner /> : null} Open scenario <ArrowRight className="size-4" />
        </Button>
        <Button variant="ghost" onClick={() => setShowDocs(!showDocs)}>
          <Eye className="size-4" /> {showDocs ? "Hide" : "View"} documents ({s.docs.length})
        </Button>
      </div>
    </Card>
  );
}

function DocPack({ docs }: { docs: DocSpec[] }) {
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number>();
  async function preview(i: number) {
    const { specPreviewUrl } = await import("@/demo/package");
    setThumbs((t) => ({ ...t, [i]: "" }));
    const url = await specPreviewUrl(docs[i]);
    setThumbs((t) => ({ ...t, [i]: url }));
  }
  async function download(i: number) {
    setBusy(i);
    const { specToFile } = await import("@/demo/package");
    const f = await specToFile(docs[i]);
    const url = URL.createObjectURL(f);
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setBusy(undefined);
  }
  return (
    <ul className="mt-4 space-y-2 rounded-xl border border-line bg-surface-2 p-3">
      {docs.map((d, i) => (
        <li key={i} className="text-[13px]">
          <div className="flex items-center gap-2">
            <span className="flex-1 truncate">
              {DOC_TYPES[d.type].short} <span className="text-ink-3">· {d.format === "pdf" ? "digital PDF" : "phone photo"}{d.degrade ? " (degraded)" : ""}</span>
            </span>
            <button className="text-accent hover:underline" onClick={() => preview(i)}>Preview</button>
            <button className="inline-flex items-center gap-1 text-accent hover:underline" onClick={() => download(i)} disabled={busy === i}>
              {busy === i ? <Spinner className="size-3" /> : <Download className="size-3" />} File
            </button>
          </div>
          {thumbs[i] !== undefined &&
            (thumbs[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbs[i]} alt={`${DOC_TYPES[d.type].short} specimen preview`} className="mt-2 w-full rounded-lg border border-line" />
            ) : (
              <p className="mt-2 flex items-center gap-2 text-ink-3"><Spinner className="size-3" /> Rendering…</p>
            ))}
        </li>
      ))}
      <li className="pt-1 text-[12px] text-ink-3">Download the files and drag them into a normal session to test the upload path yourself.</li>
    </ul>
  );
}

const VARIANTS: { id: BuilderOptions["variantId"]; label: string }[] = [
  { id: "final-settlement", label: "EPF final settlement" },
  { id: "pension-withdrawal", label: "EPS pension withdrawal" },
  { id: "partial-withdrawal", label: "EPF partial withdrawal" },
  { id: "nsp", label: "NSP scholarship" },
];

function ScenarioBuilder({ onRun, loading }: { onRun: (s: Scenario) => void; loading: boolean }) {
  const [variantId, setVariantId] = useState<BuilderOptions["variantId"]>("final-settlement");
  const [defects, setDefects] = useState<string[]>(["name_spelling", "account_typo"]);
  const [photoDocs, setPhotoDocs] = useState(false);
  const available = BUILDER_DEFECTS.filter((d) => d.applies.includes(variantId));
  const groups = Array.from(new Set(available.map((d) => d.group)));
  const toggle = (id: string) => setDefects((ds) => (ds.includes(id) ? ds.filter((x) => x !== id) : [...ds, id]));

  return (
    <Card className="mt-10 overflow-hidden">
      <div className="border-b border-line bg-surface-2 px-5 py-4 sm:px-6">
        <p className="flex items-center gap-2 font-semibold">
          <Wand2 className="size-4 text-accent" /> Scenario Builder
        </p>
        <p className="mt-0.5 text-[14px] text-ink-3">Pick the problems to plant. RejectLess renders fresh documents and finds them on its own.</p>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Application">
          {VARIANTS.map((v) => (
            <button
              key={v.id}
              role="radio"
              aria-checked={variantId === v.id}
              onClick={() => (setVariantId(v.id), setDefects((ds) => ds.filter((d) => BUILDER_DEFECTS.find((x) => x.id === d)!.applies.includes(v.id))))}
              className={clsx("rounded-full border px-3 py-1.5 text-[13px]", variantId === v.id ? "border-ink bg-ink text-white" : "border-line-strong hover:bg-surface-2")}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <fieldset key={g}>
              <legend className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-3">{g}</legend>
              <div className="space-y-1.5">
                {available
                  .filter((d) => d.group === g)
                  .map((d) => (
                    <label key={d.id} className="flex cursor-pointer items-start gap-2 text-[14px]">
                      <input type="checkbox" checked={defects.includes(d.id)} onChange={() => toggle(d.id)} className="mt-1 accent-[var(--accent)]" />
                      {d.label}
                    </label>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={photoDocs} onChange={(e) => setPhotoDocs(e.target.checked)} className="accent-[var(--accent)]" />
            Use phone photos instead of digital PDFs (exercises on-device OCR; slower)
          </label>
          <Button onClick={() => onRun(buildScenario({ variantId, defects, photoDocs }))} disabled={loading}>
            {loading ? <Spinner /> : <Wand2 className="size-4" />} Generate & analyse
          </Button>
        </div>
      </div>
    </Card>
  );
}
