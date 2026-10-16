import PinGate from "@/components/pin-gate";

/*
 * The template studio (home + template library). The PIN gate lives here
 * rather than in the root layout so that sibling sections — such as
 * /business-analysis, which has its own server-side auth — are not wrapped
 * in the studio's client-side lock and header.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return <PinGate>{children}</PinGate>;
}
