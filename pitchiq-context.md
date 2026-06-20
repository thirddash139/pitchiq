# Pitch IQ — Project Context
*Last updated: Session — reordered progressive reveals (position → years → club → nationality), help modal added*

## Overview
Football trivia web app, 5 games. Expo/React Native → static web export. Web-first, no App Store.
- **Live:** `pitchiq.games`
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
│   ├── _layout.tsx       # Font loading (no gate) + <Analytics/>
│   ├── +html.tsx         # HTML shell — OG/Twitter meta tags, page title
│   ├── fonts.css         # @font-face + html/body overflow:hidden
│   ├── index.tsx         # Home screen
│   ├── locker-room.tsx   # Game 1
│   └── data/
│       ├── teammates.json    # Dataset (83 players, evolving) — now includes nationality + position fields
│       └── players.json      # 953-player autocomplete pool (separate from puzzle data)
├── assets/fonts/ (BebasNeue-Regular.ttf, PlayfairDisplay-Bold.ttf)
├── assets/images/stadium-header.png
├── public/og-image.png   # OG preview image (1200×630) — live at pitchiq.games/og-image.png
└── vercel.json           # ROOT — fixes route 404 on refresh
```

## Dataset (`app/data/teammates.json`)
- **83 players**, evolving
- Now includes `nationality` (emoji flag 🇫🇷) and `position` (FWD/MID/DEF/GK) fields per player
- File order = play order. Day #1 = first entry (Anelka), steps down daily.
- **RULE: APPEND new players to END** — keeps existing sequence intact
- **Launch sequence:** Anelka(#1), Džeko(#2), Cannavaro(#3), Crespo(#4), Messi(#5), Ronaldo(#6), Zidane(#7)...
- **To update:** get new JSON from Game 1 chat → `cp ~/Downloads/teammates.json ~/pitchiq/app/data/teammates.json` → commit/push
- **Schema:**
```json
{
  "name": "Nicolas Anelka",
  "nationality": "🇫🇷",
  "position": "FWD",
  "teammates": [
    { "name": "...", "club": "...", "years": "..." }
  ]
}
```

## Autocomplete Pool (`app/data/players.json`)
- **953 players** — comprehensive name list covering all major leagues + eras
- Merged at runtime with puzzle pool (answers + teammates), deduplicated
- Separate from puzzle data — adding names here carries zero risk to puzzle integrity
- `buildNamePool(dataset)` in `locker-room.tsx` handles the merge

## Design System
- Cream bg `#F2EBD9` | green `#1E4D24`/`#2D6A32` | bright green `#4ade80` (win only) | tan `#9C8E6E`/`#B0A48A` | loss bg `#2b2a26`
- **Type (3-level):** Bebas Neue (wordmark/titles/answer/streak), Playfair Display (card titles/prompt), system sans (body)
- **8-point spacing** (multiples of 4/8/16/24/32/48)

## CRITICAL: Font loading on Expo web
`@expo-google-fonts` fails silently on web. Need BOTH: (1) `useFonts` in `_layout.tsx` for native (NO gate — don't block render on font load, causes blank screen on slow devices), (2) `@font-face` in `app/fonts.css` + `import "./fonts.css"` for web.

## Blank Screen Bug — FIXED
Removing `if (!fontsLoaded) return <blank view>` gate from `_layout.tsx` fixed blank screen on other devices. App always renders; fonts load in background. Never gate the render on font loading.

## Home Screen (`index.tsx`)
- Stadium header img + cream overlay `rgba(242,235,217,0.45)`. Wordmark Bebas 52, white+green IQ.
- Cards: Locker Room (green, live) + The Grid (brown, soon). "More Games" pills. No bottom nav.
- No fake status bar (removed). No hardcoded streak on card (removed — will wire to real data with Stats screen).
- `<ScrollView>` with `contentContainerStyle={{justifyContent:"flex-start"}}` — NOT on style prop (invariant error)

## Locker Room (`locker-room.tsx`)
- **Daily index:** `getDailyIndex()` = days since launch (Jun 13 2026) % dataset.length, today=index 0
- **Puzzle number:** `getPuzzleNumber()` = days since launch + 1, shown as "Day #N · Who is the mystery player?"
- **5 ⚽ lives. Progressive reveal system:**

| Wrong guesses | What reveals |
|---|---|
| 0 | 3 teammates (name only) |
| 1 | Position hint pill appears (FWD/MID/DEF/GK) |
| 2 | Years added to cards + 4th teammate revealed (full) |
| 3 | Club added to cards |
| 4 | Nationality hint pill appears (🇫🇷) + 5th teammate revealed (full) |
| 5 | Game over |

- **Hint pills:** cream bg `#F2EBD9`, dark green border + text `#1E4D24`, positioned above "Teammates Revealed" label. Flag emoji size 24, position text size 13 bold, both center aligned.
- **Wrong guesses:** shown as red pills ABOVE the hints bar and teammates section.
- **Autocomplete** opens UPWARD, 953-player pool merged with puzzle pool.
- **`totalGuesses` state** for "Solved in N" (NOT wrongGuesses.length+1 — off-by-one bug, fixed)
- **Persistence:** AsyncStorage key `lockerRoomHistory`, `{date: won}` map. Play-streak = consecutive days played.
- **End screens:** Win = green takeover + confetti. Loss = `#2b2a26` muted. Both show "How They Connect" with full club + years.
- **Share format:** `⚽ Pitch IQ · Locker Room #N` / `⚽⚽⚽⚪⚪ Solved in 3 · 🔥 5` / `pitchiq.games`.
- **Animations:** lives shake + cards slide-in, both `useNativeDriver: false` (web compat).
- **Nav:** back arrow + "Back to Games" both `router.replace("/")` (not back()).

## Open Graph (`app/+html.tsx` + `public/og-image.png`)
- OG image: 1200×630 PNG, floodlit pitch design, live at `pitchiq.games/og-image.png`
- Meta tags: `og:title`, `og:description`, `og:image`, `og:site_name`, `twitter:card`, `twitter:image`
- Description: "Daily football puzzle games. Guess the footballer, master the grid, and more — a new challenge every day."
- Verified working via opengraph.xyz

## Domain
- Custom domain: `pitchiq.games` (purchased, pointed to Vercel via nameservers)
- DNS setup: update nameservers at registrar to Vercel's NS → propagates in ~30min

## Vercel (`vercel.json` at ROOT)
```json
{"buildCommand":"npx expo export --platform web","outputDirectory":"dist","framework":null,"cleanUrls":true,"trailingSlash":false}
```

## Scroll Architecture
`fonts.css`: `html,body{overflow:hidden}` + `#root{overflow:hidden;display:flex;height:100%}` kills mobile double-scroll.

## Analytics
Vercel Web Analytics. `<Analytics/>` in `_layout.tsx`. Dashboard: vercel.com → pitchiq → Analytics.

## Working Principles (CLAUDE.md)
Think before coding. Simplicity first. Surgical changes. Goal-driven (verifiable success criteria).

## Next Steps
1. **The Grid (Game 2)** — highest leverage move; HTML prototype + 5 categories ready in separate chat
2. **Stats screen** — use existing streak/history data; then re-add bottom nav
3. **Archive** — replay past puzzles (strong retention mechanic)
4. **Feedback section** — lightweight player idea collection (Google Form or mailto link)
5. **Buy Me a Coffee** — Ko-fi or similar donation link
6. **Custom analytics events** — track puzzle completion + share rate
7. **Polish:** skip option, real streak on home card

## Dev Tips
- Reset puzzle: console `localStorage.clear()` + refresh. On phone: incognito tab.
- New terminal opens in `~` — always `cd ~/pitchiq` first.
- Test locally with `npx expo start --web` before pushing to Vercel.

## Document System
- `pitchiq-context.md` — this file: app-wide tech + design system
- `Game 1 - Locker Room.md` — Locker Room design decisions + roadmap
- Future: `Game 2 - The Grid.md` etc. as each game launches
