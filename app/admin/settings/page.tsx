import { getSettings } from "@/lib/queries";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const settings = await getSettings();
  return (
    <>
      <div className="label label--rule" style={{ margin: "0 0 1.4rem" }}>Settings</div>
      <p className="muted" style={{ maxWidth: "56ch", marginBottom: "2rem" }}>
        These appear on the public site. Changing them here updates the site immediately —
        no need to touch any code.
      </p>
      <SettingsForm settings={settings} />
    </>
  );
}
