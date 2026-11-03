import type { Metadata } from "next";

export const metadata: Metadata = { title: "Application form", robots: { index: false } };

// Prefilled forms render from the session stored in this browser, so there is nothing to prerender.
export const instant = false;

export default function FormsLayout({ children }: LayoutProps<"/forms">) {
  return children;
}
