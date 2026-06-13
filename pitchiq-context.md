# Pitch IQ — Project Context
*Last updated: Launch day — puzzle order locked, analytics live*

## Overview
Football trivia web app, 5 games. Expo/React Native → static web export. Web-first, no App Store.
- **Live:** `pitchiq-gamma-hazel.vercel.app`
- **GitHub:** `github.com/thirddash139/pitchiq`
- **Deploy:** `cd ~/pitchiq && git add . && git commit -m "msg" && git push` → Vercel auto-rebuilds ~2min
- **Project root:** `~/pitchiq` | **Preview:** `npx expo start --web`
- **LAUNCHED:** June 13, 2026 = Day #1

## The 5 Games
1. **Locker Room** ✅ Live — daily, guess footballer from club teammates
2. **The Grid** 🔜 Next — weekly, 25 players one category (HTML prototype + 5 categories ready in separate chat)
3. **Transfer Window** 🔜 — guess from career clubs
4. **What Year?** 🚫 Parked
5. **One Season Wonder** 🔜 — guess from one season's stats

## Tech Stack
Expo / React Native, `expo-router`. Packages: `react-native-svg`, `@react-native-async-storage/async-storage`, `expo-font`, `@vercel/analytics`. Hosting: Vercel (GitHub auto-deploy).

## File Structure
```
~/pitchiq/
├── app/
│   ├── _layout.tsx       # Font loading + <Analytics/>
│   ├── fonts.css         # @font-face + html/body overflow:hidden
│   ├── index.tsx         # Home screen
│   ├── locker-room.tsx   # Game 1
│   └── data/teammates.json   # Dataset (83 players, evolving)
├── assets/fonts/ (BebasNeue-Regular.ttf, PlayfairDisplay-Bold.ttf)
├── assets/images/stadium-header.png
└── vercel.json           # ROOT — fixes route 404 on refresh
```

## Dataset (`app/data/teammates.json`)
- **83 players**, evolving (was reduced from 106 — removed 21 high-risk entries that couldn't guarantee unique first-3-clue answers)
- Each: 5 verified teammates with name/club/years. No two answers share 3+ teammates.
- **File order = play order.** Day #1 = first entry (Anelka), steps down the file daily.
- **RULE: when adding players, APPEND to END** so existing order/sequence stays intact.
- **Launch sequence (locked):** Anelka(#1), Džeko(#2), Cannavaro(#3), Crespo(#4), Messi(#5), Ronaldo(#6), Zidane(#7)...
- **To update:** get new JSON from Game 1 chat → `cp ~/Downloads/teammates.json ~/pitchiq/app/data/teammates.json` → commit/push

## Design System
- Cream bg `#F2EBD9` | green `#1E4D24`/`#2D6A32` | bright green `#4ade80` (win only) | tan `#9C8E6E`/`#B0A48A` | loss bg `#2b2a26`
- **Type (3-level):** Bebas Neue (wordmark/titles/answer/streak), Playfair Display (card titles/prompt), system sans (body)
- **8-point spacing** (multiples of 4/8/16/24/32/48)

## CRITICAL: Font loading on Expo web
`@expo-google-fonts` fails silently on web. Need BOTH: (1) `useFonts` in `_layout.tsx` for native, (2) `@font-face` in `app/fonts.css` + `import "./fonts.css"` for web. Restart with `--clear` when adding fonts.

## Home Screen (`index.tsx`)
- Stadium header img + cream overlay `rgba(242,235,217,0.45)`. Wordmark Bebas 52, white+green IQ.
- Cards: Locker Room (green, live) + The Grid (brown, soon). "More Games" pills. No bottom nav.
- `<ScrollView>` with `contentContainerStyle={{justifyContent:"flex-start"}}` — NOT on style prop (invariant error)

## Locker Room (`locker-room.tsx`)
- **Daily index:** `getDailyIndex()` = days since launch (Jun 13 2026) % dataset.length, today=index 0
- **Puzzle number:** `getPuzzleNumber()` = days since launch + 1, shown as "Day #N · Who is the mystery player?"
- 5 ⚽ lives. 3 teammates shown → 4th after 2 wrong → 5th after 4 wrong. Autocomplete opens UPWARD.
- **`totalGuesses` state** for "Solved in N" (NOT wrongGuesses.length+1 — was off-by-one bug)
- Wrong guesses = red pills (fontSize 13, bordered). Cards: padding 11, gap 12, name fontSize 13.
- **Persistence:** AsyncStorage key `lockerRoomHistory`, `{date: won}` map. Play-streak = consecutive days played. "Already played today" lock on mount.
- **End screens:** Win = green takeover + confetti + Bebas answer + streak + 7-day history + Share + "How They Connect" (club/years) below fold. Loss = `#2b2a26` muted, no confetti, "Out of lives".
- **Share format:** `⚽ Pitch IQ · Locker Room #N` / `⚽⚽⚽⚪⚪ Solved in 3 · 🔥 5` / CTA / `pitchiq.app`. Uses navigator.share or clipboard.
- **Animations:** lives shake + cards slide-in, both `useNativeDriver: false` (web compat).
- **Nav:** back arrow + "Back to Games" both `router.replace("/")` (not back()).

## Vercel (`vercel.json` at ROOT)
```json
{"buildCommand":"npx expo export --platform web","outputDirectory":"dist","framework":null,"cleanUrls":true,"trailingSlash":false}
```
`cleanUrls:true` fixes 404-on-refresh for sub-routes.

## Scroll Architecture
`fonts.css`: `html,body{overflow:hidden}` + `#root{overflow:hidden;display:flex;height:100%}` kills mobile double-scroll. Each screen's own ScrollView is the only scroller. **Lesson:** justifyContent on ScrollView goes in `contentContainerStyle`, not `style`.

## Analytics
Vercel Web Analytics enabled. `<Analytics/>` from `@vercel/analytics/react` in `_layout.tsx`. Dashboard: vercel.com → pitchiq → Analytics. Tracks visitors/page views/return rate (NOT puzzle completion — needs custom events later). Data has slight delay; ad blockers can block it.

## Working Principles (CLAUDE.md)
Think before coding (state assumptions, surface tradeoffs, ask). Simplicity first. Surgical changes. Goal-driven (verifiable success criteria).

## Next Steps
1. **Open Graph preview image** — branded link preview for shares
2. **Custom analytics events** — track puzzle completion/shares (deeper than page views)
3. **Stats screen** — use streak/history data, then re-add bottom nav
4. **Polish:** help/rules screen (? button does nothing), skip option
5. **Unify visual language** — photo header vs illustrated cards (deferred)
6. **Build The Grid** (Game 2)

## Dev Tips
- Reset puzzle: console `localStorage.clear()` + refresh. On phone: incognito tab.
- New terminal opens in `~` — always `cd ~/pitchiq` first.

## Roadmap Tracking
- **`Locker Room Roadmap.md`** lives in repo root (`~/pitchiq/`) — tracks future features for Game 1 in tiers: Now / Next / Someday / App-wide / Shipped. Maintain in VS Code, commit with code. As other games launch, they may get their own `<Game> Roadmap.md` files.
- **Leaderboard** is a logged idea (Someday) — NOTE: needs accounts + backend/database, breaks the current local-storage no-accounts model. Bigger architectural step; revisit when player numbers justify it.
