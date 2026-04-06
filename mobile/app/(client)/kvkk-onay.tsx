import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import api from "@/core/api/client";
import { useAuthStore } from "@/features/auth/stores/auth-store";
import {
  KVKK_PORTAL_CONSENT_VERSION,
  KVKK_INFO_URL,
  KVKK_SUMMARY,
} from "@/core/config/kvkk-consent";

export default function KvkkOnayScreen() {
  const router = useRouter();
  const syncUser = useAuthStore((s) => s.syncUser);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!accepted) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/api/client/consent/kvkk", {
        consentVersion: KVKK_PORTAL_CONSENT_VERSION,
        channel: "mobile",
      });
      await syncUser();
      router.replace("/(client)");
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Onay kaydedilemedi. Tekrar deneyin.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>KVKK ve açık rıza</Text>
      <Text style={styles.sub}>
        Uygulamayı kullanmaya devam etmek için onaylamanız gerekir.
      </Text>

      {KVKK_SUMMARY.map((p, i) => (
        <Text key={i} style={styles.p}>
          {p}
        </Text>
      ))}

      <Pressable onPress={() => Linking.openURL(KVKK_INFO_URL)}>
        <Text style={styles.link}>Aydınlatma metni (KVKK) — web sitesi</Text>
      </Pressable>

      <Pressable
        style={styles.checkRow}
        onPress={() => setAccepted(!accepted)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
      >
        <View style={[styles.box, accepted && styles.boxOn]} />
        <Text style={styles.checkLabel}>
          Aydınlatma metnini okudum; sağlık ve beslenme verilerimin danışmanlık
          kapsamında işlenmesine açık rıza veriyorum. Sürüm:{" "}
          {KVKK_PORTAL_CONSENT_VERSION}
        </Text>
      </Pressable>

      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Pressable
        style={[styles.btn, (!accepted || submitting) && styles.btnDisabled]}
        onPress={submit}
        disabled={!accepted || submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Onaylıyorum ve devam ediyorum</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 56,
    backgroundColor: "#f0f4ff",
    flexGrow: 1,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#1e3a5f", marginBottom: 8 },
  sub: { fontSize: 14, color: "#64748b", marginBottom: 16 },
  p: { fontSize: 14, color: "#334155", marginBottom: 12, lineHeight: 20 },
  link: {
    fontSize: 14,
    color: "#2563eb",
    textDecorationLine: "underline",
    marginBottom: 20,
  },
  checkRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  box: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: "#94a3b8",
    marginRight: 12,
    marginTop: 2,
    borderRadius: 4,
  },
  boxOn: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  checkLabel: { flex: 1, fontSize: 14, color: "#334155", lineHeight: 20 },
  err: { color: "#b91c1c", marginBottom: 12, fontSize: 13 },
  btn: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
