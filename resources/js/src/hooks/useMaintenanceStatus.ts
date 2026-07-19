import { useEffect, useState } from "react";
import API from "@/src/services/api";

interface MaintenanceStatus {
  maintenance_mode: boolean;
  maintenance_message: string | null;
}

export function useMaintenanceStatus(pollMs = 30000) {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const { data } = await API.get("/maintenance/status");
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatus({ maintenance_mode: false, maintenance_message: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    const interval = setInterval(check, pollMs);
    return () => { cancelled = true; clearInterval(interval); };
  }, [pollMs]);

  return { status, loading };
}
