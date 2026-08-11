export type ContentPart =
  | { type: "text"; value: string }
  | { type: "image"; alt: string; url: string };

const imagePattern = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;

export function parseLogContent(context: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let cursor = 0;

  for (const match of context.matchAll(imagePattern)) {
    const index = match.index;
    const url = match[2];
    if (!url) continue;
    if (index > cursor) parts.push({ type: "text", value: context.slice(cursor, index) });
    parts.push({ type: "image", alt: match[1] || "Log image", url });
    cursor = index + match[0].length;
  }

  if (cursor < context.length) parts.push({ type: "text", value: context.slice(cursor) });
  return parts;
}

export function stripImages(context: string): string {
  return context.replace(imagePattern, "").replace(/\n{3,}/g, "\n\n").trim();
}
