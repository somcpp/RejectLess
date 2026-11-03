// Builds docs/architecture/index.html from template.html, inlining brand logos from
// Simple Icons (CC0) so the diagram renders offline. Run: node scripts/build-architecture.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "architecture");
let html = readFileSync(join(dir, "template.html"), "utf8");

const cache = new Map();
async function logo(slug, color) {
  const key = `${slug}/${color ?? ""}`;
  if (!cache.has(key)) {
    const res = await fetch(`https://cdn.simpleicons.org/${slug}${color ? `/${color}` : ""}`);
    if (!res.ok) throw new Error(`Logo not found: ${slug} (${res.status})`);
    cache.set(key, Buffer.from(await res.text()).toString("base64"));
  }
  return cache.get(key);
}

const logoTags = [...html.matchAll(/<i data-logo="([^"]+)"(?: data-color="([0-9a-fA-F]{6})")?><\/i>/g)];
for (const [tag, slug, color] of logoTags) {
  html = html.replace(tag, `<img alt="" src="data:image/svg+xml;base64,${await logo(slug, color)}" />`);
}
html = html.replace(/<i data-badge="([^"]+)" data-c="(#[0-9a-fA-F]{6})"><\/i>/g, (_m, text, c) => `<span class="badge" style="--c:${c}">${text}</span>`);
// A logo tag that also carries a badge fallback (no public logo) becomes the badge.
html = html.replace(/<i data-logo="[^"]+" data-badge="([^"]+)" data-c="(#[0-9a-fA-F]{6})"><\/i>/g, (_m, text, c) => `<span class="badge" style="--c:${c}">${text}</span>`);

writeFileSync(join(dir, "index.html"), html);
console.log(`docs/architecture/index.html written (${logoTags.length} logos inlined, ${cache.size} unique).`);
