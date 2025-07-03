
import type { Metadata } from 'next';
import SettingsPageClient from './SettingsPageClient';

export const metadata: Metadata = {
  title: 'Settings | Weatherwise',
  description: 'Manage your account, preferences, and application settings.',
};

export default function SettingsPage() {
  return <SettingsPageClient />;
}
