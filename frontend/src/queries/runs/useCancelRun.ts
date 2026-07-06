import { useMutation } from "@tanstack/react-query";
import { cancelRun } from "../../services/api";

export function useCancelRun() {
  return useMutation({ mutationFn: cancelRun });
}
