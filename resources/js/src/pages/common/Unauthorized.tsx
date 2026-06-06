import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Separator } from '@/src/components/ui/separator';
import { Badge } from '@/src/components/ui/badge';

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
              <ShieldAlert className="h-10 w-10 text-red-500" strokeWidth={1.5} />
            </div>
            <Badge className="absolute -top-1 -right-1 w-6 h-6 p-0 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-500 text-white text-xs font-bold">
              !
            </Badge>
          </div>
        </div>

        {/* Text */}
        <div className="text-center mb-8">
          <p className="text-eyebrow text-red-500 mb-2">
            403 — Forbidden
          </p>
          <h1 className="text-page-title mb-3">
            Access Denied
          </h1>
          <p className="text-subtitle max-w-sm mx-auto">
            You don't have the required permissions to view this page.
            If you believe this is a mistake, please contact your system administrator.
          </p>
        </div>

        <Separator className="mb-8" />

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            asChild
            className="w-full h-9 text-sm bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Link to="/dashboard">
              <ArrowLeft className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>

        {/* Footer note */}
        <p className="text-eyebrow text-center mt-8">
          Municipal Budget Office · Opol LGU
        </p>

      </div>
    </div>
  );
}
