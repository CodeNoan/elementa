import AsyncStorage from "@react-native-async-storage/async-storage";
import { backend } from "./backend";
import {
  CommentInput,
  FeedbackComment,
  mergeComments,
} from "./comments-model";

const COMMENTS_KEY = "elementa:comments";

type FeedMode = "cloud" | "local" | "offline";

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

async function readCache(): Promise<FeedbackComment[]> {
  try {
    const raw = await AsyncStorage.getItem(COMMENTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isComment) : [];
  } catch {
    return [];
  }
}

async function writeCache(comments: FeedbackComment[]): Promise<void> {
  await AsyncStorage.setItem(COMMENTS_KEY, JSON.stringify(mergeComments(comments)));
}

export async function loadComments(): Promise<{
  comments: FeedbackComment[];
  mode: FeedMode;
}> {
  const cached = await readCache();
  if (!backend) return { comments: cached, mode: "local" };

  try {
    const { data, error } = await backend
      .from("feedback_comments")
      .select("id,name,feedback,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { comments: cached, mode: "offline" };

    const remote = (data || []).filter(isComment);
    const merged = mergeComments(remote, cached);
    await writeCache(merged).catch(() => undefined);
    return { comments: merged, mode: "cloud" };
  } catch {
    return { comments: cached, mode: "offline" };
  }
}

export async function saveComment(input: CommentInput): Promise<{
  comment: FeedbackComment;
  mode: FeedMode;
}> {
  if (backend) {
    try {
      const { data, error } = await backend
        .from("feedback_comments")
        .insert({ name: input.name, feedback: input.feedback })
        .select("id,name,feedback,created_at")
        .single();
      if (!error && data && isComment(data)) {
        const comment = data;
        const cached = await readCache();
        await writeCache(mergeComments([comment], cached)).catch(() => undefined);
        return { comment, mode: "cloud" };
      }
    } catch {
      // A falha de rede mantém a possibilidade de salvar localmente.
    }
  }

  const localComment: FeedbackComment = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: input.name,
    feedback: input.feedback,
    created_at: new Date().toISOString(),
  };
  const cached = await readCache();
  await writeCache(mergeComments([localComment], cached));
  return { comment: localComment, mode: backend ? "offline" : "local" };
}
