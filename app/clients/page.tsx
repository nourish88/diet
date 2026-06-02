import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import ClientsPageClient from "./ClientsPageClient";
import {
  fetchClientsListPage,
  getServerDietitianId,
} from "@/lib/data/clients-list";
import { qk } from "@/lib/query-keys";

const ITEMS_PER_PAGE = 20;

export default async function ClientsPage() {
  const queryClient = new QueryClient();
  const dietitianId = await getServerDietitianId();

  if (dietitianId) {
    await queryClient.prefetchInfiniteQuery({
      queryKey: qk.clients.list(),
      queryFn: async ({ pageParam }) =>
        fetchClientsListPage(dietitianId, {
          skip: pageParam as number,
          take: ITEMS_PER_PAGE,
        }),
      initialPageParam: 0,
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientsPageClient />
    </HydrationBoundary>
  );
}
