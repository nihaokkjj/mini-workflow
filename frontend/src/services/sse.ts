export interface SseHandlers<T> {
  onEvent: (event: T) => void;
  onDone: () => void;
  onError: (err: string) => void;
  signal?: AbortSignal;
}

export function subscribeToJsonStream<T>(
  url: string,
  { onEvent, onDone, onError, signal }: SseHandlers<T>,
  init?: RequestInit
): AbortController {
  const controller = new AbortController();

  fetch(url, { ...init, signal: signal ?? controller.signal })
    .then(async (response) => {
      if (!response.ok || !response.body) {
        onError(`HTTP ${response.status}`);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event: T = JSON.parse(line.slice(6));
              onEvent(event);
            } catch {
              // Skip unparseable lines
            }
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if ((err as Error).name !== "AbortError") {
        onError((err as Error).message);
      }
    });

  return controller;
}
