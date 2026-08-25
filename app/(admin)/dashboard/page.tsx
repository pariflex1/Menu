import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth/session';
import DashboardClient from '@/components/admin/dashboard-client';

export default async function DashboardPage() {
  const session = await requireStaff();

  return <DashboardClient session={session} />;
}
