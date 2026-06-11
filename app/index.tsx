import { useRouter } from "expo-router";
import { Dimensions, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Circle, Path, Rect, Svg, Text as SvgText } from "react-native-svg";

const { width } = Dimensions.get("window");

export default function Index() {
  const router = useRouter();
  return (
    <View style={styles.shell}>
      <View style={styles.scroll}>
        {/* Stadium header image */}
        <ImageBackground
          source={require("../assets/images/stadium-header.png")}
          style={styles.headerImg}
          resizeMode="cover"
        >
          <View style={styles.headerOverlay} />
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>9:41</Text>
            <Text style={styles.statusText}>5G ▪▪▪</Text>
          </View>
          <View style={styles.header}>
            <Text style={styles.wordmark}>Pitch <Text style={[styles.wordmark, styles.wordmarkAccent]}>IQ</Text></Text>
            <Text style={styles.tagline}>Daily Football Puzzles</Text>
          </View>
        </ImageBackground>

        {/* Cards panel */}
        <View style={styles.cardsSection}>
          <Text style={styles.sectionLabel}>Now Playing</Text>

          {/* Locker Room */}
          <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => router.push("/locker-room")}>
            <View style={[styles.cardArt, { backgroundColor: "#1E4D24" }]}>
              <Svg width={110} height={124} viewBox="0 0 110 124">
                <Rect width="110" height="118" fill="#1E4D24" />
                <Circle cx="55" cy="118" r="65" stroke="rgba(255,255,255,0.07)" strokeWidth="1.2" fill="none" />
                <Rect x="8" y="16" width="22" height="82" rx="2" fill="#16391A" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
                <Rect x="44" y="10" width="22" height="90" rx="2" fill="#2D6A32" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                <Path d="M48 31 L50 26 L55 30 L60 26 L62 31 L61 58 L49 58 Z" fill="rgba(255,255,255,0.8)" />
                <Rect x="51" y="58" width="8" height="11" rx="1" fill="rgba(255,255,255,0.6)" />
                <SvgText x="55" y="48" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1E4D24">10</SvgText>
                <Rect x="80" y="16" width="22" height="82" rx="2" fill="#16391A" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
              </Svg>
            </View>
            <View style={styles.cardBody}>
              <View>
                <View style={[styles.badge, styles.badgeDaily]}>
                  <Text style={styles.badgeDailyText}>Daily</Text>
                </View>
                <Text style={styles.cardName}>Locker Room</Text>
                <Text style={styles.cardDesc}>Guess the footballer from their club teammates.</Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardStat}>🔥 7 day streak</Text>
                <View style={styles.playBtnGreen}>
                  <Text style={styles.playArrow}>→</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* The Grid */}
          <TouchableOpacity style={styles.card} activeOpacity={0.85}>
            <View style={[styles.cardArt, { backgroundColor: "#5C4F36" }]}>
              <Svg width={110} height={124} viewBox="0 0 110 124">
                <Rect width="110" height="118" fill="#5C4F36" />
                <Rect x="14" y="22" width="22" height="20" rx="3" fill="rgba(255,255,255,0.1)" />
                <Rect x="44" y="22" width="22" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                <Rect x="74" y="22" width="22" height="20" rx="3" fill="rgba(255,255,255,0.1)" />
                <Rect x="14" y="49" width="22" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                <Rect x="44" y="49" width="22" height="20" rx="3" fill="rgba(255,255,255,0.32)" />
                <Rect x="74" y="49" width="22" height="20" rx="3" fill="rgba(255,255,255,0.1)" />
                <Rect x="14" y="76" width="22" height="20" rx="3" fill="rgba(255,255,255,0.1)" />
                <Rect x="44" y="76" width="22" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
                <Rect x="74" y="76" width="22" height="20" rx="3" fill="rgba(255,255,255,0.1)" />
              </Svg>
            </View>
            <View style={styles.cardBody}>
              <View>
                <View style={[styles.badge, styles.badgeSoon]}>
                  <Text style={styles.badgeSoonText}>Launching Soon</Text>
                </View>
                <Text style={[styles.cardName, styles.cardNameMuted]}>The Grid</Text>
                <Text style={styles.cardDesc}>25 players, one category. Find them all.</Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardStatMuted}>Coming soon</Text>
                <View style={styles.playBtnMuted}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* More games */}
          <Text style={styles.comingLabel}>More Games</Text>
          <View style={styles.comingRow}>
            <View style={styles.comingPill}>
              <View style={styles.comingIcon}><Text>⚡</Text></View>
              <View>
                <Text style={styles.comingName}>Transfer Window</Text>
                <Text style={styles.comingSub}>Coming soon</Text>
              </View>
            </View>
            <View style={styles.comingPill}>
              <View style={styles.comingIcon}><Text>📊</Text></View>
              <View>
                <Text style={styles.comingName}>One Season</Text>
                <Text style={styles.comingSub}>Coming soon</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 0 }} />
        </View>
      </View>

      {/* Bottom nav */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIconActive}>⊞</Text>
          <Text style={styles.navLabelActive}>Games</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🏆</Text>
          <Text style={styles.navLabel}>Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, height: "100%", backgroundColor: "#F2EBD9" },
  scroll: { flex: 1, marginBottom: 68, justifyContent: "flex-start" },
  headerImg: { width: "100%", height: 232, justifyContent: "flex-start" },
  headerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(242,235,217,0.45)" },
  statusBar: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 16 },
  statusText: { fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: "500" },
  header: { alignItems: "center", paddingTop: 16 },
  wordmark: { fontFamily: "BebasNeue", fontSize: 52, color: "#fff", letterSpacing: 2, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 10 },
  wordmarkAccent: { color: "#4ade80" },
  tagline: { fontSize: 10, color: "rgba(255,255,255,0.85)", letterSpacing: 1.5, textTransform: "uppercase", fontWeight: "600", marginTop: 8, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 4 },
  cardsSection: { backgroundColor: "#F2EBD9", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 24, marginTop: -28 },
  sectionLabel: { fontSize: 10, color: "#9C8E6E", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "700", marginBottom: 16, paddingLeft: 8 },
  card: { borderRadius: 16, overflow: "hidden", flexDirection: "row", minHeight: 132, borderWidth: 1, borderColor: "rgba(0,0,0,0.07)", marginBottom: 16 },
  cardArt: { width: 112, alignSelf: "stretch" },
  cardBody: { flex: 1, padding: 16, justifyContent: "space-between", backgroundColor: "#fff" },
  badge: { borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 8 },
  badgeDaily: { backgroundColor: "#DCEFD8" },
  badgeDailyText: { fontSize: 9, fontWeight: "700", color: "#1E5E24", letterSpacing: 1, textTransform: "uppercase" },
  badgeSoon: { backgroundColor: "#EDE8DD" },
  badgeSoonText: { fontSize: 9, fontWeight: "700", color: "#8A7A58", letterSpacing: 1, textTransform: "uppercase" },
  cardName: { fontFamily: "PlayfairDisplay", fontSize: 17, color: "#1A1208", marginBottom: 4 },
  cardNameMuted: { color: "#B0A48A" },
  cardDesc: { fontSize: 11, color: "#8A7A58", lineHeight: 16 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardStat: { fontSize: 10, fontWeight: "600", color: "#2D6A32" },
  cardStatMuted: { fontSize: 10, fontWeight: "600", color: "#C4B89A" },
  playBtnGreen: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#2D6A32", alignItems: "center", justifyContent: "center" },
  playArrow: { color: "#fff", fontSize: 16 },
  playBtnMuted: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#EDE8DD", alignItems: "center", justifyContent: "center" },
  lockIcon: { fontSize: 13 },
  comingLabel: { fontSize: 10, color: "#9C8E6E", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "700", marginTop: 8, marginBottom: 16, paddingLeft: 8 },
  comingRow: { flexDirection: "row", gap: 8 },
  comingPill: { flex: 1, backgroundColor: "#eee8da", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", flexDirection: "row", alignItems: "center", gap: 8 },
  comingIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#ddd6c8" },
  comingName: { fontFamily: "PlayfairDisplay", fontSize: 11, color: "#B0A48A" },
  comingSub: { fontSize: 9, color: "#C4B89A", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: "600", marginTop: 2 },
  nav: { position: "absolute", bottom: 0, left: 0, right: 0, height: 68, backgroundColor: "#F2EBD9", borderTopWidth: 1, borderTopColor: "#D9CEB5", flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingBottom: 8 },
  navItem: { alignItems: "center", gap: 4 },
  navIcon: { fontSize: 18, opacity: 0.3 },
  navIconActive: { fontSize: 18, color: "#2D6A32" },
  navLabel: { fontSize: 9, color: "#C4B89A", fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  navLabelActive: { fontSize: 9, color: "#2D6A32", fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
});