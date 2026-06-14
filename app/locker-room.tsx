import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Animated, Dimensions, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Circle, Line, Rect, Svg } from "react-native-svg";
import dataset from "./data/teammates.json";

const STORAGE_KEY = "lockerRoomHistory";
const { width } = Dimensions.get("window");

// --- date helpers ---
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dateKeyFor(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDailyIndex() {
  const launch = new Date(2026, 5, 13).getTime(); // June 13, 2026 = Day #1
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const daysSinceLaunch = Math.floor((todayMid - launch) / 86400000);
  return ((daysSinceLaunch % dataset.length) + dataset.length) % dataset.length;
}

function getPuzzleNumber() {
  const launch = new Date(2026, 5, 13).getTime(); // June 13, 2026 = Day 1 (month is 0-indexed)
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.floor((todayMid - launch) / 86400000) + 1;
}

function buildNamePool() {
  const names = new Set<string>();
  dataset.forEach((p: any) => {
    names.add(p.name);
    p.teammates.forEach((t: any) => names.add(t.name));
  });
  return Array.from(names).sort();
}

const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

function TeammateCard({ tm, index, isRevealed, styles }: any) {
  const anim = useState(new Animated.Value(isRevealed ? 1 : 0))[0];

  useEffect(() => {
    if (isRevealed) {
      Animated.timing(anim, { toValue: 1, duration: 350, useNativeDriver: false }).start();
    }
  }, [isRevealed]);

  const unlockAt = index === 3 ? 2 : 4;

  return (
    <Animated.View
      style={[
        styles.tmCard,
        !isRevealed && styles.tmCardLocked,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
      ]}
    >
      <View style={[styles.tmNum, !isRevealed && styles.tmNumLocked]}>
        <Text style={[styles.tmNumText, !isRevealed && styles.tmNumTextLocked]}>{index + 1}</Text>
      </View>
      {isRevealed ? (
        <Text style={styles.tmName}>{tm.name}</Text>
      ) : (
        <Text style={styles.tmLockedText}>Unlocks after {unlockAt} wrong guesses</Text>
      )}
    </Animated.View>
  );
}

// streak = consecutive days (ending today) that exist in history
function computeStreak(history: Record<string, boolean>) {
  let streak = 0;
  for (let i = 0; i < 3650; i++) {
    if (history[dateKeyFor(i)] !== undefined) streak++;
    else break;
  }
  return streak;
}

export default function LockerRoom() {
  const router = useRouter();

  const puzzle = useMemo(() => dataset[getDailyIndex()], []);
  const namePool = useMemo(() => buildNamePool(), []);
  const answer = puzzle.name;
  const dayNumber = getPuzzleNumber();

  function buildShareText(won: boolean, guessesUsed: number) {
    const balls = "⚽".repeat(guessesUsed) + "⚪".repeat(LIVES_TOTAL - guessesUsed);
    const resultLine = won ? `${balls} Solved in ${guessesUsed} · 🔥 ${streak}` : `${balls} ❌ Out of lives`;
    return `⚽ Pitch IQ · Locker Room #${dayNumber}\n${resultLine}\nCan you guess today's footballer?\npitchiq.games`;
  }

  async function handleShare() {
    const guessesUsed = wrongGuesses.length + (status === "won" ? 1 : 0);
    const text = buildShareText(status === "won", status === "won" ? wrongGuesses.length + 1 : LIVES_TOTAL);
    try {
      if (navigator?.share) {
        await navigator.share({ text });
      } else if (navigator?.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  }

  const [query, setQuery] = useState("");
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [totalGuesses, setTotalGuesses] = useState(0);
  const [status, setStatus] = useState<"loading" | "playing" | "won" | "lost">("loading");
  const [history, setHistory] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const shakeX = useState(new Animated.Value(0))[0];

  function triggerShake() {
    Animated.sequence([
      Animated.timing(shakeX, { toValue: -6, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: 6, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: -4, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: 4, duration: 50, useNativeDriver: false }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: false }),
    ]).start();
  }

  const LIVES_TOTAL = 5;
  const livesUsed = wrongGuesses.length;
  const livesLeft = LIVES_TOTAL - livesUsed;
  const revealedCount = 3 + (livesUsed >= 2 ? 1 : 0) + (livesUsed >= 4 ? 1 : 0);

  // Load history on mount; if today already played, show finished state
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const hist: Record<string, boolean> = raw ? JSON.parse(raw) : {};
        setHistory(hist);
        const todayResult = hist[todayKey()];
        if (todayResult === true) setStatus("won");
        else if (todayResult === false) setStatus("lost");
        else setStatus("playing");
      } catch {
        setStatus("playing");
      }
    })();
  }, []);

  async function recordResult(won: boolean) {
    const hist = { ...history, [todayKey()]: won };
    setHistory(hist);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(hist)); } catch {}
  }

  const suggestions = useMemo(() => {
    const q = norm(query);
    if (!q) return [];
    return namePool.filter((n) => norm(n).includes(q)).slice(0, 4);
  }, [query, namePool]);

  function submitGuess(name: string) {
    if (status !== "playing") return;
    const g = norm(name);
    if (!g) return;
    const newTotal = totalGuesses + 1;
    setTotalGuesses(newTotal);
    if (g === norm(answer)) {
      setStatus("won");
      recordResult(true);
      setQuery("");
      return;
    }
    if (!wrongGuesses.some((w) => norm(w) === g)) {
      const next = [...wrongGuesses, name];
      setWrongGuesses(next);
      triggerShake()
      if (next.length >= LIVES_TOTAL) {
        setStatus("lost");
        recordResult(false);
      }
    }
    setQuery("");
  }

  const streak = computeStreak(history);

  if (status === "loading") {
    return <View style={styles.shell} />;
  }

  return (
    <View style={styles.shell}>
      <View style={styles.topbar}>
        <Svg style={styles.topbarMotif} width={90} height={90} viewBox="0 0 90 90">
          <Rect x={12} y={16} width={18} height={58} rx={2} fill="#fff" opacity={0.06} />
          <Rect x={36} y={9} width={18} height={65} rx={2} fill="#fff" opacity={0.06} />
          <Rect x={60} y={16} width={18} height={58} rx={2} fill="#fff" opacity={0.06} />
        </Svg>
        <View style={styles.topbarRow}>
          <TouchableOpacity onPress={() => router.replace("/")}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>LOCKER <Text style={styles.titleAccent}>ROOM</Text></Text>
          <TouchableOpacity>
            <Text style={styles.help}>?</Text>
          </TouchableOpacity>
        </View>
        <Animated.View style={[styles.livesRow, { transform: [{ translateX: shakeX }] }]}>
          {Array.from({ length: LIVES_TOTAL }).map((_, i) => (
            <Text key={i} style={[styles.ball, i >= livesLeft && styles.ballUsed]}>⚽</Text>
          ))}
        </Animated.View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {status === "playing" && (
          <>
            <Svg style={styles.pitchTexture} width={width} height={400} viewBox={`0 0 ${width} 400`} pointerEvents="none">
              <Circle cx={width / 2} cy={110} r={70} stroke="#1E4D24" strokeWidth="1" strokeOpacity={0.05} fill="none" />
              <Circle cx={width / 2} cy={110} r={3} fill="#1E4D24" fillOpacity={0.05} />
              <Line x1={width / 2} y1={0} x2={width / 2} y2={400} stroke="#1E4D24" strokeWidth="1" strokeOpacity={0.04} />
              <Rect x={width / 2 - 90} y={0} width={180} height={50} stroke="#1E4D24" strokeWidth="1" strokeOpacity={0.04} fill="none" />
            </Svg>

            <View style={styles.prompt}>
              <Text style={styles.promptLabel}>Day #{dayNumber} · Who is the mystery player?</Text>
              <Text style={styles.promptText}>These players were all club teammates of one footballer.</Text>
            </View>

            <Text style={styles.tmLabel}>Teammates Revealed</Text>
            {puzzle.teammates.map((tm: any, i: number) => (
              <TeammateCard key={i} tm={tm} index={i} isRevealed={i < revealedCount} styles={styles} />
            ))}

            {wrongGuesses.length > 0 && (
              <View style={styles.guessPills}>
                {wrongGuesses.map((g) => (
                  <View key={g} style={styles.guessPill}>
                    <Text style={styles.guessPillText}>✕ {g}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={{ height: 160 }} />
          </>
        )}

        {status !== "playing" && (
          <View style={[styles.endScreen, status === "won" ? styles.endScreenWin : styles.endScreenLoss]}>
            {/* Pitch texture */}
            <Svg style={styles.endTexture} width={width} height={420} viewBox={`0 0 ${width} 420`}>
              <Circle cx={width / 2} cy={140} r={90} stroke="#fff" strokeWidth="1" strokeOpacity={status === "won" ? 0.06 : 0.04} fill="none" />
              <Line x1={0} y1={140} x2={width} y2={140} stroke="#fff" strokeWidth="1" strokeOpacity={status === "won" ? 0.05 : 0.04} />
              <Line x1={width / 2} y1={0} x2={width / 2} y2={420} stroke="#fff" strokeWidth="1" strokeOpacity={status === "won" ? 0.04 : 0.03} />
            </Svg>

            {/* Confetti (win only) */}
            {status === "won" && (
              <View style={styles.confettiLayer} pointerEvents="none">
                <View style={[styles.confetti, { left: 38, top: 18, backgroundColor: "#4ade80", transform: [{ rotate: "20deg" }] }]} />
                <View style={[styles.confetti, { right: 40, top: 28, backgroundColor: "#fbbf24", transform: [{ rotate: "-15deg" }] }]} />
                <View style={[styles.confetti, { left: 70, top: 58, backgroundColor: "#fff", transform: [{ rotate: "40deg" }] }]} />
                <View style={[styles.confetti, { right: 64, top: 70, backgroundColor: "#4ade80", transform: [{ rotate: "10deg" }] }]} />
                <View style={[styles.confetti, { left: 30, top: 96, backgroundColor: "#fbbf24", transform: [{ rotate: "-30deg" }] }]} />
              </View>
            )}

            <Text style={[styles.endBadge, status === "won" ? styles.endBadgeWin : styles.endBadgeLoss]}>
              {status === "won" ? "✓ Correct" : "✕ Out of lives"}
            </Text>
            <Text style={styles.endAnswerBig}>{answer}</Text>
            <Text style={styles.endSubLabel}>
              {status === "won" ? `Solved in ${totalGuesses} ${totalGuesses === 1 ? "guess" : "guesses"}` : "The mystery player revealed"}
            </Text>

            {/* Streak card */}
            <View style={styles.streakCard}>
              <Text style={styles.streakCardNum}>🔥 {streak}</Text>
              <Text style={styles.streakCardLabel}>Day Streak</Text>
            </View>

            {/* History row */}
            <View style={styles.historyRow}>
              {[6, 5, 4, 3, 2, 1, 0].map((offset) => {
                const result = history[dateKeyFor(offset)];
                return (
                  <Text key={offset} style={styles.histMark}>
                    {result === true ? "✅" : result === false ? "❌" : "·"}
                  </Text>
                );
              })}
            </View>

            {/* Share + Home */}
            <TouchableOpacity style={[styles.shareBtnNew, status === "won" ? styles.shareBtnWin : styles.shareBtnLoss]} onPress={handleShare}>
              <Text style={[styles.shareBtnTextNew, status === "won" ? styles.shareBtnTextWin : styles.shareBtnTextLoss]}>
                {copied ? "Copied! ✓" : "Share Result"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace("/")}>
              <Text style={styles.homeBtnNew}>Back to Games</Text>
            </TouchableOpacity>

            {/* How they connect — below the fold */}
            <Text style={styles.connectLabel}>How They Connect</Text>
            {puzzle.teammates.map((tm: any, i: number) => (
              <View key={i} style={styles.connectCardNew}>
                <Text style={styles.connectNameNew}>{tm.name}</Text>
                <Text style={styles.connectMetaNew}>{tm.club} · {tm.years}</Text>
              </View>
            ))}
            <View style={{ height: 40 }} />
          </View>
        )}
      </ScrollView>

      {status === "playing" && (
        <View style={styles.inputZone}>
          {suggestions.length > 0 && (
            <View style={styles.suggestions}>
              {suggestions.map((s) => (
                <Pressable key={s} style={styles.suggestionRow} onPress={() => submitGuess(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="Type a player's name…"
              placeholderTextColor="#b0a486"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => submitGuess(query)}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.submitBtn} onPress={() => submitGuess(query)}>
              <Text style={styles.submitArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#F2EBD9" },
  topbar: { backgroundColor: "#1E4D24", paddingTop: 48, paddingBottom: 16, paddingHorizontal: 24, overflow: "hidden" },
  topbarMotif: { position: "absolute", right: -8, top: -6 },
  topbarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { color: "rgba(255,255,255,0.9)", fontSize: 22 },
  title: { fontFamily: "BebasNeue", fontSize: 26, color: "#fff", letterSpacing: 1.5 },
  titleAccent: { color: "#4ade80" },
  help: { color: "rgba(255,255,255,0.7)", fontSize: 18 },
  livesRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16 },
  ball: { fontSize: 20 },
  ballUsed: { opacity: 0.25 },
  body: { flex: 1 },
  pitchTexture: { position: "absolute", top: 0, left: 0 },
  prompt: { alignItems: "center", paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  promptLabel: { fontSize: 11, color: "#9C8E6E", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "700", marginBottom: 8 },
  promptText: { fontFamily: "PlayfairDisplay", fontSize: 15, color: "#1A1208", lineHeight: 22, textAlign: "center" },
  tmLabel: { fontSize: 10, color: "#9C8E6E", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "700", marginTop: 24, marginBottom: 16, paddingHorizontal: 24 },
  tmCard: { backgroundColor: "#fff", borderRadius: 16, padding: 11, marginBottom: 8, marginHorizontal: 24, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", shadowColor: "#1E4D24", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  tmCardLocked: { backgroundColor: "#ece5d6", borderStyle: "dashed", borderColor: "#d5cab2", shadowOpacity: 0 },
  tmNum: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#1E4D24", alignItems: "center", justifyContent: "center" },
  tmNumLocked: { backgroundColor: "#d5cab2" },
  tmNumText: { fontFamily: "BebasNeue", fontSize: 16, color: "#fff" },
  tmNumTextLocked: { color: "#a89a78" },
  tmName: { fontSize: 13, fontWeight: "600", color: "#1A1208" },
  tmLockedText: { fontSize: 13, color: "#b0a486", fontStyle: "italic" },
  guessPills: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 24, marginTop: 16, marginBottom: 8 },
  guessPill: { backgroundColor: "#f0d9d4", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#e8c4bc"},
  guessPillText: { color: "#a3402f", fontSize: 13, fontWeight: "700" },
  endScreen: { flex: 1, alignItems: "center", paddingHorizontal: 24, paddingTop: 48, minHeight: 600 },
  endScreenWin: { backgroundColor: "#1E4D24" },
  endScreenLoss: { backgroundColor: "#2b2a26" },
  endTexture: { position: "absolute", top: 0, left: 0 },
  confettiLayer: { position: "absolute", top: 40, left: 0, right: 0, height: 120 },
  confetti: { position: "absolute", width: 8, height: 8, borderRadius: 1 },
  endBadge: { fontSize: 11, textTransform: "uppercase", letterSpacing: 2, fontWeight: "700", marginBottom: 8 },
  endBadgeWin: { color: "#4ade80" },
  endBadgeLoss: { color: "#b0a486" },
  endAnswerBig: { fontFamily: "BebasNeue", fontSize: 48, color: "#fff", letterSpacing: 1, lineHeight: 50, textAlign: "center", marginBottom: 8 },
  endSubLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 2, fontWeight: "700", color: "rgba(255,255,255,0.5)", marginBottom: 24 },
  streakCard: { backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24, alignItems: "center", marginBottom: 8 },
  streakCardNum: { fontFamily: "BebasNeue", fontSize: 34, color: "#fff", lineHeight: 36 },
  streakCardLabel: { fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "700", marginTop: 4 },
  historyRow: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 24 },
  histMark: { fontSize: 14 },
  shareBtnNew: { borderRadius: 16, paddingVertical: 16, width: "100%", alignItems: "center" },
  shareBtnWin: { backgroundColor: "#4ade80" },
  shareBtnLoss: { backgroundColor: "#6b6456" },
  shareBtnTextNew: { fontSize: 14, fontWeight: "700" },
  shareBtnTextWin: { color: "#0d2410" },
  shareBtnTextLoss: { color: "#f2ebd9" },
  homeBtnNew: { color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: "600", marginTop: 16 },
  connectLabel: { fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 2, fontWeight: "700", marginTop: 32, marginBottom: 16 },
  connectCardNew: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, marginBottom: 8, width: "100%" },
  connectNameNew: { fontSize: 13, fontWeight: "600", color: "#fff" },
  connectMetaNew: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  inputZone: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#F2EBD9", borderTopWidth: 1, borderTopColor: "#D9CEB5", paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
  suggestions: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#D9CEB5", marginBottom: 8, overflow: "hidden" },
  suggestionRow: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#f0ebdd" },
  suggestionText: { fontSize: 14, color: "#1A1208", fontWeight: "500" },
  inputBox: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#D9CEB5", borderRadius: 16, padding: 8, paddingLeft: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  input: { flex: 1, fontSize: 14, color: "#1A1208", paddingVertical: 8 },
  submitBtn: { backgroundColor: "#2D6A32", width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  submitArrow: { color: "#fff", fontSize: 16 },
});