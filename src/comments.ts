import {
  type CommentInput,
  type FeedbackComment,
  mergeComments,
  validateCommentInput,
} from "./comments-model";

const COMMENTS_KEY = "elementa:comments";
export type FeedMode = "shared" | "local" | "offline";

function isComment(value: unknown): value is FeedbackComment {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.feedback === "string" &&
    typeof item.created_at === "string"
  );
}

function readCache(): FeedbackComment[] {
  try {
    const raw = window.localStorage.getItem(COMMENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isComment) : [];
  } catch {
    return [];
  }
}

function writeCache(comments: FeedbackComment[]): void {
  try {
    window.localStorage.setItem(COMMENTS_KEY, JSON.stringify(mergeComments(comments)));
  } catch {
    // O serviço compartilhado continua funcionando se o cache do navegador estiver indisponível.
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function publishToNetlify(comment: FeedbackComment): Promise<FeedbackComment | null> {
  try {
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ id: comment.id, name: comment.name, feedback: comment.feedback }),
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") return null;
    const result = (payload as { comment?: unknown }).comment;
    return isComment(result) ? { ...result, localOnly: false } : null;
  } catch {
    return null;
  }
}

export async function loadComments(): Promise<{ comments: FeedbackComment[]; mode: FeedMode }> {
  const cached = readCache();
  try {
    const response = await fetch("/api/comments", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("O fórum compartilhado não respondeu.");
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== "object") throw new Error("Resposta inválida do fórum.");
    const received = (payload as { comments?: unknown }).comments;
    if (!Array.isArray(received)) throw new Error("Lista de comentários inválida.");

    const remote = received.filter(isComment).map((comment) => ({ ...comment, localOnly: false }));
    const pending = cached.filter((comment) => comment.localOnly);
    const synced: FeedbackComment[] = [];
    const stillPending: FeedbackComment[] = [];
    for (const comment of pending) {
      const published = await publishToNetlify(comment);
      if (published) synced.push(published);
      else stillPending.push(comment);
    }

    const comments = mergeComments(remote, synced, stillPending);
    writeCache(comments);
    return { comments, mode: "shared" };
  } catch {
    return { comments: cached, mode: cached.length ? "offline" : "local" };
  }
}

export async function saveComment(input: CommentInput): Promise<{
  comment: FeedbackComment;
  mode: FeedMode;
}> {
  const checked = validateCommentInput(input.name, input.feedback);
  if (!checked.ok) throw new Error(checked.message);

  const draft: FeedbackComment = {
    id: newId(),
    name: checked.value.name,
    feedback: checked.value.feedback,
    created_at: new Date().toISOString(),
    localOnly: true,
  };

  const published = await publishToNetlify(draft);
  if (published) {
    const cached = readCache();
    writeCache(mergeComments([published], cached));
    return { comment: published, mode: "shared" };
  }

  const cached = readCache();
  writeCache(mergeComments([draft], cached));
  return { comment: draft, mode: "local" };
}
