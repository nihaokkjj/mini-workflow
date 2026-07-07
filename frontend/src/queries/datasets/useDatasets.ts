import { useQuery } from "@tanstack/react-query";
import { listDatasets } from "../../services/api";
import { datasetKeys } from "./keys";

export function useDatasets() {
  return useQuery({
    queryKey: datasetKeys.all,
    queryFn: listDatasets,
    select: (res) => res.data,
  });
}
