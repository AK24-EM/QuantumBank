import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  PlatformMetrics, ServiceDeployment, Incident, ChaosActionLog, ChaosScenario, PlatformTab,
} from '../types/platform';
import {
  fetchPlatformMetrics, getDeployments,
} from '../services/platformService';
import { triggerChaosScenario, getSeedIncidents, registerChaosCallbacks } from '../services/chaosService';

const POLL_INTERVAL_MS = 5000;

export function usePlatformStore(isAdmin: boolean) {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [deployments, setDeployments] = useState<ServiceDeployment[]>(getDeployments());
  const [incidents, setIncidents] = useState<Incident[]>(getSeedIncidents());
  const [chaosLogs, setChaosLogs] = useState<ChaosActionLog[]>([]);
  const [activeTab, setActiveTab] = useState<PlatformTab>('health');
  const [loading, setLoading] = useState(true);
  const [chaosRunning, setChaosRunning] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshMetrics = useCallback(async () => {
    const data = await fetchPlatformMetrics();
    setMetrics(data);
    setLoading(false);
  }, []);

  const refreshDeployments = useCallback(() => {
    setDeployments(getDeployments());
  }, []);

  useEffect(() => {
    registerChaosCallbacks({
      onIncident: (incident) => setIncidents((prev) => [incident, ...prev]),
      onIncidentUpdate: (id, updates) =>
        setIncidents((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i))),
      onChaosLog: (log) =>
        setChaosLogs((prev) => {
          const existing = prev.findIndex((l) => l.id === log.id);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = log;
            return updated;
          }
          return [log, ...prev];
        }),
      onDeploymentChange: refreshDeployments,
    });
  }, [refreshDeployments]);

  useEffect(() => {
    refreshMetrics();
    pollRef.current = setInterval(refreshMetrics, POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [refreshMetrics]);

  const runChaosScenario = useCallback(async (
    scenario: ChaosScenario,
    triggeredBy: string,
    params?: Record<string, string>,
  ) => {
    if (!isAdmin || chaosRunning) return;
    setChaosRunning(true);
    try {
      await triggerChaosScenario(scenario, triggeredBy, params);
    } finally {
      setChaosRunning(false);
      refreshMetrics();
    }
  }, [isAdmin, chaosRunning, refreshMetrics]);

  const updateIncidentRootCause = useCallback((id: string, rootCause: string) => {
    setIncidents((prev) => prev.map((i) =>
      i.id === id ? { ...i, rootCause, status: 'resolved' as const, resolvedAt: i.resolvedAt ?? new Date().toISOString() } : i,
    ));
  }, []);

  const firingCount = incidents.filter((i) => i.status === 'firing' || i.status === 'investigating').length;

  return {
    metrics,
    deployments,
    incidents,
    chaosLogs,
    activeTab,
    loading,
    chaosRunning,
    firingCount,
    setActiveTab,
    refreshMetrics,
    runChaosScenario,
    updateIncidentRootCause,
  };
}

export type PlatformStore = ReturnType<typeof usePlatformStore>;
