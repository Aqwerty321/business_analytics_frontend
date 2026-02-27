import { tryParseBalancedJson, tryParseFencedJson } from "./jsonParser";

export function appendStrictJsonChunk(buffer, chunk) {
  const nextBuffer = `${buffer}${chunk}`;
  const parsed = tryParseBalancedJson(nextBuffer) || tryParseFencedJson(nextBuffer);
  return { buffer: nextBuffer, parsed };
}

export function finalizeStrictJsonBuffer(buffer) {
  return tryParseBalancedJson(buffer) || tryParseFencedJson(buffer);
}
