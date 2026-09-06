import { niceDate, type Status } from "@/lib/types";

export default function StatusBadge({
  status,
  availableFrom,
}: {
  status: Status | string;
  availableFrom?: string | null;
}) {
  if (status === "available") return <span className="badge badge--available">Available</span>;
  if (status === "soon") {
    return (
      <span className="badge badge--soon">
        {availableFrom ? `From ${niceDate(availableFrom)}` : "Available soon"}
      </span>
    );
  }
  return <span className="badge badge--borrowed">Currently borrowed</span>;
}
