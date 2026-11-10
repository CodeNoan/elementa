import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import elements from "./elements.json";
import { makeQuiz, type Question, type QuizTopic } from "./quiz";
import { type FeedbackComment, mergeComments, validateCommentInput } from "./comments-model";
import { loadComments, saveComment, type FeedMode } from "./comments";

type ElementData = (typeof elements)[number];
type Tab = "Tabela" | "Início" | "Quiz" | "Favoritos" | "Perfil" | "Feedback";
type Result = { date: string; score: number; total: number; topic: string };
type Progress = { favorites: number[]; history: Result[]; seen: number[] };
const EMPTY_PROGRESS = (): Progress => ({ favorites: [], history: [], seen: [] });
const PROGRESS_KEY = "elementa:guest";
const NAME_KEY = "elementa:commenter-name";
const categories: Record<string, string> = {
  "Não metais": "#55d4a5",
  "Gases nobres": "#b99aff",
  "Metais alcalinos": "#ff9b76",
  "Alcalino-terrosos": "#eccc77",
  Semimetais: "#79ccc9",
  "Metais pós-transição": "#9eb7d6",
  "Metais de transição": "#78abf5",
  Lantanídeos: "#e69bc4",
  Actinídeos: "#c7a0e9",
  Halogênios: "#a6d46d",
  "Classificação incerta": "#a2a5af",
};
const uses: Record<number, string> = {
  1: "Usado na produção de amônia e em células a combustível.",
  2: "Usado em criogenia, inclusive no resfriamento de equipamentos de ressonância magnética.",
  3: "Compostos de lítio são usados em baterias recarregáveis.",
  6: "Presente nos seres vivos; grafite e diamante são formas do carbono.",
  7: "Usado na fabricação de fertilizantes e na conservação em atmosferas inertes.",
  8: "Essencial à respiração aeróbia e usado em processos industriais.",
  11: "Compostos como o cloreto de sódio estão presentes no cotidiano. O sódio metálico é muito reativo.",
  13: "Usado em embalagens, estruturas e transportes por sua baixa densidade.",
  14: "Usado em semicondutores; compostos de silício compõem vidros e cerâmicas.",
  17: "Compostos de cloro são usados no tratamento de água.",
  20: "Presente em minerais e em tecidos como ossos e dentes, na forma de compostos.",
  26: "Principal componente dos aços, usados na construção e em máquinas.",
  29: "Usado em fios elétricos e tubulações.",
  47: "Usada em joalheria, contatos elétricos e outros materiais.",
  79: "Usado em joias e contatos eletrônicos pela resistência à corrosão.",
  80: "Metal líquido em condições ambientes; é tóxico e exige controle de exposição.",
  92: "Usado como combustível nuclear; é radioativo.",
};
const tabs: { id: Tab; icon: string }[] = [
  { id: "Tabela", icon: "▦" },
  { id: "Início", icon: "⌂" },
  { id: "Quiz", icon: "?" },
  { id: "Favoritos", icon: "☆" },
  { id: "Perfil", icon: "◉" },
  { id: "Feedback", icon: "✎" },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function readProgress(): Progress {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROGRESS_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return EMPTY_PROGRESS();
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites.filter(Number.isInteger) : [],
      history: Array.isArray(parsed.history) ? parsed.history.filter((item: Result) => item && typeof item.date === "string") : [],
      seen: Array.isArray(parsed.seen) ? parsed.seen.filter(Number.isInteger) : [],
    };
  } catch {
    return EMPTY_PROGRESS();
  }
}
function Stat({ value, label }: { value: string; label: string }) {
  return <div className="stat-card"><strong>{value}</strong><span>{label}</span></div>;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("Tabela");
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS());
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [listView, setListView] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<ElementData | null>(null);
  const [compareElement, setCompareElement] = useState<ElementData | null>(null);
  const [secondElement, setSecondElement] = useState<ElementData | null>(null);
  const [comparing, setComparing] = useState(false);
  const [topic, setTopic] = useState<QuizTopic>("Misto");
  const [questionCount, setQuestionCount] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [quizDone, setQuizDone] = useState(false);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [commentName, setCommentName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedMode, setFeedMode] = useState<FeedMode>("local");
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedSubmitting, setFeedSubmitting] = useState(false);
  const [feedNotice, setFeedNotice] = useState("");

  useEffect(() => {
    setProgress(readProgress());
    try {
      setCommentName(window.localStorage.getItem(NAME_KEY) || "");
    } catch {
      // A navegação e o estudo não dependem do armazenamento local do navegador.
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // O estudo continua disponível nesta sessão mesmo se o navegador bloquear o cache.
    }
  }, [progress, ready]);

  const refreshFeedback = useCallback(async () => {
    setFeedLoading(true);
    try {
      const result = await loadComments();
      setComments(result.comments);
      setFeedMode(result.mode);
      if (result.mode === "offline") {
        setFeedNotice("Sem conexão com o fórum. Comentários pendentes serão enviados quando a conexão voltar.");
      }
    } catch {
      setFeedMode("offline");
      setFeedNotice("Não foi possível atualizar. Os comentários guardados neste navegador continuam disponíveis.");
    } finally {
      setFeedLoading(false);
    }
  }, []);
  useEffect(() => {
    if (tab === "Feedback") void refreshFeedback();
  }, [tab, refreshFeedback]);

  const filteredElements = useMemo(() => elements.filter((element) =>
    (category === "Todas" || element.category === category) &&
    normalize(`${element.name} ${element.symbol} ${element.number}`).includes(normalize(query)),
  ), [category, query]);
  const favorites = useMemo(() => new Set(progress.favorites), [progress.favorites]);
  const xp = progress.history.reduce((sum, result) => sum + result.score * 10, 0);
  const answered = progress.history.reduce((sum, result) => sum + result.total, 0);
  const scoreRate = answered ? Math.round((xp / 10 / answered) * 100) : 0;
  const level = Math.floor(xp / 200) + 1;

  function updateProgress(next: Progress) {
    setProgress(next);
  }
  function openElement(element: ElementData) {
    if (comparing && compareElement) {
      setSecondElement(element);
      setComparing(false);
      return;
    }
    setSelected(element);
    if (!progress.seen.includes(element.number)) {
      updateProgress({ ...progress, seen: [...progress.seen, element.number] });
    }
  }
  function toggleFavorite(element: ElementData) {
    updateProgress({
      ...progress,
      favorites: favorites.has(element.number)
        ? progress.favorites.filter((number) => number !== element.number)
        : [...progress.favorites, element.number],
    });
  }
  function startQuiz() {
    setQuestions(makeQuiz(elements, questionCount, topic));
    setAnswers([]);
    setQuestionIndex(0);
    setQuizDone(false);
  }
  function advanceQuiz() {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex(questionIndex + 1);
      return;
    }
    const score = questions.filter((question, index) => question.answer === answers[index]).length;
    updateProgress({
      ...progress,
      history: [{ date: new Date().toISOString(), score, total: questions.length, topic }, ...progress.history].slice(0, 100),
    });
    setQuizDone(true);
  }
  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateCommentInput(commentName, feedback);
    if (!validation.ok) {
      setFeedNotice(validation.message);
      return;
    }
    setFeedSubmitting(true);
    setFeedNotice("");
    try {
      const result = await saveComment(validation.value);
      setComments((current) => mergeComments([result.comment], current));
      setFeedMode(result.mode);
      setCommentName(validation.value.name);
      setFeedback("");
      try { window.localStorage.setItem(NAME_KEY, validation.value.name); } catch { /* não impede o envio */ }
      setFeedNotice(result.mode === "shared"
        ? "Feedback publicado. Todas as pessoas que acessarem a aba Feedback poderão vê-lo."
        : "Feedback guardado neste navegador. Ele será sincronizado quando o Netlify estiver disponível.");
    } catch (error) {
      setFeedNotice(error instanceof Error ? error.message : "Não foi possível salvar o feedback. Tente novamente.");
    } finally {
      setFeedSubmitting(false);
    }
  }

  function elementCard(element: ElementData, tablePosition = false) {
    const color = categories[element.category] || "#a2a5af";
    const style: CSSProperties = {
      borderColor: color,
      backgroundColor: `${color}17`,
      ...(tablePosition ? { gridColumn: element.xpos, gridRow: element.ypos } : {}),
    };
    return (
      <button
        key={element.number}
        className={`element-card${tablePosition ? " periodic-cell" : " list-cell"}`}
        style={style}
        type="button"
        onClick={() => openElement(element)}
        aria-label={`${element.number}, ${element.name}, símbolo ${element.symbol}`}
      >
        <span className="atomic-number" style={{ color }}>{element.number}</span>
        <span className="chemical-symbol" style={{ color }}>{element.symbol}</span>
        <span className="element-name">{element.name}</span>
        <span className="atomic-mass">{element.atomic_mass.toFixed(3)}</span>
        {favorites.has(element.number) && <span className="favorite-indicator" aria-label="favorito">★</span>}
      </button>
    );
  }

  function renderElementExplorer(favoritesOnly = false) {
    const visible = favoritesOnly
      ? filteredElements.filter((element) => favorites.has(element.number))
      : filteredElements;
    return (
      <>
        <div className="page-heading">
          <div><p className="eyebrow">EXPLORE A MATÉRIA</p><h1>{favoritesOnly ? "Seus favoritos" : "Tabela periódica"}</h1></div>
          <span className="count-pill">{visible.length} elementos</span>
        </div>
        {comparing && compareElement && <div className="compare-hint">Escolha na tabela um segundo elemento para comparar com <b>{compareElement.name}</b>.</div>}
        <div className="table-toolbar">
          <label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Buscar elemento" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, símbolo ou número" /></label>
          <button className="secondary-button" type="button" onClick={() => setListView(!listView)}>{listView ? "Ver tabela" : "Ver lista"}</button>
          {!listView && <div className="zoom-controls"><button className="secondary-button square" type="button" aria-label="Diminuir tabela" onClick={() => setZoom(Math.max(0.7, Number((zoom - 0.15).toFixed(2))))}>−</button><button className="secondary-button square" type="button" aria-label="Ampliar tabela" onClick={() => setZoom(Math.min(1.6, Number((zoom + 0.15).toFixed(2))))}>+</button></div>}
        </div>
        <div className="category-filters" aria-label="Filtrar por família">
          {["Todas", ...Object.keys(categories)].map((name) => <button key={name} type="button" className={`filter-chip${category === name ? " active" : ""}`} onClick={() => setCategory(name)}>{name}</button>)}
        </div>
        {visible.length ? listView || favoritesOnly ? (
          <div className="element-list-grid">{visible.map((element) => elementCard(element))}</div>
        ) : (
          <>
            <p className="table-instruction">Role horizontalmente para explorar todos os grupos. Use + e − para ajustar a escala.</p>
            <div className="periodic-scroll"><div className="periodic-grid" style={{ "--cell-width": `${Math.round(66 * zoom)}px`, "--cell-height": `${Math.round(78 * zoom)}px` } as CSSProperties}>{visible.map((element) => elementCard(element, true))}</div></div>
            <p className="series-note">Os lantanídeos e actinídeos aparecem nas duas linhas inferiores da tabela.</p>
          </>
        ) : <div className="empty-state"><strong>Nenhum elemento encontrado.</strong><span>Altere a busca ou escolha outra família.</span></div>}
        <div className="legend-panel"><h2>Famílias dos elementos</h2><div className="legend-grid">{Object.entries(categories).map(([name, color]) => <span key={name} style={{ "--legend-color": color } as CSSProperties}><i />{name}</span>)}</div></div>
      </>
    );
  }

  function renderHome() {
    const today = elements[Math.floor(Date.now() / 86_400_000) % elements.length];
    const todayQuestions = progress.history.filter((result) => new Date(result.date).toDateString() === new Date().toDateString()).reduce((sum, result) => sum + result.total, 0);
    return <>
      <p className="eyebrow">SEU LABORATÓRIO DE DESCOBERTAS</p>
      <h1>Olá, explorador.<br />Vamos descobrir?</h1>
      <p className="lead">Pequenas descobertas. Grandes conexões.</p>
      <div className="stats-row"><Stat value={String(progress.seen.length)} label="elementos vistos" /><Stat value={String(xp)} label="pontos" /><Stat value={`${scoreRate}%`} label="de acertos" /></div>
      <section className="daily-element" style={{ "--daily-color": categories[today.category] } as CSSProperties}>
        <div><p className="eyebrow">ELEMENTO DO DIA · {today.category.toUpperCase()}</p><div className="daily-symbol">{today.symbol}</div><h2>{today.name}</h2><p>Número atômico {today.number} · {today.phase.toLowerCase()}</p><button className="primary-button" type="button" onClick={() => openElement(today)}>Conhecer elemento <span>→</span></button></div>
      </section>
      <div className="home-panels"><section className="feature-panel"><p className="eyebrow">DESAFIO RÁPIDO</p><h2>Desafie sua memória</h2><p>Símbolos, nomes e exemplos do cotidiano em um quiz simples e acessível.</p><button className="secondary-button" type="button" onClick={() => setTab("Quiz")}>Começar um quiz</button></section><section className="feature-panel"><p className="eyebrow">META DIÁRIA · 10 QUESTÕES</p><h2>{todayQuestions} respondidas hoje</h2><p>Continue aprendendo um pouco a cada visita.</p><button className="secondary-button" type="button" onClick={() => setTab("Tabela")}>Explorar a tabela</button></section></div>
      <section className="collection-panel"><div><p className="eyebrow">SUA COLEÇÃO</p><h2>{progress.favorites.length} favoritos</h2><p>Salve elementos para revisitar quando quiser.</p></div><button className="secondary-button" type="button" onClick={() => setTab("Favoritos")}>Abrir favoritos →</button></section>
    </>;
  }

  function renderQuiz() {
    const score = questions.filter((question, index) => question.answer === answers[index]).length;
    if (!questions.length) return <>
      <p className="eyebrow">APRENDA NA PRÁTICA</p><h1>Um desafio por vez.</h1>
      <p className="lead">Perguntas curtas sobre símbolos, nomes e exemplos do cotidiano, com explicações simples.</p>
      <section className="quiz-setup panel"><h2>O que você quer revisar?</h2><div className="choice-row">{(["Misto", "Símbolos", "Nomes", "Cotidiano"] as QuizTopic[]).map((value) => <button key={value} type="button" className={`choice-button${topic === value ? " selected" : ""}`} onClick={() => setTopic(value)}>{value}</button>)}</div><h2>Tamanho da sessão</h2><div className="choice-row">{[5, 10, 20].map((value) => <button key={value} type="button" className={`choice-button${questionCount === value ? " selected" : ""}`} onClick={() => setQuestionCount(value)}>{value} questões</button>)}</div><button className="primary-button" type="button" onClick={startQuiz}>Iniciar desafio <span>→</span></button></section>
    </>;
    if (quizDone) return <>
      <p className="eyebrow">SESSÃO CONCLUÍDA</p><h1>Você fez {score}/{questions.length} pontos.</h1><p className="lead">Cada tentativa ensina. Você ganhou {score * 10} pontos de experiência.</p><button className="primary-button" type="button" onClick={() => setQuestions([])}>Novo desafio</button><h2 className="review-title">Revise suas respostas</h2><div className="review-list">{questions.map((question, index) => <article className="review-card" key={`${question.prompt}-${index}`}><strong className={answers[index] === question.answer ? "answer-correct" : "answer-wrong"}>{answers[index] === question.answer ? "✓" : "×"} {question.prompt}</strong><span>Sua resposta: {answers[index]} · Correta: {question.answer}</span><p>{question.explanation}</p></article>)}</div>
    </>;
    const question = questions[questionIndex];
    return <>
      <p className="eyebrow">APRENDA NA PRÁTICA</p><h1>Um desafio por vez.</h1><p className="lead">{topic} · questão {questionIndex + 1} de {questions.length}</p><div className="progress-track"><div style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
      <section className="question-panel panel"><h2>{question.prompt}</h2><div className="option-list">{question.options.map((option) => <button key={option} type="button" disabled={answers[questionIndex] !== undefined} onClick={() => { const next = [...answers]; next[questionIndex] = option; setAnswers(next); }} className={`quiz-option${answers[questionIndex] !== undefined && option === question.answer ? " correct" : ""}${answers[questionIndex] === option && option !== question.answer ? " wrong" : ""}`}>{option}</button>)}</div>{answers[questionIndex] !== undefined && <div className="answer-explanation"><p>{question.explanation}</p><button className="primary-button" type="button" onClick={advanceQuiz}>{questionIndex === questions.length - 1 ? "Ver resultado" : "Próxima questão →"}</button></div>}</section>
      <button className="text-button" type="button" onClick={() => setQuestions([])}>Encerrar sem salvar</button>
    </>;
  }

  function renderProfile() {
    return <>
      <p className="eyebrow">SUA JORNADA</p><h1>Seu progresso</h1><p className="lead">Os favoritos e resultados ficam salvos neste navegador, sem necessidade de criar uma conta.</p>
      <div className="stats-row"><Stat value={String(xp)} label="experiência" /><Stat value={String(progress.history.length)} label="quizzes" /><Stat value={String(progress.favorites.length)} label="favoritos" /></div>
      <section className="panel achievement-panel"><h2>Conquistas</h2><p>{progress.seen.length ? "✓" : "○"} Primeira descoberta</p><p>{progress.history.length ? "✓" : "○"} Primeiro quiz concluído</p><p>{progress.seen.length >= 20 ? "✓" : "○"} Explorador: consulte 20 elementos</p><p>{progress.history.some((result) => result.score === result.total) ? "✓" : "○"} Precisão total: acerte um quiz inteiro</p></section>
      <h2 className="review-title">Histórico recente</h2>{!progress.history.length ? <p className="lead">Seus resultados aparecerão aqui após o primeiro quiz.</p> : <div className="history-list">{progress.history.map((result, index) => <div className="history-row" key={`${result.date}-${index}`}><div><strong>{result.topic}</strong><span>{new Date(result.date).toLocaleDateString("pt-BR")}</span></div><b>{result.score}/{result.total}</b></div>)}</div>}
      <section className="source-panel"><h2>Sobre os dados</h2><p>Propriedades adaptadas da base Periodic-Table-JSON. Valores podem variar conforme condições e isótopos; algumas propriedades dos elementos superpesados são estimadas.</p><a href="https://github.com/Bowserinator/Periodic-Table-JSON" target="_blank" rel="noreferrer">Consultar fonte original ↗</a><a href="/DATA-LICENSE.md" target="_blank" rel="noreferrer">Licença e atribuição dos dados ↗</a></section>
    </>;
  }

  function renderFeedback() {
    const modeDescription = feedMode === "shared"
      ? "Fórum compartilhado: todas as pessoas veem os feedbacks publicados."
      : feedMode === "offline"
        ? "Sem conexão com o Netlify: feedbacks pendentes ficam marcados até serem publicados."
        : "Prévia local: feedbacks ficam neste navegador até o site ser publicado no Netlify.";
    return <>
      <p className="eyebrow">UMA ABA DA COMUNIDADE</p><h1>Fórum de feedback</h1><p className="lead">A tabela periódica e o quiz continuam nas outras abas. Use este espaço para enviar sugestões e opiniões.</p>
      <section className="feedback-form panel"><div className="feedback-heading"><div><p className="eyebrow">PARTICIPE</p><h2>Deixe seu feedback</h2></div><span className="public-badge"><i />Público</span></div><p className="privacy-note">Seu nome e comentário ficarão visíveis para todas as pessoas. Não compartilhe informações pessoais sensíveis.</p>
        <form onSubmit={submitFeedback}><label htmlFor="feedback-name">Seu nome</label><input id="feedback-name" value={commentName} onChange={(event) => setCommentName(event.target.value)} placeholder="Como podemos chamar você?" minLength={2} maxLength={60} autoComplete="name" required /><span className="field-counter">{commentName.length}/60</span><label htmlFor="feedback-text">Seu feedback</label><textarea id="feedback-text" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Escreva seu comentário…" minLength={3} maxLength={1000} required /><span className="field-counter">{feedback.length}/1.000</span><button className="primary-button submit-feedback" type="submit" disabled={feedSubmitting}>{feedSubmitting ? "Enviando…" : "Publicar feedback"}</button>{feedNotice && <p className="feed-notice" role="status" aria-live="polite">{feedNotice}</p>}</form>
      </section>
      <div className="feedback-list-heading"><div><p className="eyebrow">A CONVERSA</p><h2>Feedbacks <span className="count-pill">{comments.length}</span></h2></div><button className="secondary-button" type="button" onClick={() => void refreshFeedback()} disabled={feedLoading}>{feedLoading ? "Atualizando…" : "↻ Atualizar"}</button></div><p className="mode-description">{modeDescription}</p>
      {feedLoading && !comments.length ? <div className="empty-state">Carregando feedbacks…</div> : comments.length ? <div className="feedback-list">{comments.map((comment) => <article className="feedback-card" key={comment.id}><div className="feedback-meta"><div className="feedback-avatar">{comment.name.trim().charAt(0).toUpperCase()}</div><div><strong>{comment.name}</strong><time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time></div>{comment.localOnly && <span className="pending-badge">Pendente</span>}</div><p>{comment.feedback}</p></article>)}</div> : <div className="empty-state"><strong>Ainda não há feedbacks.</strong><span>Seja a primeira pessoa a compartilhar uma sugestão.</span></div>}
    </>;
  }

  const dayElement = elements[Math.floor(Date.now() / 86_400_000) % elements.length];
  const detailProperties: [string, unknown][] = selected ? [
    ["Número atômico / prótons", selected.number],
    ["Elétrons (átomo neutro)", selected.number],
    ["Massa atômica (u)", selected.atomic_mass],
    ["Período", selected.period],
    ["Grupo", selected.number >= 57 && selected.number <= 71 || selected.number >= 89 && selected.number <= 103 ? "Série f" : selected.group],
    ["Configuração eletrônica", selected.electron_configuration],
    ["Elétrons por camada", selected.shells.join(" · ")],
    ["Eletronegatividade (Pauling)", selected.electronegativity_pauling],
    ["Fusão (K)", selected.melt],
    ["Ebulição (K)", selected.boil],
    ["Densidade (g/L para gases; g/cm³ demais)", selected.density],
  ] : [];
  const compareProperties: { key: keyof ElementData; label: string }[] = [
    { key: "number", label: "Número atômico" },
    { key: "atomic_mass", label: "Massa atômica (u)" },
    { key: "category", label: "Categoria" },
    { key: "period", label: "Período" },
    { key: "phase", label: "Estado físico" },
    { key: "electronegativity_pauling", label: "Eletronegatividade" },
    { key: "melt", label: "Fusão (K)" },
    { key: "boil", label: "Ebulição (K)" },
  ];

  if (!ready) return <div className="app-loading"><span className="loader" />Abrindo a tabela periódica…</div>;
  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="#tabela" onClick={(event) => { event.preventDefault(); setTab("Tabela"); }}><span className="brand-mark">El</span><span><b>elementa<span>.</span></b><small>QUÍMICA PARA DESCOBRIR</small></span></a><div className="header-status"><span className="status-dot" />NÍVEL {level}<span className="header-xp">{xp} XP</span></div></header>
    <nav className="main-tabs" role="tablist" aria-label="Navegação principal">{tabs.map(({ id, icon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={`tab-button${tab === id ? " active" : ""}`} onClick={() => setTab(id)}><span className="tab-icon" aria-hidden="true">{icon}</span><span>{id}</span></button>)}</nav>
    <main className="main-content" role="tabpanel">
      {tab === "Tabela" && renderElementExplorer(false)}
      {tab === "Favoritos" && renderElementExplorer(true)}
      {tab === "Início" && renderHome()}
      {tab === "Quiz" && renderQuiz()}
      {tab === "Perfil" && renderProfile()}
      {tab === "Feedback" && renderFeedback()}
    </main>
    <footer className="app-footer"><span>Elementa · Tabela periódica interativa</span><span>Dados: Periodic-Table-JSON · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a></span></footer>

    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="element-modal" role="dialog" aria-modal="true" aria-labelledby="element-title"><div className="modal-toolbar"><span className="eyebrow">{selected.category.toUpperCase()}</span><button className="close-button" type="button" onClick={() => setSelected(null)} aria-label="Fechar detalhes">×</button></div><div className="element-hero" style={{ "--element-color": categories[selected.category] } as CSSProperties}><span className="detail-number">Nº {selected.number}</span><strong>{selected.symbol}</strong><h2 id="element-title">{selected.name}</h2><span>{selected.category} · {selected.phase} · período {selected.period}</span></div><div className="detail-actions"><button className="secondary-button" type="button" onClick={() => toggleFavorite(selected)}>{favorites.has(selected.number) ? "★ Remover dos favoritos" : "☆ Salvar nos favoritos"}</button><button className="secondary-button" type="button" onClick={() => { setCompareElement(selected); setSecondElement(null); setComparing(true); setQuery(""); setCategory("Todas"); setSelected(null); setTab("Tabela"); }}>Comparar com outro elemento</button></div><h3 className="detail-section-title">Identidade e propriedades</h3><div className="property-list">{detailProperties.map(([label, value]) => <div className="property-row" key={label}><span>{label}</span><strong>{value === null || value === undefined || value === "" ? "Não disponível" : String(value)}</strong></div>)}</div><p className="detail-footnote">Estado físico referido à base em condições ambientes. Temperaturas em kelvin; °C = K − 273,15. A massa é representativa; nêutrons dependem do isótopo.</p><section className="connection-panel"><h3>Conexões com o mundo</h3><p>{uses[selected.number] || `${selected.name} pertence à categoria ${selected.category.toLowerCase()}. Sua posição na tabela ajuda a estudar tendências e comparar propriedades com outros elementos.`}</p></section><a className="source-link" href={selected.source} target="_blank" rel="noreferrer">Fonte e informações adicionais ↗</a></section></div>}

    {compareElement && secondElement && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setCompareElement(null); setSecondElement(null); } }}><section className="compare-modal" role="dialog" aria-modal="true" aria-labelledby="compare-title"><div className="modal-toolbar"><p className="eyebrow">COMPARAÇÃO DE ELEMENTOS</p><button className="close-button" type="button" onClick={() => { setCompareElement(null); setSecondElement(null); }} aria-label="Fechar comparação">×</button></div><h2 id="compare-title">Lado a lado.</h2><div className="compare-elements">{[compareElement, secondElement].map((element) => <div key={element.number} style={{ "--element-color": categories[element.category] } as CSSProperties}><strong>{element.symbol}</strong><span>{element.name}</span></div>)}</div><div className="compare-property-list">{compareProperties.map(({ key, label }) => <div className="compare-row" key={key}><span>{label}</span><strong>{compareElement[key] === null || compareElement[key] === undefined ? "Não disponível" : String(compareElement[key])}</strong><strong>{secondElement[key] === null || secondElement[key] === undefined ? "Não disponível" : String(secondElement[key])}</strong></div>)}</div><button className="secondary-button" type="button" onClick={() => { setCompareElement(null); setSecondElement(null); }}>Voltar à tabela</button></section></div>}
  </div>;
}
