import { itemStatus } from "@/lib/types";

/** A garment's physical status, as a stamped badge. */
export default function StatusBadge({ status }: { status: string }) {
  const s = itemStatus(status);
  return <span className={`badge badge--${s.badge}`}>{s.label}</span>;
}
