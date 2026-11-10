import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  FeedbackComment,
  mergeComments,
  validateCommentInput,
} from "./src/comments-model";
import { loadComments, saveComment } from "./src/comments";

const NAME_KEY = "elementa:commenter-name";

export default function App() {
  return (
    <SafeAreaProvider>
      <FeedbackForum />
    </SafeAreaProvider>
  );
}

function FeedbackForum() {
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"cloud" | "local" | "offline">("local");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await loadComments();
      setComments(result.comments);
      setMode(result.mode);
      if (result.mode === "offline") {
        setNotice("Sem conexão com o fórum. Mostrando os comentários salvos neste aparelho.");
      }
    } catch {
      setMode("offline");
      setNotice("Não foi possível atualizar. Seus comentários locais continuam salvos.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    AsyncStorage.getItem(NAME_KEY)
      .then((savedName) => {
        if (savedName) setName(savedName);
      })
      .catch(() => undefined);
  }, [refresh]);

  async function submitFeedback() {
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
      await AsyncStorage.setItem(NAME_KEY, checked.value.name).catch(() => undefined);
      setNotice(
        result.mode === "cloud"
          ? "Seu comentário foi publicado no fórum."
          : "Seu comentário foi salvo neste aparelho, mas ainda não foi publicado para outras pessoas.",
      );
    } catch {
      setNotice("Não foi possível salvar o comentário. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const modeDescription =
    mode === "cloud"
      ? "Fórum compartilhado: os comentários podem ser vistos por outras pessoas."
      : mode === "offline"
        ? "Modo sem conexão: esta lista mostra os comentários guardados neste aparelho."
        : "Modo local: configure o Supabase para compartilhar os comentários com outras pessoas.";

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#79dfb5"
              colors={["#79dfb5"]}
            />
          }
        >
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandSymbol}>El</Text>
            </View>
            <View>
              <Text style={styles.wordmark}>elementa.</Text>
              <Text style={styles.eyebrow}>COMUNIDADE</Text>
            </View>
          </View>

          <Text style={styles.title}>Fórum de comentários</Text>
          <Text style={styles.subtitle}>
            Compartilhe uma ideia, sugestão ou opinião. Seu nome e feedback são necessários para publicar.
          </Text>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Deixe seu feedback</Text>
            <Text style={styles.privacyNote}>
              Seu nome e comentário poderão ser vistos por outras pessoas no fórum.
            </Text>

            <Text style={styles.label}>Seu nome</Text>
            <TextInput
              accessibilityLabel="Seu nome"
              style={styles.input}
              placeholder="Como podemos chamar você?"
              placeholderTextColor="#7f8da1"
              value={name}
              onChangeText={setName}
              maxLength={60}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
            />
            <Text style={styles.counter}>{name.length}/60</Text>

            <Text style={styles.label}>Seu feedback</Text>
            <TextInput
              accessibilityLabel="Seu feedback"
              style={[styles.input, styles.feedbackInput]}
              placeholder="Escreva seu comentário…"
              placeholderTextColor="#7f8da1"
              value={feedback}
              onChangeText={setFeedback}
              maxLength={1000}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{feedback.length}/1000</Text>

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={submitFeedback}
              style={[styles.submitButton, submitting && styles.disabledButton]}
            >
              {submitting ? (
                <ActivityIndicator color="#0b1712" />
              ) : (
                <Text style={styles.submitText}>Enviar comentário</Text>
              )}
            </Pressable>
            {!!notice && (
              <Text accessibilityRole="alert" style={styles.notice}>
                {notice}
              </Text>
            )}
          </View>

          <View style={styles.commentsHeading}>
            <View>
              <Text style={styles.panelTitle}>Comentários</Text>
              <Text style={styles.small}>{comments.length} exibidos</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Atualizar comentários"
              onPress={refresh}
              style={styles.refreshButton}
            >
              <Text style={styles.refreshText}>Atualizar</Text>
            </Pressable>
          </View>
          <Text style={styles.modeDescription}>{modeDescription}</Text>

          {loading && comments.length === 0 ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#79dfb5" />
              <Text style={styles.small}>Carregando comentários…</Text>
            </View>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentMeta}>
                  <Text style={styles.commentName}>{comment.name}</Text>
                  <Text style={styles.commentDate}>
                    {new Date(comment.created_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </Text>
                </View>
                <Text selectable style={styles.commentBody}>
                  {comment.feedback}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Ainda não há comentários</Text>
              <Text style={styles.small}>
                Seja a primeira pessoa a compartilhar um feedback.
              </Text>
            </View>
          )}
          <Text style={styles.footer}>Elementa · Fórum da comunidade</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#0b1018" },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 44,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 26 },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#19342b",
    borderWidth: 1,
    borderColor: "#3d8269",
  },
  brandSymbol: { color: "#79dfb5", fontSize: 20, fontWeight: "800" },
  wordmark: { color: "#f2f5fa", fontSize: 20, fontWeight: "800", letterSpacing: 0.5 },
  eyebrow: { color: "#79dfb5", fontSize: 10, fontWeight: "700", letterSpacing: 1.7, marginTop: 2 },
  title: { color: "#f2f5fa", fontSize: 30, lineHeight: 37, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: "#a7b2c5", fontSize: 15, lineHeight: 23, marginBottom: 22 },
  panel: {
    padding: 18,
    marginBottom: 26,
    backgroundColor: "#121a25",
    borderWidth: 1,
    borderColor: "#273444",
    borderRadius: 18,
  },
  panelTitle: { color: "#f2f5fa", fontSize: 18, fontWeight: "700" },
  privacyNote: { color: "#a7b2c5", fontSize: 13, lineHeight: 19, marginTop: 7, marginBottom: 5 },
  label: { color: "#dce4ef", fontSize: 14, fontWeight: "600", marginTop: 15, marginBottom: 7 },
  input: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#344354",
    backgroundColor: "#0b1018",
    color: "#f2f5fa",
    fontSize: 15,
  },
  feedbackInput: { minHeight: 130, paddingTop: 12 },
  counter: { alignSelf: "flex-end", color: "#7f8da1", fontSize: 11, marginTop: 5 },
  submitButton: {
    minHeight: 50,
    borderRadius: 11,
    marginTop: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#79dfb5",
  },
  disabledButton: { opacity: 0.65 },
  submitText: { color: "#0b1712", fontSize: 15, fontWeight: "800" },
  notice: { color: "#b8e9d3", fontSize: 13, lineHeight: 19, marginTop: 12 },
  commentsHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  small: { color: "#8997ab", fontSize: 12, lineHeight: 18, marginTop: 4 },
  refreshButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: "#344354" },
  refreshText: { color: "#79dfb5", fontWeight: "700", fontSize: 13 },
  modeDescription: { color: "#8492a6", fontSize: 12, lineHeight: 18, marginBottom: 14 },
  loading: { minHeight: 96, justifyContent: "center", alignItems: "center", gap: 8 },
  commentCard: { padding: 16, borderRadius: 15, borderWidth: 1, borderColor: "#273444", backgroundColor: "#121a25", marginBottom: 10 },
  commentMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 9 },
  commentName: { color: "#79dfb5", fontSize: 14, fontWeight: "700", flexShrink: 1 },
  commentDate: { color: "#7f8da1", fontSize: 11 },
  commentBody: { color: "#e1e7ef", fontSize: 14, lineHeight: 21 },
  emptyState: { paddingVertical: 24, paddingHorizontal: 16, borderWidth: 1, borderStyle: "dashed", borderColor: "#344354", borderRadius: 14, alignItems: "center" },
  emptyTitle: { color: "#e1e7ef", fontSize: 15, fontWeight: "700" },
  footer: { color: "#5f6d80", textAlign: "center", fontSize: 11, marginTop: 30 },
});
