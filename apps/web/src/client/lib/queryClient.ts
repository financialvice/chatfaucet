import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

export const persister = createAsyncStoragePersister({
  // Safe to persist: the dashboard cache contains auth status, usage, and API
  // key metadata only. Plaintext API keys are never stored in React Query.
  storage: {
    getItem: async (key: string) => (await idbGet<string>(key)) ?? null,
    setItem: async (key: string, value: string) => {
      await idbSet(key, value);
    },
    removeItem: async (key: string) => {
      await idbDel(key);
    },
  },
  key: "chatfaucet-rq-cache-v1",
  throttleTime: 1000,
});
