import PlatformHealthDashboard from '../platform/PlatformHealthDashboard';
import type { User } from '../../types';

interface PlatformPageProps {
  user: User;
}

export default function PlatformPage({ user }: PlatformPageProps) {
  return <PlatformHealthDashboard user={user} />;
}
