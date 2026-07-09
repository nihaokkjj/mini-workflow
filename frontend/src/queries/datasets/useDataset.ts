import { useQuery } from "@tanstack/react-query";
import { getDataset } from "../../services/api";
import { datasetKeys } from "./keys";

export function useDataset(id: string) {
  return useQuery({
    queryKey: datasetKeys.details(id),
    queryFn: () => getDataset(id).then((res) => res.data),
    enabled: Boolean(id),
  });
}
