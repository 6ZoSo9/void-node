import { useCallback, useState } from "react";
import type { WorkCreditsDashboardResponse } from "./devnetApi";
import { fetchWorkCreditsDashboard } from "./devnetApi";

export function useWorkCreditsDashboard(initialAddress: string | null = null) {
  const [address, setAddress] = useState<string>(initialAddress ?? "");
  const [data, setData] = useState<WorkCreditsDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(
    async (overrideAddress?: string) => {
      const target = (overrideAddress ?? address).trim();

      if (!target) {
        setError("Address is required");
        setData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchWorkCreditsDashboard(target);
        setData(result);
        setLastUpdated(new Date());
      } catch (err: any) {
        console.error("WorkCredits dashboard fetch failed", err);
        setError(err?.message ?? "Failed to load WorkCredits dashboard");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  return {
    address,
    setAddress,
    data,
    loading,
    error,
    lastUpdated,
    load
  };
}
