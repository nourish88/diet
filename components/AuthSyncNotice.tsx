"use client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function AuthSyncNotice() {
  const { syncError, retryAuth, loading } = useAuth();
  if (!syncError) return null;
  return <div role="alert" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
    <p>{syncError}</p>
    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={retryAuth}>Yeniden dene</Button>
  </div>;
}
