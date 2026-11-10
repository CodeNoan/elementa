export type FeedbackComment = {
  id: string;
  name: string;
  feedback: string;
  created_at: string;
};

export type CommentInput = {
  name: string;
  feedback: string;
};

export type CommentValidation =
  | { ok: true; value: CommentInput }
  | { ok: false; message: string };

export function validateCommentInput(
  name: string,
  feedback: string,
): CommentValidation {
  const cleanName = name.trim();
  const cleanFeedback = feedback.trim();
  if (!cleanName) return { ok: false, message: "Digite seu nome." };
  if (cleanName.length < 2) {
    return { ok: false, message: "O nome precisa ter pelo menos 2 caracteres." };
  }
  if (cleanName.length > 60) {
    return { ok: false, message: "O nome pode ter no máximo 60 caracteres." };
  }
  if (!cleanFeedback) {
    return { ok: false, message: "Escreva seu feedback antes de enviar." };
  }
  if (cleanFeedback.length < 3) {
    return { ok: false, message: "O feedback precisa ter pelo menos 3 caracteres." };
  }
  if (cleanFeedback.length > 1000) {
    return { ok: false, message: "O feedback pode ter no máximo 1.000 caracteres." };
  }
  return {
    ok: true,
    value: { name: cleanName, feedback: cleanFeedback },
  };
}

export function mergeComments(
  ...lists: FeedbackComment[][]
): FeedbackComment[] {
  const unique = new Map<string, FeedbackComment>();
  for (const list of lists) {
    for (const comment of list) {
      if (!unique.has(comment.id)) unique.set(comment.id, comment);
    }
  }
  return [...unique.values()]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}
