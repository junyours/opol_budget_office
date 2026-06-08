import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Separator } from "@/src/components/ui/separator";
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, WifiOff, FileX, ServerCrash } from "lucide-react";
import { useState } from "react";

type ErrorType = "chunk" | "not-found" | "server" | "unknown";

function getErrorType(error: unknown): ErrorType {
  if (
    error instanceof TypeError &&
    error.message.includes("Failed to fetch dynamically imported module")
  ) {
    return "chunk";
  }
  if (isRouteErrorResponse(error)) {
    return error.status === 404 ? "not-found" : "server";
  }
  return "unknown";
}

const ERROR_CONFIG: Record<
  ErrorType,
  { icon: React.ReactNode; title: string; description: string; badge: string; badgeVariant: "destructive" | "secondary" | "outline" }
> = {
  chunk: {
    icon: <WifiOff className="h-10 w-10 text-amber-500" />,
    title: "App Updated",
    description:
      "A new version of this app was deployed while you were using it. The page needs to reload to load the latest files.",
    badge: "Stale Bundle",
    badgeVariant: "secondary",
  },
  "not-found": {
    icon: <FileX className="h-10 w-10 text-muted-foreground" />,
    title: "Page Not Found",
    description: "The page you're looking for doesn't exist or has been moved.",
    badge: "404",
    badgeVariant: "outline",
  },
  server: {
    icon: <ServerCrash className="h-10 w-10 text-destructive" />,
    title: "Server Error",
    description: "Something went wrong on the server. Please try again or contact support.",
    badge: "Server Error",
    badgeVariant: "destructive",
  },
  unknown: {
    icon: <AlertTriangle className="h-10 w-10 text-destructive" />,
    title: "Unexpected Error",
    description: "An unexpected error occurred. Try refreshing the page.",
    badge: "Error",
    badgeVariant: "destructive",
  },
};

export default function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();
  const [showStack, setShowStack] = useState(false);

  const errorType = getErrorType(error);
  const config = ERROR_CONFIG[errorType];

  // Auto-reload once for chunk errors
  if (errorType === "chunk") {
    const alreadyReloaded = sessionStorage.getItem("chunk-error-reload");
    if (!alreadyReloaded) {
      sessionStorage.setItem("chunk-error-reload", "1");
      window.location.reload();
      return null;
    }
  }

  let statusCode: number | null = null;
  let errorMessage: string | null = null;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    errorMessage = error.data?.message ?? error.statusText;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  const isDev = import.meta.env.DEV;
  const stack = error instanceof Error ? error.stack : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Card */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-8 space-y-6">

          {/* Icon + Badge */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-muted p-4">
              {config.icon}
            </div>
            <Badge variant={config.badgeVariant}>{config.badge}</Badge>
          </div>

          {/* Title + Description */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{config.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {config.description}
            </p>
          </div>

          {/* Error detail (non-chunk) */}
          {errorMessage && errorType !== "chunk" && (
            <div className="rounded-md bg-muted px-4 py-3">
              <p className="text-xs font-mono text-muted-foreground break-all">
                {statusCode && <span className="font-semibold text-foreground mr-2">{statusCode}</span>}
                {errorMessage}
              </p>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {errorType === "chunk" ? (
              <Button className="w-full" onClick={() => window.location.reload()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reload App
              </Button>
            ) : (
              <>
                <Button className="w-full" onClick={() => window.location.reload()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    sessionStorage.removeItem("chunk-error-reload");
                    navigate("/");
                  }}
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Dev stack trace */}
        {isDev && stack && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <button
              onClick={() => setShowStack((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs font-mono text-muted-foreground hover:bg-muted transition-colors"
            >
              <span className="font-semibold text-foreground">Stack Trace (dev only)</span>
              {showStack ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showStack && (
              <div className="px-4 pb-4">
                <Separator className="mb-3" />
                <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all leading-relaxed max-h-64 overflow-y-auto">
                  {stack}
                </pre>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
