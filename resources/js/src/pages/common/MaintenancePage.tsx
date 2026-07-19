import { useMaintenanceStatus } from "@/src/hooks/useMaintenanceStatus";
import { Loader2, Wrench } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function MaintenancePage() {
  const { status } = useMaintenanceStatus(15000);
  const navigate = useNavigate();

  useEffect(() => {
    if (status && !status.maintenance_mode) {
      navigate("/dashboard", { replace: true });
    }
  }, [status, navigate]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-100 flex items-center justify-center mx-auto mb-6">
          <Wrench className="w-7 h-7 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">System Under Maintenance</h1>
        <p className="text-sm text-zinc-500 leading-relaxed mb-6">
          {status?.maintenance_message
            ?? "We're performing scheduled maintenance. Please check back shortly."}
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Checking again automatically…
        </div>
      </div>
    </div>
  );
}
