import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { makeQuiz } from "../src/quiz.ts";
import type { QuizElement } from "../src/quiz.ts";

const elements: QuizElement[] = JSON.parse(
  readFileSync(new URL("../src/elements.json", import.meta.url), "utf8"),
);

test("a base contém os 118 elementos sem números ou símbolos duplicados", () => {
  assert.equal(elements.length, 118);
  assert.equal(new Set(elements.map((element) => element.number)).size, 118);
  assert.equal(new Set(elements.map((element) => element.symbol)).size, 118);
  assert.deepEqual(
    elements.map((element) => element.number),
    Array.from({ length: 118 }, (_, index) => index + 1),
  );
});

test("cada questão tem resposta correta entre quatro opções distintas", () => {
  const questions = makeQuiz(elements, 10, "Misto");
  assert.equal(questions.length, 10);
  for (const question of questions) {
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.ok(question.options.includes(question.answer));
    assert.ok(question.explanation.length > 0);
  }
});

test("o quiz misto produz questões curtas sobre conceitos introdutórios", () => {
  const questions = makeQuiz(elements, 20, "Misto");
  const names = new Set(elements.map((element) => element.name));
  const symbols = new Set(elements.map((element) => element.symbol));
  assert.equal(questions.length, 20);
  assert.equal(new Set(questions.map((question) => question.prompt)).size, 20);
  assert.ok(questions.every((question) => question.prompt.endsWith("?")));
  assert.ok(questions.every((question) => question.prompt.length <= 100));
  for (const question of questions) {
    const validChoices = question.prompt.startsWith("Qual é o símbolo químico")
      ? symbols
      : names;
    assert.ok(question.options.every((option) => validChoices.has(option)));
  }
});

test("os temas Símbolos, Nomes e Cotidiano geram perguntas válidas", () => {
  for (const topic of ["Símbolos", "Nomes", "Cotidiano"]) {
    const questions = makeQuiz(elements, 5, topic);
    assert.equal(questions.length, 5);
    assert.ok(questions.every((question) => question.options.includes(question.answer)));
  }
});

test("o tamanho solicitado é limitado a vinte questões e usa temas conhecidos", () => {
  assert.equal(makeQuiz(elements, 99, "Misto").length, 20);
  assert.equal(makeQuiz(elements, 5, "tema desconhecido").length, 5);
});
