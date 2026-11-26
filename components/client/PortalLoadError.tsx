import { Button } from "@/components/ui/button";
import { describeRequestError } from "@/lib/http-request";

export function PortalLoadError({ error, retry, retrying }: {
  error: Error;
  retry: () => void;
  retrying: boolean;
}) {
  return (
    <div role="alert" className="mx-auto max-w-lg space-y-3 p-6 text-center">
      <p>{describeRequestError(error)}</p>
      <Button variant="outline" onClick={retry} disabled={retrying}>
        {retrying ? "Yükleniyor…" : "Yeniden dene"}
      </Button>
    </div>
  );
}
