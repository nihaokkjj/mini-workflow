import { useQuery } from "@tanstack/react-query";
import { listAppDatasets } from "../../services/api";
import { datasetKeys } from "./keys";

export function useAppDatasets(appId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.appBindings(appId ?? ""),
    queryFn: () => listAppDatasets(appId!),
    enabled: Boolean(appId),
    select: (res) => res.data,
  });
}
