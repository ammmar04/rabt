import { notFound } from "next/navigation";
import { getCategories, getItem } from "@/lib/queries";
import ItemForm from "@/components/admin/ItemForm";

export const dynamic = "force-dynamic";

export default async function EditItem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, categories] = await Promise.all([getItem(id), getCategories()]);
  if (!item) notFound();

  return (
    <>
      <div className="label label--rule" style={{ margin: "0 0 1.4rem" }}>
        Editing {item.id} &mdash; {item.name}
      </div>
      <ItemForm categories={categories} item={item} />
    </>
  );
}
