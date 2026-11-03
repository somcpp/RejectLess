"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, CircleCheck, CircleHelp, TriangleAlert } from "lucide-react";
import type { FieldKey } from "@/engine/types";
import { buildProfile, type ProfileValue } from "@/engine/profile";
import { compareNames } from "@/engine/identity/nameMatch";
import { digitsOnly, formatDate, maskIdentifier, parseAmount, parseDate } from "@/engine/validators";
import { btn, Card, ConfidenceMeter, Eyebrow } from "@/components/ui";
import { useActiveSession } from "@/lib/hooks";
import { FIELD_LABELS, PROFILE_SECTIONS, SENSITIVE_FIELDS } from "@/knowledge/documents";

type Agreement = "single" | "agree" | "variant" | "conflict";

const NAME_FIELDS: FieldKey[] = ["name", "name_local", "father_name", "account_holder"];

function agreement(key: FieldKey, vals: ProfileValue[]): Agreement {
  if (vals.length < 2) return "single";
  if (NAME_FIELDS.includes(key)) {
    const outcomes = vals.slice(1).map((v) => compareNames(vals[0].value, v.value).outcome);
    if (outcomes.includes("mismatch")) return "conflict";
    if (outcomes.includes("minor_variation") || outcomes.includes("insufficient")) return "variant";
    return "agree";
  }
  const norm = (v: string) => {
    if (key === "dob" || key === "doj" || key === "doe" || key === "issue_date") {
      const p = parseDate(v);
      return p ? formatDate(p) : v;
    }
    if (key === "account_number") return digitsOnly(v);
    if (key === "annual_income" || key === "balance") return String(parseAmount(v));
    return v.replace(/\s/g, "").toUpperCase();
  };
  return new Set(vals.map((v) => norm(v.value))).size === 1 ? "agree" : "conflict";
}

const AGREE_META: Record<Agreement, { label: string; cls: string; Icon: typeof CircleCheck } | null> = {
  single: null,
  agree: { label: "Matches", cls: "text-pass", Icon: CircleCheck },
  variant: { label: "Spelling variation", cls: "text-review", Icon: CircleHelp },
  conflict: { label: "Differs", cls: "text-action", Icon: TriangleAlert },
};

function display(v: ProfileValue): string {
  if (SENSITIVE_FIELDS.includes(v.key)) return maskIdentifier(v.key, v.value);
  if (["dob", "doj", "doe", "issue_date"].includes(v.key)) {
    const p = parseDate(v.value);
    return p ? formatDate(p) : v.value;
  }
  return v.value;
}

export function ProfilePage() {
  const { session, variant } = useActiveSession();
  if (!session || !variant) return null;
  const profile = buildProfile(session.documents, session.draft, variant);
  const merged: Partial<Record<FieldKey, ProfileValue[]>> = { ...profile };
  // Year of birth is shown alongside date of birth.
  if (profile.yob) merged.dob = [...(profile.dob ?? []), ...profile.yob];
  // Account holder names are compared with the applicant's name.
  const sections = PROFILE_SECTIONS.map((s) => ({ ...s, fields: s.fields.filter((f) => f !== "yob" && (merged[f]?.length ?? 0) > 0) })).filter((s) => s.fields.length);
  const conflicts = sections.flatMap((s) => s.fields).filter((f) => agreement(f, merged[f]!) === "conflict").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Step 4 · Applicant profile</Eyebrow>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">Your details, side by side</h1>
          <p className="mt-1 max-w-2xl text-ink-2">
            A temporary comparison of what each document says. It is not an identity record and is deleted with your session.
            {conflicts > 0 && <span className="font-medium text-action"> {conflicts} detail{conflicts > 1 ? "s differ" : " differs"} between sources.</span>}
          </p>
        </div>
        <Link href="/workspace/check" className={btn("primary")}>
          Run readiness check <ArrowRight className="size-4" />
        </Link>
      </div>

      {sections.length === 0 && (
        <Card className="p-8 text-center text-ink-2">
          Nothing to compare yet. <Link href="/workspace" className="font-medium text-accent">Add documents</Link> or fill in the details you plan to enter.
        </Card>
      )}

      {sections.map((sec) => (
        <Card key={sec.id} className="overflow-hidden">
          <p className="border-b border-line bg-surface-2 px-5 py-3 font-semibold">{sec.label}</p>
          <ul className="divide-y divide-line">
            {sec.fields.map((key) => {
              const vals = merged[key]!;
              const ag = agreement(key, vals);
              const meta = AGREE_META[ag];
              return (
                <li key={key} className={clsx("grid gap-3 px-5 py-4 md:grid-cols-[200px_1fr]", ag === "conflict" && "bg-action-soft/40", ag === "variant" && "bg-review-soft/40")}>
                  <div>
                    <p className="font-medium">{key === "account_holder" ? "Account holder name" : FIELD_LABELS[key]}</p>
                    {meta && (
                      <p className={clsx("mt-1 inline-flex items-center gap-1 text-[12px] font-medium", meta.cls)}>
                        <meta.Icon className="size-3.5" /> {meta.label}
                      </p>
                    )}
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {vals.map((v, i) => (
                      <li key={i} className="rounded-lg border border-line bg-surface px-3 py-2">
                        <p className="text-[12px] text-ink-3">
                          {v.docLabel}
                          {v.key === "yob" && " · year only"}
                          {v.key === "name_local" && " · local script"}
                        </p>
                        <p className="break-words text-[15px]">{display(v)}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          {v.source === "draft" ? <span className="text-[11px] text-ink-3">entered by you</span> : <ConfidenceMeter value={v.confidence} />}
                          {v.status === "edited" && <span className="text-[11px] text-external">corrected</span>}
                          {v.status === "confirmed" && <span className="text-[11px] text-pass">confirmed</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </div>
  );
}
