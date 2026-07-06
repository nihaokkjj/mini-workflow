import { useQuery } from "@tanstack/react-query";
import { getApp } from "../../services/api";
import { appKeys } from "./keys";

export function useApp(id: string | undefined) {
  return useQuery({
    queryKey: appKeys.detail(id ?? ""),
    queryFn: () => getApp(id!),
    enabled: Boolean(id),
  });
}
