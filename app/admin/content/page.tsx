import { getContent } from "@/lib/queries";
import ContentForm from "@/components/admin/ContentForm";

export const dynamic = "force-dynamic";

export default async function AdminContent() {
  const content = await getContent();
  return (
    <>
      <div className="label label--rule" style={{ margin: "0 0 1.4rem" }}>Page content</div>
      <p className="muted" style={{ maxWidth: "56ch", marginBottom: "2rem" }}>
        The wording on the catalogue page. Edit it here and save — the public site picks it
        up straight away, with no code changes. Clearing a field puts the original wording
        back.
      </p>
      <ContentForm content={content} />
    </>
  );
}
