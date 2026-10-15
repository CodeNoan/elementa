import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { backend } from "./src/backend";
import elements from "./src/elements.json";
import { makeQuiz, Question } from "./src/quiz";

type Element = (typeof elements)[number];
type Result = { date: string; score: number; total: number; topic: string };
type Progress = { favorites: number[]; history: Result[]; seen: number[] };
const empty = (): Progress => ({ favorites: [], history: [], seen: [] });
const colors: Record<string, string> = {
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
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        s.button,
        secondary && s.secondary,
        disabled && { opacity: 0.45 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: "#e8edf5" }]}>
        {label}
      </Text>
    </Pressable>
  );
}
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.small}>{label}</Text>
    </View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}
function Main() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null),
    [guest, setGuest] = useState(false),
    [tab, setTab] = useState("Início");
  const [ready, setReady] = useState(false),
    [progress, setProgress] = useState<Progress>(empty()),
    [sync, setSync] = useState("");
  const [selected, setSelected] = useState<Element | null>(null),
    [compare, setCompare] = useState<Element | null>(null),
    [comparing, setComparing] = useState(false),
    [second, setSecond] = useState<Element | null>(null);
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("Todas"),
    [list, setList] = useState(false),
    [zoom, setZoom] = useState(1);
  const [authMode, setAuthMode] = useState("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [difficulty, setDifficulty] = useState("Todos"),
    [topic, setTopic] = useState("Misto"),
    [count, setCount] = useState(10),
    [questions, setQuestions] = useState<Question[]>([]),
    [index, setIndex] = useState(0),
    [answers, setAnswers] = useState<string[]>([]),
    [done, setDone] = useState(false);
  const saveQueue = useRef(Promise.resolve());
  const storageKey = user ? `elementa:${user.id}` : "elementa:guest";
  useEffect(() => {
    if (!backend) return;
    backend.auth.getSession().then(({ data }) => {
      if (data.session) {
        const u = data.session.user;
        setUser({ id: u.id, name: u.user_metadata.name || "Estudante" });
      }
    });
    const { data } = backend.auth.onAuthStateChange((_event, session) => {
      setUser(
        session
          ? {
              id: session.user.id,
              name: session.user.user_metadata.name || "Estudante",
            }
          : null,
      );
    });
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") backend?.auth.startAutoRefresh();
      else backend?.auth.stopAutoRefresh();
    });
    return () => {
      data.subscription.unsubscribe();
      sub.remove();
    };
  }, []);
  useEffect(() => {
    let active = true;
    setReady(false);
    setSync("");
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(storageKey);
        const local = cached ? JSON.parse(cached) : null;
        let p: Progress = local?.payload || local || empty();
        if (user && backend) {
          const { data, error } = await backend
            .from("study_data")
            .select("payload,updated_at")
            .eq("user_id", user.id)
            .maybeSingle();
          if (error)
            setSync("Sem conexão com a nuvem. Dados locais preservados.");
          else if (
            data &&
            (!local?.updatedAt || data.updated_at > local.updatedAt)
          ) {
            p = data.payload;
            await AsyncStorage.setItem(
              storageKey,
              JSON.stringify({ payload: p, updatedAt: data.updated_at }),
            );
          }
        }
        if (active) {
          setProgress(p);
          setReady(true);
        }
      } catch {
        if (active) {
          setProgress(empty());
          setReady(true);
          setSync("Não foi possível carregar o progresso.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [storageKey]);
  function update(p: Progress) {
    setProgress(p);
    const key = storageKey,
      uid = user?.id;
    saveQueue.current = saveQueue.current
      .then(async () => {
        const updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(
          key,
          JSON.stringify({ payload: p, updatedAt }),
        );
        if (uid && backend) {
          const { error } = await backend
            .from("study_data")
            .upsert({ user_id: uid, payload: p, updated_at: updatedAt });
          setSync(
            error
              ? "Salvo neste aparelho. Sincronização pendente."
              : "Progresso sincronizado.",
          );
        }
      })
      .catch(() =>
        setSync("Não foi possível salvar. Verifique o armazenamento."),
      );
  }
  function open(e: Element) {
    if (comparing) {
      setSecond(e);
      setComparing(false);
      return;
    }
    setSelected(e);
    if (!progress.seen.includes(e.number))
      update({ ...progress, seen: [...progress.seen, e.number] });
  }
  function favorite(e: Element) {
    update({
      ...progress,
      favorites: progress.favorites.includes(e.number)
        ? progress.favorites.filter((n) => n !== e.number)
        : [...progress.favorites, e.number],
    });
  }
  async function authenticate() {
    setMessage("");
    if (!backend) {
      setMessage(
        "Configure o Supabase seguindo o README para ativar contas. Você já pode explorar como visitante.",
      );
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("Informe um e-mail válido.");
      return;
    }
    if (authMode !== "reset" && password.length < 8) {
      setMessage("Use uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (authMode === "signup" && !name.trim()) {
      setMessage("Informe seu nome.");
      return;
    }
    setBusy(true);
    try {
      if (authMode === "reset") {
        const { error } = await backend.auth.resetPasswordForEmail(
          email.trim(),
        );
        if (error) throw error;
        setMessage(
          "Confira seu e-mail. O link abre a página de recuperação configurada no Supabase.",
        );
      } else if (authMode === "signup") {
        const { data, error } = await backend.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session)
          setMessage("Conta criada. Confirme seu e-mail antes de entrar.");
      } else {
        const { error } = await backend.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      setPassword("");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Não foi possível acessar sua conta.",
      );
    } finally {
      setBusy(false);
    }
  }
  function startQuiz() {
    setQuestions(
      makeQuiz(
        difficulty === "Essencial"
          ? elements.filter((e) => e.number <= 20)
          : difficulty === "Intermediário"
            ? elements.filter((e) => e.number <= 54)
            : elements,
        count,
        topic,
      ),
    );
    setAnswers([]);
    setIndex(0);
    setDone(false);
  }
  function next() {
    if (index < questions.length - 1) {
      setIndex(index + 1);
    } else {
      const score = questions.filter((q, i) => q.answer === answers[i]).length;
      update({
        ...progress,
        history: [
          {
            date: new Date().toISOString(),
            score,
            total: questions.length,
            topic,
          },
          ...progress.history,
        ].slice(0, 100),
      });
      setDone(true);
    }
  }
  const filtered = elements.filter(
    (e) =>
      (category === "Todas" || e.category === category) &&
      normalize(`${e.name} ${e.symbol} ${e.number}`).includes(normalize(query)),
  );
  const xp = progress.history.reduce((n, r) => n + r.score * 10, 0),
    total = progress.history.reduce((n, r) => n + r.total, 0),
    hits = xp / 10;
  const card = (e: Element, compact = false) => (
    <Pressable
      key={e.number}
      accessibilityLabel={`${e.number}, ${e.name}, ${e.symbol}`}
      onPress={() => open(e)}
      style={[
        s.element,
        {
          borderColor: colors[e.category],
          backgroundColor: colors[e.category] + "15",
        },
        compact && { width: 70 * zoom, height: 86 * zoom, margin: 2 },
      ]}
    >
      <Text style={[s.small, { color: colors[e.category] }]}>{e.number}</Text>
      <Text style={[s.symbol, { color: colors[e.category] }]}>{e.symbol}</Text>
      <Text numberOfLines={1} style={s.elementName}>
        {e.name}
      </Text>
      <Text style={s.mass}>{e.atomic_mass.toFixed(3)}</Text>
    </Pressable>
  );
  if (!user && !guest)
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView
          contentContainerStyle={s.auth}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.brandMark}>
            <Text style={s.brandSymbol}>El</Text>
            <Text style={s.small}>118 possibilidades</Text>
          </View>
          <Text style={s.logo}>
            elementa<Text style={{ color: "#79dfb5" }}>.</Text>
          </Text>
          <Text style={s.subtitle}>
            A química faz parte de tudo.{"\n"}Descubra um elemento de cada vez.
          </Text>
          <View style={s.panel}>
            <Text style={s.h2}>
              {authMode === "signup"
                ? "Crie sua conta"
                : authMode === "reset"
                  ? "Recupere o acesso"
                  : "Seu próximo descobrimento"}
            </Text>
            {authMode === "signup" && (
              <TextInput
                style={s.input}
                placeholder="Seu nome"
                placeholderTextColor="#8190a5"
                value={name}
                onChangeText={setName}
                autoComplete="name"
              />
            )}
            <TextInput
              style={s.input}
              placeholder="E-mail"
              placeholderTextColor="#8190a5"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoComplete="email"
            />
            {authMode !== "reset" && (
              <TextInput
                style={s.input}
                placeholder="Senha • mínimo de 8 caracteres"
                placeholderTextColor="#8190a5"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoComplete={
                  authMode === "signup" ? "new-password" : "current-password"
                }
              />
            )}{" "}
            {!!message && (
              <Text accessibilityRole="alert" style={s.notice}>
                {message}
              </Text>
            )}
            <Button
              disabled={busy}
              label={
                busy
                  ? "Aguarde…"
                  : authMode === "signup"
                    ? "Criar conta"
                    : authMode === "reset"
                      ? "Enviar recuperação"
                      : "Entrar"
              }
              onPress={authenticate}
            />
            <Button
              secondary
              label={
                authMode === "login" ? "Criar uma conta" : "Voltar para login"
              }
              onPress={() => {
                setAuthMode(authMode === "login" ? "signup" : "login");
                setMessage("");
              }}
            />
            {authMode === "login" && (
              <Pressable onPress={() => setAuthMode("reset")}>
                <Text style={s.link}>Esqueci minha senha</Text>
              </Pressable>
            )}
          </View>
          <Button
            secondary
            label="Explorar como visitante"
            onPress={() => setGuest(true)}
          />
          <Text style={s.small}>
            No modo visitante, seu progresso fica neste aparelho.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  if (!ready)
    return (
      <SafeAreaView style={[s.safe, s.center]}>
        <ActivityIndicator color="#79dfb5" />
        <Text style={s.subtitle}>Abrindo seu laboratório…</Text>
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.wordmark}>
          elementa<Text style={{ color: "#79dfb5" }}>.</Text>
        </Text>
        <Text style={s.pill}>NÍVEL {Math.floor(xp / 200) + 1}</Text>
      </View>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >
        {tab === "Início" && (
          <>
            <Text style={s.eyebrow}>SEU LABORATÓRIO DE DESCOBERTAS</Text>
            <Text style={s.title}>
              Olá, {user?.name.split(" ")[0] || "explorador"}.{"\n"}Vamos
              descobrir?
            </Text>
            <Text style={s.subtitle}>
              Pequenas descobertas. Grandes conexões.
            </Text>
            <View style={s.row}>
              <Stat
                value={String(progress.seen.length)}
                label="elementos vistos"
              />
              <Stat value={String(xp)} label="pontos" />
              <Stat
                value={`${total ? Math.round((hits / total) * 100) : 0}%`}
                label="de acertos"
              />
            </View>
            <View style={s.hero}>
              <Text style={s.eyebrow}>ELEMENTO DO DIA</Text>
              {(() => {
                const e = elements[Math.floor(Date.now() / 86400000) % 118];
                return (
                  <>
                    <Text style={s.heroSymbol}>{e.symbol}</Text>
                    <Text style={s.h2}>{e.name}</Text>
                    <Text style={s.subtitle}>
                      {e.category} · número atômico {e.number}
                    </Text>
                    <Button
                      label="Conhecer elemento →"
                      onPress={() => open(e)}
                    />
                  </>
                );
              })()}
            </View>
            <View style={s.panel}>
              <Text style={s.h2}>Desafie sua memória</Text>
              <Text style={s.subtitle}>
                Símbolos, números e famílias: transforme a consulta em
                conhecimento.
              </Text>
              <Button
                secondary
                label="Começar um quiz"
                onPress={() => setTab("Quiz")}
              />
            </View>
            <View style={s.panel}>
              <Text style={s.h2}>Meta diária · 10 questões</Text>
              <Text style={s.subtitle}>
                {progress.history
                  .filter(
                    (r) =>
                      new Date(r.date).toLocaleDateString() ===
                      new Date().toLocaleDateString(),
                  )
                  .reduce((n, r) => n + r.total, 0)}{" "}
                questões respondidas hoje.
              </Text>
            </View>
            <Text style={s.h2}>Sua coleção</Text>
            <Text style={s.subtitle}>
              {progress.favorites.length} favoritos para revisitar quando
              quiser.
            </Text>
            <Button
              secondary
              label="Abrir favoritos"
              onPress={() => setTab("Favoritos")}
            />
          </>
        )}
        {(tab === "Tabela" || tab === "Favoritos") && (
          <>
            <Text style={s.eyebrow}>EXPLORE A MATÉRIA</Text>
            <Text style={s.title}>
              {tab === "Tabela" ? "Tabela periódica" : "Seus favoritos"}
            </Text>
            {comparing && (
              <Text style={s.notice}>
                Escolha o segundo elemento para comparar.
              </Text>
            )}
            <TextInput
              accessibilityLabel="Buscar elemento"
              style={s.input}
              placeholder="Busque por nome, símbolo ou número"
              placeholderTextColor="#8190a5"
              value={query}
              onChangeText={setQuery}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              {["Todas", ...Object.keys(colors)].map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[s.chip, category === c && s.chipActive]}
                >
                  <Text
                    style={{ color: category === c ? "#79dfb5" : "#a7b2c5" }}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {tab === "Tabela" && (
              <View style={s.row}>
                <Button
                  secondary
                  label={list ? "Ver tabela" : "Ver lista"}
                  onPress={() => setList(!list)}
                />
                {!list && (
                  <>
                    <Button
                      secondary
                      label="−"
                      onPress={() => setZoom(Math.max(0.7, zoom - 0.15))}
                    />
                    <Button
                      secondary
                      label="+"
                      onPress={() => setZoom(Math.min(1.6, zoom + 0.15))}
                    />
                  </>
                )}
              </View>
            )}
            {tab === "Tabela" && !list ? (
              <>
                <Text style={s.small}>
                  Arraste para os lados. Use + e − para ampliar.
                </Text>
                <ScrollView horizontal>
                  <View
                    style={{
                      width: 18 * (74 * zoom),
                      height: 10 * (90 * zoom),
                      marginTop: 16,
                    }}
                  >
                    {filtered.map((e) => (
                      <View
                        key={e.number}
                        style={{
                          position: "absolute",
                          left: (e.xpos - 1) * 74 * zoom,
                          top: (e.ypos - 1) * 90 * zoom,
                        }}
                      >
                        {card(e, true)}
                      </View>
                    ))}
                    <Text
                      style={[
                        s.small,
                        {
                          position: "absolute",
                          left: 3 * 74 * zoom,
                          top: 2 * 90 * zoom,
                          width: 6 * 74 * zoom,
                        },
                      ]}
                    >
                      118 elementos · grupos 1–18{"\n"}Lantanídeos e actinídeos
                      destacados abaixo.
                    </Text>
                  </View>
                </ScrollView>
              </>
            ) : (
              <View style={s.grid}>
                {filtered
                  .filter(
                    (e) =>
                      tab !== "Favoritos" ||
                      progress.favorites.includes(e.number),
                  )
                  .map((e) => card(e))}
              </View>
            )}
            {(tab === "Favoritos"
              ? filtered.filter((e) => progress.favorites.includes(e.number))
                  .length
              : filtered.length) === 0 && (
              <Text style={s.subtitle}>
                Nenhum elemento encontrado. Explore a tabela e toque em
                favoritar.
              </Text>
            )}
            <Text style={s.h2}>Legenda</Text>
            <View style={s.grid}>
              {Object.entries(colors).map(([c, color]) => (
                <Text key={c} style={[s.legend, { color }]}>
                  ● {c}
                </Text>
              ))}
            </View>
          </>
        )}
        {tab === "Quiz" && (
          <>
            <Text style={s.eyebrow}>APRENDA NA PRÁTICA</Text>
            <Text style={s.title}>Um desafio por vez.</Text>
            {!questions.length ? (
              <>
                <Text style={s.subtitle}>
                  Escolha o tema. Cada resposta vem com uma explicação.
                </Text>
                <Text style={s.h2}>O que você quer revisar?</Text>
                <View style={s.grid}>
                  {["Misto", "Símbolos", "Números", "Categorias"].map((t) => (
                    <Button
                      key={t}
                      secondary={topic !== t}
                      label={t}
                      onPress={() => setTopic(t)}
                    />
                  ))}
                </View>
                <Text style={s.h2}>Dificuldade</Text>
                <View style={s.grid}>
                  {["Essencial", "Intermediário", "Todos"].map((d) => (
                    <Button
                      key={d}
                      secondary={difficulty !== d}
                      label={d}
                      onPress={() => setDifficulty(d)}
                    />
                  ))}
                </View>
                <Text style={s.small}>
                  Essencial: elementos 1–20. Intermediário: 1–54. Todos: 1–118.
                </Text>
                <Text style={s.h2}>Tamanho da sessão</Text>
                <View style={s.row}>
                  {[5, 10, 20].map((n) => (
                    <Button
                      key={n}
                      secondary={count !== n}
                      label={`${n} questões`}
                      onPress={() => setCount(n)}
                    />
                  ))}
                </View>
                <Button label="Iniciar desafio →" onPress={startQuiz} />
              </>
            ) : done ? (
              <>
                <View style={s.hero}>
                  <Text style={s.eyebrow}>SESSÃO CONCLUÍDA</Text>
                  <Text style={s.heroSymbol}>
                    {questions.filter((q, i) => q.answer === answers[i]).length}
                    /{questions.length}
                  </Text>
                  <Text style={s.h2}>Cada tentativa ensina.</Text>
                  <Text style={s.subtitle}>
                    Você ganhou{" "}
                    {questions.filter((q, i) => q.answer === answers[i])
                      .length * 10}{" "}
                    pontos.
                  </Text>
                  <Button
                    label="Novo desafio"
                    onPress={() => setQuestions([])}
                  />
                </View>
                <Text style={s.h2}>Revise suas respostas</Text>
                {questions.map((q, i) => (
                  <View key={i} style={s.panel}>
                    <Text style={s.body}>
                      {answers[i] === q.answer ? "✓" : "×"} {q.prompt}
                    </Text>
                    <Text style={s.small}>
                      Sua resposta: {answers[i]} · Correta: {q.answer}
                    </Text>
                    <Text style={s.subtitle}>{q.explanation}</Text>
                  </View>
                ))}
              </>
            ) : (
              <>
                <Text style={s.subtitle}>
                  {topic} · questão {index + 1} de {questions.length}
                </Text>
                <View style={s.track}>
                  <View
                    style={[
                      s.fill,
                      { width: `${((index + 1) / questions.length) * 100}%` },
                    ]}
                  />
                </View>
                <View style={s.panel}>
                  <Text style={s.h2}>{questions[index].prompt}</Text>
                  {questions[index].options.map((option) => (
                    <Pressable
                      key={option}
                      disabled={answers[index] !== undefined}
                      onPress={() => setAnswers([...answers, option])}
                      style={[
                        s.option,
                        answers[index] !== undefined &&
                          option === questions[index].answer &&
                          s.correct,
                        answers[index] === option &&
                          option !== questions[index].answer &&
                          s.wrong,
                      ]}
                    >
                      <Text style={s.body}>{option}</Text>
                    </Pressable>
                  ))}
                  {answers[index] !== undefined && (
                    <>
                      <Text style={s.subtitle}>
                        {questions[index].explanation}
                      </Text>
                      <Button
                        label={
                          index === questions.length - 1
                            ? "Ver resultado"
                            : "Próxima questão →"
                        }
                        onPress={next}
                      />
                    </>
                  )}
                </View>
                <Button
                  secondary
                  label="Encerrar sem salvar"
                  onPress={() => setQuestions([])}
                />
              </>
            )}
          </>
        )}
        {tab === "Perfil" && (
          <>
            <Text style={s.eyebrow}>SUA JORNADA</Text>
            <Text style={s.title}>{user?.name || "Explorador visitante"}</Text>
            <Text style={s.subtitle}>
              {user
                ? "Conta conectada"
                : "Progresso armazenado neste aparelho."}
            </Text>
            <View style={s.row}>
              <Stat value={String(xp)} label="experiência" />
              <Stat value={String(progress.history.length)} label="quizzes" />
              <Stat
                value={String(progress.favorites.length)}
                label="favoritos"
              />
            </View>
            <View style={s.panel}>
              <Text style={s.h2}>Conquistas</Text>
              <Text style={s.subtitle}>
                {progress.seen.length ? "✓" : "○"} Primeira descoberta
              </Text>
              <Text style={s.subtitle}>
                {progress.history.length ? "✓" : "○"} Primeiro quiz concluído
              </Text>
              <Text style={s.subtitle}>
                {progress.seen.length >= 20 ? "✓" : "○"} Explorador: consulte 20
                elementos
              </Text>
              <Text style={s.subtitle}>
                {progress.history.some((r) => r.score === r.total) ? "✓" : "○"}{" "}
                Precisão total: acerte um quiz inteiro
              </Text>
            </View>
            <Text style={s.h2}>Histórico recente</Text>
            {!progress.history.length && (
              <Text style={s.subtitle}>
                Seus resultados aparecerão aqui após o primeiro quiz.
              </Text>
            )}
            {progress.history.map((r, i) => (
              <View style={s.history} key={i}>
                <View>
                  <Text style={s.body}>{r.topic}</Text>
                  <Text style={s.small}>
                    {new Date(r.date).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
                <Text style={s.statValue}>
                  {r.score}/{r.total}
                </Text>
              </View>
            ))}
            {!!sync && <Text style={s.small}>{sync}</Text>}
            <Text style={s.h2}>Sobre os dados</Text>
            <Text style={s.subtitle}>
              Propriedades obtidas de Periodic-Table-JSON, com nomes e
              categorias adaptados para português. Valores podem variar conforme
              condições e isótopos. Categorias dos superpesados podem ser
              previstas.
            </Text>
            <Button
              secondary
              label="Consultar fonte dos dados ↗"
              onPress={() =>
                Linking.openURL(
                  "https://github.com/Bowserinator/Periodic-Table-JSON",
                )
              }
            />
            <Button
              secondary
              label={user ? "Sair da conta" : "Entrar ou criar conta"}
              onPress={async () => {
                await saveQueue.current;
                if (user) await backend?.auth.signOut();
                setUser(null);
                setGuest(false);
                setTab("Início");
              }}
            />
          </>
        )}
      </ScrollView>
      <View style={s.nav}>
        {[
          ["Início", "⌂"],
          ["Tabela", "▦"],
          ["Quiz", "?"],
          ["Favoritos", "☆"],
          ["Perfil", "◉"],
        ].map(([label, icon]) => (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === label }}
            onPress={() => setTab(label)}
            style={s.navItem}
          >
            <Text style={[s.navIcon, tab === label && { color: "#79dfb5" }]}>
              {icon}
            </Text>
            <Text style={[s.navText, tab === label && { color: "#79dfb5" }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Modal
        visible={!!selected}
        animationType="slide"
        onRequestClose={() => {
          setSelected(null);
          setCompare(null);
        }}
      >
        <SafeAreaView style={s.safe}>
          <ScrollView contentContainerStyle={s.content}>
            <Button
              secondary
              label="← Voltar"
              onPress={() => {
                setSelected(null);
                setCompare(null);
              }}
            />
            {selected && (
              <>
                <View
                  style={[s.hero, { borderColor: colors[selected.category] }]}
                >
                  <Text style={s.eyebrow}>
                    {selected.category.toUpperCase()}
                  </Text>
                  <Text
                    style={[s.heroSymbol, { color: colors[selected.category] }]}
                  >
                    {selected.symbol}
                  </Text>
                  <Text style={s.title}>{selected.name}</Text>
                  <Text style={s.subtitle}>
                    Número atômico {selected.number} · {selected.phase}
                  </Text>
                  <Button
                    secondary
                    label={
                      progress.favorites.includes(selected.number)
                        ? "★ Remover dos favoritos"
                        : "☆ Salvar nos favoritos"
                    }
                    onPress={() => favorite(selected)}
                  />
                </View>
                <Text style={s.h2}>Identidade e propriedades</Text>
                {[
                  ["Número atômico / prótons", selected.number],
                  ["Elétrons (átomo neutro)", selected.number],
                  ["Massa atômica (u)", selected.atomic_mass],
                  ["Período", selected.period],
                  [
                    "Grupo",
                    (selected.number >= 57 && selected.number <= 71) ||
                    (selected.number >= 89 && selected.number <= 103)
                      ? "Série f"
                      : selected.group,
                  ],
                  ["Configuração eletrônica", selected.electron_configuration],
                  ["Elétrons por camada", selected.shells.join(" · ")],
                  [
                    "Eletronegatividade (Pauling)",
                    selected.electronegativity_pauling,
                  ],
                  ["Fusão (K)", selected.melt],
                  ["Ebulição (K)", selected.boil],
                  [
                    "Densidade (g/L para gases; g/cm³ demais)",
                    selected.density,
                  ],
                ].map(([label, value]) => (
                  <View key={String(label)} style={s.property}>
                    <Text style={s.small}>{label}</Text>
                    <Text selectable style={s.propertyValue}>
                      {value ?? "Não disponível"}
                    </Text>
                  </View>
                ))}
                <Text style={s.small}>
                  Estado físico: referência da base em condições ambientes.
                  Temperaturas em kelvin; °C = K − 273,15. A massa é um valor
                  representativo; elementos sem isótopos estáveis podem usar o
                  número de massa de um isótopo. Nêutrons dependem do isótopo.
                </Text>
                <View style={s.panel}>
                  <Text style={s.h2}>Conexões com o mundo</Text>
                  <Text style={s.subtitle}>
                    {uses[selected.number] ||
                      `${selected.name} pertence à categoria ${selected.category.toLowerCase()}. Sua posição na tabela ajuda a estudar tendências e comparar propriedades com outros elementos.`}
                  </Text>
                </View>
                <Button
                  secondary
                  label="Comparar com outro elemento"
                  onPress={() => {
                    setSecond(null);
                    setComparing(true);
                    setTab("Tabela");
                    setQuery("");
                    setCategory("Todas");
                    setSelected(null);
                    setCompare(selected);
                  }}
                />
                <Button
                  secondary
                  label="Fonte e informações adicionais ↗"
                  onPress={() => Linking.openURL(selected.source)}
                />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal
        visible={!!compare && !!second && !comparing}
        animationType="slide"
        onRequestClose={() => {
          setCompare(null);
          setSecond(null);
        }}
      >
        <SafeAreaView style={s.safe}>
          <ScrollView contentContainerStyle={s.content}>
            <Button
              secondary
              label="← Voltar à tabela"
              onPress={() => {
                setCompare(null);
                setSecond(null);
              }}
            />
            <Text style={s.title}>Lado a lado.</Text>
            {compare && second && (
              <>
                <View style={s.row}>
                  <View style={s.stat}>
                    <Text
                      style={[
                        s.heroSymbol,
                        { color: colors[compare.category] },
                      ]}
                    >
                      {compare.symbol}
                    </Text>
                    <Text style={s.h2}>{compare.name}</Text>
                  </View>
                  <View style={s.stat}>
                    <Text
                      style={[s.heroSymbol, { color: colors[second.category] }]}
                    >
                      {second.symbol}
                    </Text>
                    <Text style={s.h2}>{second.name}</Text>
                  </View>
                </View>
                {(
                  [
                    "number",
                    "atomic_mass",
                    "category",
                    "period",
                    "phase",
                    "electronegativity_pauling",
                    "melt",
                    "boil",
                  ] as const
                ).map((key, i) => (
                  <View key={key} style={s.property}>
                    <Text style={s.small}>
                      {
                        [
                          "Número atômico",
                          "Massa atômica (u)",
                          "Categoria",
                          "Período",
                          "Estado físico",
                          "Eletronegatividade",
                          "Fusão (K)",
                          "Ebulição (K)",
                        ][i]
                      }
                    </Text>
                    <View style={s.row}>
                      <Text style={[s.propertyValue, { flex: 1 }]}>
                        {compare[key] ?? "Não disponível"}
                      </Text>
                      <Text style={[s.propertyValue, { flex: 1 }]}>
                        {second[key] ?? "Não disponível"}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0c121c" },
  center: { justifyContent: "center", alignItems: "center" },
  auth: {
    padding: 26,
    paddingTop: 48,
    gap: 16,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  brandMark: {
    borderWidth: 1,
    borderColor: "#79dfb5",
    borderRadius: 20,
    padding: 22,
    alignSelf: "flex-start",
    backgroundColor: "#142a28",
  },
  brandSymbol: { fontSize: 50, fontWeight: "800", color: "#79dfb5" },
  logo: {
    fontSize: 48,
    fontWeight: "800",
    color: "#f1f4f9",
    letterSpacing: -2,
  },
  wordmark: {
    fontSize: 26,
    fontWeight: "800",
    color: "#f1f4f9",
    letterSpacing: -1,
  },
  header: {
    paddingHorizontal: 22,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#202a39",
  },
  pill: {
    color: "#79dfb5",
    fontSize: 11,
    fontWeight: "700",
    backgroundColor: "#18352f",
    padding: 9,
    borderRadius: 8,
  },
  content: {
    padding: 22,
    gap: 16,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
  },
  eyebrow: {
    color: "#79dfb5",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
  },
  title: {
    color: "#f1f4f9",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    lineHeight: 39,
  },
  subtitle: { color: "#a6b3c6", fontSize: 15, lineHeight: 23 },
  h2: { fontSize: 20, color: "#edf2fa", fontWeight: "700", marginBottom: 6 },
  body: { fontSize: 16, color: "#e8edf5", lineHeight: 24 },
  small: { fontSize: 12, color: "#8f9eb3", lineHeight: 18 },
  panel: {
    backgroundColor: "#151e2b",
    borderWidth: 1,
    borderColor: "#273244",
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  hero: {
    backgroundColor: "#132a28",
    borderWidth: 1,
    borderColor: "#2a5c4d",
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  heroSymbol: { fontSize: 76, fontWeight: "800", color: "#79dfb5" },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "#79dfb5",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "700", color: "#10251e" },
  secondary: {
    backgroundColor: "#202c3c",
    borderWidth: 1,
    borderColor: "#344258",
  },
  input: {
    backgroundColor: "#0f1825",
    borderWidth: 1,
    borderColor: "#344258",
    borderRadius: 12,
    padding: 16,
    color: "#f1f4f9",
    fontSize: 15,
  },
  link: { color: "#79dfb5", textAlign: "center", padding: 10 },
  notice: { color: "#efcd80", fontSize: 14, lineHeight: 22 },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  stat: {
    flex: 1,
    minWidth: 80,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#151e2b",
    gap: 4,
  },
  statValue: { color: "#edf2fa", fontSize: 25, fontWeight: "700" },
  grid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  element: {
    width: 96,
    height: 114,
    borderRadius: 12,
    borderWidth: 1,
    padding: 7,
    justifyContent: "space-between",
  },
  symbol: { fontSize: 27, fontWeight: "800" },
  elementName: { color: "#e2e8f2", fontSize: 10 },
  mass: { color: "#98a7bd", fontSize: 9 },
  chip: {
    padding: 11,
    borderRadius: 20,
    backgroundColor: "#182232",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#2a374a",
  },
  chipActive: { borderColor: "#79dfb5", backgroundColor: "#17382f" },
  legend: { fontSize: 12, padding: 7 },
  track: {
    height: 5,
    borderRadius: 5,
    backgroundColor: "#253145",
    overflow: "hidden",
  },
  fill: { height: 5, backgroundColor: "#79dfb5" },
  option: {
    borderWidth: 1,
    borderColor: "#344258",
    padding: 17,
    borderRadius: 12,
    backgroundColor: "#101927",
  },
  correct: { borderColor: "#79dfb5", backgroundColor: "#193e31" },
  wrong: { borderColor: "#ee8b90", backgroundColor: "#46282d" },
  history: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#151e2b",
  },
  nav: {
    flexDirection: "row",
    backgroundColor: "#101925",
    borderTopWidth: 1,
    borderColor: "#263244",
    paddingVertical: 9,
  },
  navItem: { flex: 1, alignItems: "center", paddingVertical: 3, gap: 4 },
  navIcon: { fontSize: 22, color: "#7f8da3" },
  navText: { fontSize: 10, color: "#7f8da3" },
  property: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: "#263244",
    gap: 6,
  },
  propertyValue: { color: "#e8edf5", fontSize: 16 },
});
