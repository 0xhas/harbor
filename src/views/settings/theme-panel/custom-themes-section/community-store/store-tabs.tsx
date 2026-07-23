import { LayoutGrid, Medal, Sparkles } from "lucide-react";
import { MarketSegmented, type SegmentedItem } from "./market/market-segmented";

export type StoreTab = "discover" | "themes" | "badges" | "awards";

const TABS: SegmentedItem[] = [
  { id: "discover", label: "Discover", icon: <Sparkles size={15} strokeWidth={2.2} /> },
  { id: "themes", label: "Themes", icon: <LayoutGrid size={15} strokeWidth={2.2} /> },
  { id: "badges", label: "Badge bundles", icon: <Medal size={15} strokeWidth={2.2} /> },
];

export function StoreTabs({
  active,
  onSelect,
}: {
  active: StoreTab;
  onSelect: (t: StoreTab) => void;
}) {
  return <MarketSegmented items={TABS} active={active} onSelect={(id) => onSelect(id as StoreTab)} />;
}
