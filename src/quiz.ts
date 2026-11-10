export type QuizElement = {
  number: number;
  name: string;
  symbol: string;
  category: string;
};

export type QuizTopic = "Misto" | "Símbolos" | "Nomes" | "Cotidiano";

export type Question = {
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

type QuestionDraft = Omit<Question, "options"> & { choices: string[] };

const everydayFacts: Record<number, { prompt: string; explanation: string }> = {
  1: {
    prompt: "Qual elemento é o mais leve da tabela periódica?",
    explanation: "O hidrogênio é o elemento mais leve e também faz parte da água.",
  },
  2: {
    prompt: "Qual gás leve é usado em alguns balões?",
    explanation: "O hélio é mais leve que o ar e é usado em balões próprios para esse fim.",
  },
  3: {
    prompt: "Qual elemento é usado em baterias recarregáveis?",
    explanation: "O lítio é um componente importante de muitas baterias recarregáveis.",
  },
  6: {
    prompt: "Qual elemento forma o grafite que encontramos em lápis?",
    explanation: "O grafite é uma forma do carbono.",
  },
  7: {
    prompt: "Qual elemento forma a maior parte do ar da Terra?",
    explanation: "O nitrogênio compõe a maior parte da atmosfera terrestre.",
  },
  8: {
    prompt: "Qual elemento é essencial para a respiração humana?",
    explanation: "O oxigênio é usado pelo corpo na respiração celular.",
  },
  9: {
    prompt: "Compostos de qual elemento podem ser encontrados em cremes dentais?",
    explanation: "Alguns cremes dentais contêm compostos de flúor.",
  },
  10: {
    prompt: "Qual elemento dá nome aos letreiros chamados de 'neon'?",
    explanation: "O neônio é um gás usado em alguns letreiros luminosos.",
  },
  11: {
    prompt: "Qual elemento, junto com o cloro, forma o sal de cozinha (NaCl)?",
    explanation: "O sal de cozinha é cloreto de sódio: ele contém sódio e cloro.",
  },
  12: {
    prompt: "Qual elemento tem o símbolo Mg e aparece em alguns suplementos?",
    explanation: "Mg é o símbolo químico do magnésio.",
  },
  13: {
    prompt: "Qual metal é muito usado em latas de bebidas?",
    explanation: "O alumínio é leve e bastante usado em latas e embalagens.",
  },
  14: {
    prompt: "Qual elemento está presente na areia e em muitos tipos de vidro?",
    explanation: "O silício está presente em minerais comuns da areia e em materiais de vidro.",
  },
  15: {
    prompt: "Qual elemento tem o símbolo P?",
    explanation: "P é o símbolo químico do fósforo.",
  },
  16: {
    prompt: "Qual elemento tem o símbolo S?",
    explanation: "S é o símbolo químico do enxofre.",
  },
  17: {
    prompt: "Compostos de qual elemento são usados no tratamento de água de piscinas?",
    explanation: "Compostos de cloro são usados para ajudar a desinfetar a água de piscinas.",
  },
  18: {
    prompt: "Qual gás nobre é usado em algumas lâmpadas e em soldagem?",
    explanation: "O argônio é usado em lâmpadas e como gás de proteção em processos de soldagem.",
  },
  19: {
    prompt: "Qual elemento aparece em alimentos como a banana na forma de sais?",
    explanation: "A banana contém compostos de potássio; K é o símbolo desse elemento.",
  },
  20: {
    prompt: "Qual elemento é importante para ossos e dentes em forma de compostos?",
    explanation: "Compostos de cálcio fazem parte dos ossos e dos dentes.",
  },
  26: {
    prompt: "Qual elemento é o principal componente do aço comum?",
    explanation: "O ferro é o principal componente do aço comum.",
  },
  29: {
    prompt: "Qual metal é muito usado em fios elétricos?",
    explanation: "O cobre conduz eletricidade e é muito usado em fios.",
  },
  30: {
    prompt: "Qual elemento tem o símbolo Zn?",
    explanation: "Zn é o símbolo químico do zinco, usado também em revestimentos contra corrosão.",
  },
  47: {
    prompt: "Qual metal é conhecido pelo uso em joias e talheres?",
    explanation: "A prata é usada em joias, talheres e diversos objetos.",
  },
  79: {
    prompt: "Qual metal é muito conhecido pelo uso em joias?",
    explanation: "O ouro é um metal bastante usado em joias.",
  },
};

const commonNumbers = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  26, 29, 30, 47, 79,
]);

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function makeDrafts(elements: QuizElement[], topic: QuizTopic): QuestionDraft[] {
  const common = elements.filter((element) => commonNumbers.has(element.number));
  const pool = common.length >= 4 ? common : elements;
  const names = pool.map((element) => element.name);
  const symbols = pool.map((element) => element.symbol);
  const drafts: QuestionDraft[] = [];

  if (topic === "Misto" || topic === "Símbolos") {
    for (const element of pool) {
      drafts.push({
        prompt: `Qual é o símbolo químico de ${element.name}?`,
        answer: element.symbol,
        explanation: `O símbolo de ${element.name} é ${element.symbol}.`,
        choices: symbols,
      });
    }
  }

  if (topic === "Misto" || topic === "Nomes") {
    for (const element of pool) {
      drafts.push({
        prompt: `Qual elemento é representado pelo símbolo ${element.symbol}?`,
        answer: element.name,
        explanation: `${element.symbol} é o símbolo químico de ${element.name}.`,
        choices: names,
      });
    }
  }

  if (topic === "Misto" || topic === "Cotidiano") {
    for (const element of pool) {
      const fact = everydayFacts[element.number];
      if (fact) {
        drafts.push({
          prompt: fact.prompt,
          answer: element.name,
          explanation: fact.explanation,
          choices: names,
        });
      }
    }
  }

  return drafts;
}

/** Cria uma sessão sem repetir perguntas e limita o tamanho a 1–20 questões. */
export function makeQuiz(
  elements: QuizElement[],
  requestedCount: number,
  topic: string,
): Question[] {
  const validElements = elements
    .filter((element) => element.number >= 1 && element.number <= 118)
    .sort((a, b) => a.number - b.number);
  const validTopic: QuizTopic =
    topic === "Símbolos" || topic === "Nomes" || topic === "Cotidiano"
      ? topic
      : "Misto";
  const count = Math.max(1, Math.min(20, Math.floor(requestedCount) || 1));
  const drafts = shuffle(makeDrafts(validElements, validTopic)).slice(0, count);

  return drafts.map(({ choices, ...draft }) => {
    const distractors = shuffle(
      [...new Set(choices)].filter((choice) => choice !== draft.answer),
    ).slice(0, 3);
    const options = shuffle([draft.answer, ...distractors]);
    return { ...draft, options };
  });
}
