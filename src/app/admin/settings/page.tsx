import { getAdminPlatformSettings } from '@/app/actions/admin';
import SettingsManager from './SettingsManager';

export const revalidate = 0;

export default async function AdminSettingsPage() {
  const settings = await getAdminPlatformSettings();

  const serialized = {
    ...settings,
    updatedAt:
      settings.updatedAt instanceof Date
        ? settings.updatedAt.toISOString()
        : new Date(settings.updatedAt).toISOString(),
  };

  return (
    <div className="max-w-full">
      <h1 className="mb-2">Settings</h1>
      <p className="text-muted mb-6">
        Platform-wide commission rates and quotas. Changes apply to new transactions
        immediately; existing rows keep their original fees.
      </p>
      <SettingsManager settings={serialized} />
    </div>
  );
}
