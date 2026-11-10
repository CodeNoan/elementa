import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeComments, validateCommentInput } from "../src/comments-model.ts";
import type { FeedbackComment } from "../src/comments-model.ts";

function comment(
  id: string,
  created_at: string,
  feedback = `Feedback ${id}`,
): FeedbackComment {
  return { id, name: `Pessoa ${id}`, feedback, created_at };
}

test("nome e feedback são obrigatórios e são aparados", () => {
  assert.equal(validateCommentInput("   ", "Comentário").ok, false);
  assert.equal(validateCommentInput("Ana", "  ").ok, false);
  assert.deepEqual(validateCommentInput(" Ana ", " Gostei bastante. "), {
    ok: true,
    value: { name: "Ana", feedback: "Gostei bastante." },
  });
});

test("valida tamanhos mínimos e máximos do nome e do feedback", () => {
  assert.equal(validateCommentInput("A", "Bom").ok, false);
  assert.equal(validateCommentInput("Ana", "Ok").ok, false);
  assert.equal(validateCommentInput("A".repeat(61), "Feedback").ok, false);
  assert.equal(validateCommentInput("Ana", "F".repeat(1001)).ok, false);
  assert.equal(validateCommentInput("A".repeat(60), "F".repeat(1000)).ok, true);
});

test("ordena os mais recentes primeiro e remove IDs duplicados", () => {
  const older = comment("1", "2026-01-01T10:00:00.000Z");
  const newer = comment("2", "2026-01-02T10:00:00.000Z");
  const result = mergeComments([older, newer], [newer]);
  assert.deepEqual(result, [newer, older]);
});

test("preserva feedback local além dos 100 comentários mais recentes", () => {
  const many = Array.from({ length: 125 }, (_, index) =>
    comment(String(index), new Date(2026, 0, index + 1).toISOString()),
  );
  assert.equal(mergeComments(many).length, 125);
});
