import { getCategories } from "@/lib/queries";
import ItemForm from "@/components/admin/ItemForm";

export const dynamic = "force-dynamic";

export default async function NewItem() {
  const categories = await getCategories();
  return (
    <>
      <div className="label label--rule" style={{ margin: "0 0 1.4rem" }}>Add an item</div>
      <ItemForm categories={categories} />
    </>
  );
}
