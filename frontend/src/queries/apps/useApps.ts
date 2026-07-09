import { useQuery } from "@tanstack/react-query";
import { listApps } from "../../services/api";
import { appKeys } from "./keys";

export function useApps() {
  return useQuery({
    queryKey: appKeys.all,
    queryFn: listApps,
    // 后端列表接口已切换为分页结构，页面层仍只消费当前页数据。
    select: (res) => res.data.items,
  });
}
