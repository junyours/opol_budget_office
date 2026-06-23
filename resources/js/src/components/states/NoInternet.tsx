import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';

export default function NoInternet() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-8 space-y-6">

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-muted p-4">
              <WifiOff className="h-10 w-10 text-amber-500" />
            </div>
            <Badge variant="secondary">No Connection</Badge>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">You're Offline</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              It looks like you've lost your internet connection.
              Check your network and try again.
            </p>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <Button className="w-full" onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>

        </div>

        <p className="text-center text-xs text-muted-foreground">
          Municipal Budget Office · Opol LGU
        </p>

      </div>
    </div>
  );
}
