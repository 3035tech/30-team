'use client';

import dynamic from 'next/dynamic';
import { AppLoading } from './AppLoading';

/** Recharts-backed radar loaded only when rendered (keeps recharts out of tab chunks). */
export const MotivatorsRadarChart = dynamic(
  () => import('./MotivatorsRadarChart').then((mod) => mod.MotivatorsRadarChart),
  { ssr: false, loading: () => <AppLoading variant="panel" /> }
);
