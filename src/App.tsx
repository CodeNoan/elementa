import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  type FeedbackComment,
  mergeComments,
  validateCommentInput,
} from "./comments-model";
import { loadComments, saveComment } from "./comments";

const NAME_KEY = "elementa:commenter-name";
type FeedMode = "shared" | "local" | "offline";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function App() {
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<FeedMode>("local");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await loadComments();
      setComments(result.comments);
      setMode(result.mode);
      if (result.mode === "offline") {
        setNotice("Sem conexão com o fórum. Os comentários pendentes serão enviados quando a conexão voltar.");
      }
    } catch {
      setMode("offline");
      setNotice("Não foi possível atualizar. Os comentários salvos neste navegador continuam disponíveis.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    try {
      const savedName = window.localStorage.getItem(NAME_KEY);
      if (savedName) setName(savedName);
    } catch {
      // O fórum continua funcionando mesmo quando o navegador bloqueia o armazenamento local.
    }
  }, [refresh]);

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = validateCommentInput(name, feedback);
    if (!checked.ok) {
      setNotice(checked.message);
      return;
    }

    setSubmitting(true);
    setNotice("");
    try {
      const result = await saveComment(checked.value);
      setComments((current) => mergeComments([result.comment], current));
      setMode(result.mode);
      setName(checked.value.name);
      setFeedback("");
      try {
        window.localStorage.setItem(NAME_KEY, checked.value.name);
      } catch {
        // A falha ao lembrar o nome não impede a publicação.
      }
      setNotice(
        result.mode === "shared"
          ? "Comentário publicado no fórum; todos os visitantes podem vê-lo."
          : "Comentário guardado neste navegador. Ele será enviado ao fórum quando o Netlify estiver disponível.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível salvar o comentário. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const modeDescription =
    mode === "shared"
      ? "Fórum compartilhado: todas as pessoas veem os comentários publicados."
      : mode === "offline"
        ? "Sem conexão com o Netlify: comentários pendentes ficam marcados até serem publicados."
        : "Prévia local: comentários ficam neste navegador até o site ser publicado no Netlify.";

  return (
    <main className="page-shell">
      <div className="page-content">
        <header className="brand-row">
          <div className="brand-mark" aria-hidden="true">El</div>
          <div>
            <div className="wordmark">elementa<span>.</span></div>
            <div className="eyebrow">COMUNIDADE</div>
          </div>
        </header>

        <section className="intro" aria-labelledby="page-title">
          <p className="section-kicker">UM ESPAÇO ABERTO</p>
          <h1 id="page-title">Fórum de comentários</h1>
          <p className="subtitle">
            Compartilhe uma ideia, sugestão ou opinião. Sem cadastro e sem login — seu nome e feedback são necessários para publicar.
          </p>
        </section>

        <section className="form-panel" aria-labelledby="form-title">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">PARTICIPE</p>
              <h2 id="form-title">Deixe seu feedback</h2>
            </div>
            <span className="public-badge"><span aria-hidden="true" /> Público</span>
          </div>
          <p className="privacy-note">
            Seu nome e comentário ficarão visíveis para todas as pessoas que acessarem o fórum. Não compartilhe dados pessoais sensíveis.
          </p>

          <form onSubmit={submitFeedback}>
            <label className="field-label" htmlFor="commenter-name">Seu nome</label>
            <input
              id="commenter-name"
              name="name"
              className="text-input"
              type="text"
              placeholder="Como podemos chamar você?"
              autoComplete="name"
              autoCapitalize="words"
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <div className="counter">{name.length}/60</div>

            <label className="field-label" htmlFor="feedback">Seu feedback</label>
            <textarea
              id="feedback"
              name="feedback"
              className="text-input feedback-input"
              placeholder="Escreva seu comentário…"
              minLength={3}
              maxLength={1000}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              required
            />
            <div className="counter">{feedback.length}/1.000</div>

            <button className="submit-button" type="submit" disabled={submitting}>
              {submitting ? "Enviando…" : "Publicar comentário"}
              {!submitting && <span aria-hidden="true">↗</span>}
            </button>
            {notice && <p className="notice" role="status" aria-live="polite">{notice}</p>}
          </form>
        </section>

        <section className="comments-section" aria-labelledby="comments-title">
          <div className="comments-header">
            <div>
              <p className="section-kicker">A CONVERSA</p>
              <h2 id="comments-title">Comentários <span className="count-pill">{comments.length}</span></h2>
            </div>
            <button className="refresh-button" type="button" onClick={() => void refresh()} disabled={refreshing}>
              <span className={refreshing ? "refresh-icon spinning" : "refresh-icon"} aria-hidden="true">↻</span>
              {refreshing ? "Atualizando" : "Atualizar"}
            </button>
          </div>
          <p className="mode-description">{modeDescription}</p>

          {loading && comments.length === 0 ? (
            <div className="state-card"><span className="loader" aria-hidden="true" />Carregando comentários…</div>
          ) : comments.length > 0 ? (
            <div className="comment-list">
              {comments.map((comment) => (
                <article className="comment-card" key={comment.id}>
                  <div className="comment-topline">
                    <div className="comment-author">
                      <span className="avatar" aria-hidden="true">{comment.name.trim().charAt(0).toUpperCase()}</span>
                      <div>
                        <h3>{comment.name}</h3>
                        <time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time>
                      </div>
                    </div>
                    {comment.localOnly && <span className="pending-badge">Pendente</span>}
                  </div>
                  <p className="comment-body">{comment.feedback}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-mark" aria-hidden="true">✳</span>
              <h3>Ainda não há comentários</h3>
              <p>Seja a primeira pessoa a compartilhar um feedback.</p>
            </div>
          )}
        </section>

        <footer className="site-footer">
          <span>Elementa · Fórum da comunidade</span>
          <span>Uma conversa aberta, sem login.</span>
        </footer>
      </div>
    </main>
  );
}
