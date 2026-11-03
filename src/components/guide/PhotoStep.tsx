"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Download, RotateCcw, Sun, Trash2, Upload } from "lucide-react";
import type { ApplicationVariant } from "@/engine/types";
import { Button, Spinner } from "@/components/ui";
import { useSession } from "@/lib/store/session";
import { assessPhoto, blobToDataUrl, compressUnder, loadPhoto, renderCrop, type CropView } from "@/lib/photo";

/** Take or choose a picture, crop it to the portal's photo size, compress it under the limit, download. */
export function PhotoStep({ spec }: { spec: NonNullable<ApplicationVariant["photoSpec"]> }) {
  const photo = useSession((s) => s.session?.photo);
  const setPhoto = useSession((s) => s.setPhoto);
  const [src, setSrc] = useState<HTMLCanvasElement>();
  const [view, setView] = useState<CropView>({ zoom: 1, dx: 0, dy: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const preview = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; dx: number; dy: number } | undefined>(undefined);
  const ratio = spec.width / spec.height;

  // Redraw the crop preview whenever the picture or the view changes.
  useEffect(() => {
    if (!src || !preview.current) return;
    const c = renderCrop(src, spec.width, spec.height, view);
    const ctx = preview.current.getContext("2d")!;
    preview.current.width = spec.width;
    preview.current.height = spec.height;
    ctx.drawImage(c, 0, 0);
  }, [src, view, spec.width, spec.height]);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setError(undefined);
    try {
      setSrc(await loadPhoto(f));
      setView({ zoom: 1, dx: 0, dy: 0 });
    } catch {
      setError("That picture could not be opened. Use a JPG or PNG.");
    }
  }

  async function finish() {
    if (!src) return;
    setBusy(true);
    try {
      const c = renderCrop(src, spec.width, spec.height, view);
      const { blob } = await compressUnder(c, spec.maxKb);
      const { issues } = assessPhoto(c);
      setPhoto({ dataUrl: await blobToDataUrl(blob), bytes: blob.size, width: spec.width, height: spec.height, at: new Date().toISOString(), issues });
      setSrc(undefined);
    } finally {
      setBusy(false);
    }
  }

  if (photo) {
    return (
      <section className="gov-panel">
        <div className="gov-panel-head"><Camera className="size-4" /> {spec.label} — ready</div>
        <div className="flex flex-wrap items-start gap-5 p-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.dataUrl} alt="Your prepared passport photo" width={photo.width / 3} height={photo.height / 3} className="border border-line" />
          <div className="min-w-0 flex-1 text-[14px]">
            {photo.issues?.length ? (
              <div className="mb-3 flex items-start gap-2 border border-review/30 bg-review-soft px-3 py-2 text-[#5f3a05]">
                <Sun className="mt-0.5 size-4 shrink-0 text-review" />
                <div>
                  {photo.issues.map((i) => <p key={i} className="font-semibold">{i}</p>)}
                  <p className="mt-1 text-[13px]">Portals reject photos with reflections or shadows on the face. You can still download this one, but a retake is safer.</p>
                </div>
              </div>
            ) : (
              <p className="mb-2 flex items-center gap-1.5 font-semibold text-pass"><Check className="size-4" /> Looks clear — no glare, well lit, in focus</p>
            )}
            <p className="flex items-center gap-1.5 font-semibold text-ink"><Check className="size-4 text-pass" /> {photo.width}×{photo.height} px · {Math.round(photo.bytes / 1024)} KB JPG — within the {spec.maxKb} KB limit</p>
            <p className="mt-1 text-ink-2">Download it and upload the same file on the portal. {spec.note}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={photo.dataUrl} download="passport-photo.jpg" className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-[14px] font-semibold text-white hover:bg-accent-hover">
                <Download className="size-4" /> Download photo
              </a>
              <Button variant="ghost" onClick={() => setPhoto(undefined)}><Trash2 className="size-4" /> Replace</Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="gov-panel">
      <div className="gov-panel-head"><Camera className="size-4" /> {spec.label}</div>
      <div className="p-5">
        {!src ? (
          <>
            <p className="text-[14px] text-ink-2">The portal needs a recent passport-size photo as a small JPG ({spec.width}×{spec.height} px, under {spec.maxKb} KB). Take one or choose one, and we&rsquo;ll crop and shrink it for you.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => cameraInput.current?.click()}><Camera className="size-4" /> Take a photo</Button>
              <Button variant="secondary" onClick={() => fileInput.current?.click()}><Upload className="size-4" /> Choose a picture</Button>
              <input ref={cameraInput} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))} />
              <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ""))} />
            </div>
            <ul className="mt-4 list-disc space-y-0.5 pl-5 text-[13px] text-ink-3">
              <li>Plain light background, face straight to the camera, no cap or sunglasses.</li>
              <li>Recent (within 6 months) and the same photo you will use on the form.</li>
            </ul>
            {error && <p className="mt-3 text-[13px] text-action">{error}</p>}
          </>
        ) : (
          <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
            <div>
              <canvas
                ref={preview}
                style={{ width: 200, height: 200 / ratio, touchAction: "none", cursor: "grab" }}
                className="border-2 border-accent bg-white"
                onPointerDown={(e) => {
                  drag.current = { x: e.clientX, y: e.clientY, dx: view.dx, dy: view.dy };
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!drag.current) return;
                  setView((v) => ({ ...v, dx: drag.current!.dx + (e.clientX - drag.current!.x) / 200, dy: drag.current!.dy + (e.clientY - drag.current!.y) / (200 / ratio) }));
                }}
                onPointerUp={() => (drag.current = undefined)}
                aria-label="Crop preview — drag to move"
              />
              <p className="mt-1 text-[12px] text-ink-3">Drag to move</p>
            </div>
            <div className="text-[14px]">
              <label className="block">
                <span className="font-semibold">Zoom</span>
                <input type="range" min={1} max={3} step={0.02} value={view.zoom} onChange={(e) => setView((v) => ({ ...v, zoom: Number(e.target.value) }))} className="mt-1 w-full accent-[var(--accent)]" />
              </label>
              <p className="mt-2 text-ink-2">Fit your head and shoulders inside the frame, like a passport photo.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={finish} disabled={busy}>{busy ? <Spinner /> : <Check className="size-4" />} Use this photo</Button>
                <Button variant="ghost" onClick={() => setView({ zoom: 1, dx: 0, dy: 0 })}><RotateCcw className="size-4" /> Reset</Button>
                <Button variant="ghost" onClick={() => setSrc(undefined)}>Choose another</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
