import { ReviewPage } from "@/components/pages/workspace-review";

// Client-only page: a server wrapper so `instant = false` can opt it out of instant-navigation validation.
export const instant = false;

export default function Page() {
  return <ReviewPage />;
}
