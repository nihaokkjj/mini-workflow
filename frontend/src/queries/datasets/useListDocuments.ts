import { useQuery } from "@tanstack/react-query";
import { listDocuments } from "../../services/api";
import { datasetKeys } from "./keys";

export function useListDocuments(datasetId: string) {
  return useQuery({
    queryKey: datasetKeys.documents(datasetId),
    queryFn: () => listDocuments(datasetId).then((res) => res.data),
    enabled: Boolean(datasetId),
    refetchInterval: (query) => {
      // Poll while any document is still indexing
      const docs = query.state.data;
      if (!docs || docs.length === 0) return false;
      const hasPending = docs.some(
        (d) => d.status === "pending" || d.status === "indexing"
      );
      return hasPending ? 3000 : false;
    },
  });
}
