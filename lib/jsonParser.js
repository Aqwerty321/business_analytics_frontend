export function tryParseFencedJson(buffer) {
  const fenced = buffer.match(/```json([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try { return JSON.parse(fenced[1]); } catch (e) { return null; }
  }
  return null;
}

export function tryParseBalancedJson(buffer) {
  const first = buffer.indexOf("{");
  if (first === -1) return null;
  let i = first;
  let depth = 0;
  for (; i < buffer.length; i++) {
    if (buffer[i] === "{") depth++;
    else if (buffer[i] === "}") {
      depth--;
      if (depth === 0) {
        const candidate = buffer.slice(first, i + 1);
        try { return JSON.parse(candidate); } catch (e) { return null; }
      }
    }
  }
  return null;
}
