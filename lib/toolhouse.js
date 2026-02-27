export async function startRun({ endpoint, message }) {
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  const runId = resp.headers.get("X-Toolhouse-Run-ID") || null;
  if (!resp.body) throw new Error("No streaming body");
  const reader = resp.body.getReader();
  return { runId, reader, response: resp };
}

export async function continueRun({ endpoint, runId, message }) {
  if (!runId) throw new Error("Missing runId");
  const url = `${endpoint.replace(/\/$/, "")}/${encodeURIComponent(runId)}`;
  const resp = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  const reader = resp.body.getReader();
  return { reader, response: resp };
}

export async function streamToChunks({ reader, onChunk, onDone, onError, signal }) {
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (signal?.aborted) break;
      onChunk?.(chunk);
    }
    onDone?.();
  } catch (err) {
    onError?.(err);
  }
}
