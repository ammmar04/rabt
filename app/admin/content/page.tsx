import Link from "next/link";
import { getStoredContent } from "@/lib/queries";
import { PAGES, findPage } from "@/lib/content";
import ContentForm from "@/components/admin/ContentForm";

export const dynamic = "force-dynamic";

export default async function AdminContent({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: asked } = await searchParams;
  const page = findPage(asked ?? "") ?? PAGES[0];
  const stored = await getStoredContent(page.page);

  return (
    <>
      <div className="label label--rule" style={{ margin: "0 0 1rem" }}>Website content</div>
      <p className="muted" style={{ maxWidth: "62ch", marginBottom: "1.4rem" }}>
        Choose a page, change its wording, and save. The public site shows the new wording
        straight away — no code changes. Anything you change can be put back with
        &ldquo;Restore original&rdquo;.
      </p>

      <nav className="page-pick" aria-label="Pages">
        {PAGES.map((p) => (
          <Link key={p.page} className="chip" href={`/admin/content?page=${p.page}`}
            aria-current={p.page === page.page ? "page" : undefined}>
            {p.label}
          </Link>
        ))}
      </nav>

      <div className="page-pick__about">
        <h2 className="admin-sub">{page.label}</h2>
        <p className="muted">{page.summary}</p>
      </div>

      {/* keyed so switching pages starts from that page's saved wording */}
      <ContentForm key={page.page} page={page.page} stored={stored} />
    </>
  );
}
