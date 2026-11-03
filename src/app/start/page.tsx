import { StartPage } from "@/components/StartFlow";

// The page is fully client-side (it renders from the session in this browser), so there is
// nothing for instant-navigation validation to check. `instant` must live in a server module.
export const instant = false;

export default function Page() {
  return <StartPage />;
}
