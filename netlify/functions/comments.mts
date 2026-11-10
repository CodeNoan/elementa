import { getStore } from "@netlify/blobs";
import { validateCommentInput } from "../../src/comments-model.ts";

const STORE_NAME = "elementa-feedback";
const MAX_REQUEST_BYTES = 16_000;
const MAX_FEED_ITEMS = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function isComment(value: unknown): value is {
  id: string;
  name: string;
  feedback: string;
  created_at: string;
} {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.feedback === "string" &&
    typeof item.created_at === "string"
  );
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  try {
    const store = getStore({ name: STORE_NAME, consistency: "strong" });

    if (request.method === "GET") {
      const { blobs } = await store.list({ prefix: "comment/" });
      const values = await Promise.all(
        blobs.map(({ key }) => store.get(key, { type: "json", consistency: "strong" })),
      );
      const comments = values
        .filter(isComment)
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
        .slice(0, MAX_FEED_ITEMS);
      return json({ comments });
    }

    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
      return json({ error: "O envio ultrapassou o tamanho permitido." }, 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "O conteúdo enviado não está em formato válido." }, 400);
    }
    if (!body || typeof body !== "object") {
      return json({ error: "Envie um nome e um feedback." }, 400);
    }

    const record = body as Record<string, unknown>;
    const validation = validateCommentInput(
      typeof record.name === "string" ? record.name : "",
      typeof record.feedback === "string" ? record.feedback : "",
    );
    if (!validation.ok) return json({ error: validation.message }, 400);

    const id = typeof record.id === "string" && UUID_PATTERN.test(record.id)
      ? record.id.toLowerCase()
      : crypto.randomUUID();
    const key = `comment/${id}`;
    const comment = {
      id,
      name: validation.value.name,
      feedback: validation.value.feedback,
      created_at: new Date().toISOString(),
    };

    const result = await store.setJSON(key, comment, { onlyIfNew: true });
    if (!result.modified) {
      const existing = await store.get(key, { type: "json", consistency: "strong" });
      if (isComment(existing)) return json({ comment: existing });
    }
    return json({ comment }, 201);
  } catch {
    return json({ error: "O fórum está temporariamente indisponível. Tente novamente." }, 503);
  }
}

export const config = {
  path: "/api/comments",
  method: ["GET", "POST"],
};
