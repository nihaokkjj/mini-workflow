import { useMutation } from "@tanstack/react-query";
import { debugRetrieve } from "../../services/api";
import type { RetrieveRequestDto } from "../../types";

export function useDebugRetrieve() {
  return useMutation({
    mutationFn: (input: RetrieveRequestDto) => debugRetrieve(input),
  });
}
