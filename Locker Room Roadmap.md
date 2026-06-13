# Locker Room — Roadmap
*Game 1 of Pitch IQ · Status: ✅ Live (launched Jun 13, 2026)*

How to use this file: keep **Now** short (3–5 items max). When a new idea appears mid-build, drop it in **Someday** immediately so it's captured — but only pull work from **Now**. Check items off as you ship.

---

## 🔥 Now (this week)
- [ ] Real streak on home card (currently removed — wire to `lockerRoomHistory` storage)
- [ ] Help / rules screen (the "?" button currently does nothing)

## 🔜 Next (this month)
- [ ] Stats screen — total played, win rate, current + best streak, history (data already saved)
- [ ] Skip option for a puzzle
- [ ] Open Graph preview image for shared links (branded, not puzzle spoiler) *(app-wide, helps Locker Room shares)*

## 💡 Someday / Ideas
- [ ] **Leaderboard** — ranking of players (NOTE: requires accounts + a backend/database; currently the app is local-storage only with no accounts. This is a bigger architectural step — would need login + server. Revisit once daily-player numbers justify it.)
- [ ] Custom analytics events — track puzzle completion + share rate (deeper than page views)
- [ ] Unify visual language — photo header vs illustrated card art
- [ ] Difficulty hint or "reveal a letter" mechanic
- [ ] Archive — let players replay past puzzles

---

## App-wide (not Locker Room specific — may move to its own file later)
- [ ] Build The Grid (Game 2) — HTML prototype + 5 verified categories ready
- [ ] Build Transfer Window (Game 3)
- [ ] Build One Season Wonder (Game 5)
- [ ] Native app / App Store submission (deferred — needs Apple Developer acct + Xcode)
- [ ] Cross-device sync / accounts (only if leaderboard or multi-device becomes a priority)

---

## ✅ Shipped
- [x] Core daily game — 83-player dataset, autocomplete, 5 lives, teammate reveals
- [x] Win/loss end screens (green takeover + confetti / muted) with "How They Connect"
- [x] Streak tracking + persistence (AsyncStorage, survives refresh)
- [x] Share Result (spoiler-free text)
- [x] Animations (lives shake, card slide-in)
- [x] Puzzle number ("Day #N") + locked launch sequence (Anelka → Džeko → Cannavaro → Crespo → …)
- [x] Deployed live on Vercel + Web Analytics
- [x] Fixed blank-screen bug (removed font-loading gate in `_layout.tsx`)
- [x] Removed placeholder status bar + fake streak from home screen
