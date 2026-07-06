import { useQuery } from "@tanstack/react-query";
import { listApps } from "../../services/api";
import { appKeys } from "./keys";

export function useApps() {
  return useQuery({ queryKey: appKeys.all, queryFn: listApps });
}
