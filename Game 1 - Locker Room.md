# Game 1 — Locker Room
*Design decisions + roadmap for Locker Room. Pairs with `pitchiq-context.md` (app-wide technical + shared design system).*

═══════════════════════════════════════
# PART A — DESIGN & DECISIONS (the "why")
═══════════════════════════════════════

## Concept
Wordle-style daily football quiz. Players guess a mystery footballer from their revealed **club teammates**. Mix of active + retired players, all leagues and eras.

## Core Mechanic
- 5 lives (footballs ⚽)
- Progressive reveal system — info unlocks as wrong guesses accumulate
- Free-text autocomplete input (opens upward) — pool of 953 players + puzzle pool merged
- Date-based daily puzzle, same for everyone
- Streak tracking + spoiler-free share

## Progressive Reveal System (fully shipped)

| Wrong guesses | What reveals |
|---|---|
| 0 | 3 teammates shown (name only) |
| 1 | Position hint pill appears (FWD/MID/DEF/GK) |
| 2 | Years added to cards + 4th teammate appears (full) |
| 3 | Club added to all revealed cards |
| 4 | Nationality hint pill appears (🇫🇷) + 5th teammate appears (full) |
| 5 | Game over |

Wrong guesses shown as red pills ABOVE the hints section and teammate cards.
Hint pills: cream bg, dark green border, centered text. Flag emoji size 24.

**Card meta format:** years render before club — `2001–2003 · Real Madrid`. Multi-club overlaps stack one line per stint. Years (step 2) appear before club is attached (step 3), so a card briefly shows years alone.

## Key Design Decisions (the "why")

### 1. Teammates span DIFFERENT clubs across the answer's career
The heart of the uniqueness guarantee. Picking teammates from across a player's whole career (not one club) means **only one footballer in history** could have played with all five at club level.

### 2. Progressive reveal over full info upfront
Competitor WPW shows all info (name + club + years + nationality) on all cards from the start. Pitch IQ starts with name only and progressively reveals more as the player struggles — preserving the "aha moment" for good players while helping casual players who get stuck.

### 3. Favour "aha moment" connections over famous ones
Teammate selection prioritises **surprising, less-obvious** connections — short stints, unexpected transfers, loan spells — over the most famous associations.
Flavour examples:
- Raúl + Manuel Neuer (Schalke — not the obvious Real Madrid pick)
- Harry Kane + Jamie Vardy (forgotten 2013 Leicester loan)
- Son + Rafael van der Vaart (Hamburg 2012-13)
- Ronaldo Nazário + Andrea Pirlo (Inter Milan overlap)

## Competitor Analysis — Who Played With (WPW)
Reviewed June 14, 2026.
- Shows name + club + years + nationality on ALL cards from the start (easier than Pitch IQ)
- 6 lives vs our 5
- Has archive feature — strong retention mechanic
- Single game site — no suite of games (our key moat)
- **What to protect:** our progressive reveal, our share format, our multi-game suite vision
- **Strategic conclusion:** ship The Grid ASAP — that's when Pitch IQ becomes something WPW can't compete with

## Data Accuracy — THE make-or-break factor
A single wrong connection undermines game credibility. Non-negotiable.

### The lesson that started it all
Early dataset listed **Haaland + Solskjær** as Molde teammates — Solskjær was his *manager*, never a playing teammate. Triggered full audit.

### Approach
Every connection web-search verified BEFORE going in. Dataset is pre-verified — no runtime verification.

### Recognisability pass
Some obscure teammates swapped for recognisable names while keeping "aha" quality.

## Dataset Schema
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

## Dataset Evolution
- **83 players**, evolving
- Now includes `nationality` (emoji flag) and `position` (FWD/MID/DEF/GK) per player
- Hard rule: **no two answer players share 3+ teammates**
- File order = play order; **APPEND new players to END**
- **Launch sequence:** Anelka(#1), Džeko(#2), Cannavaro(#3), Crespo(#4), Messi(#5)...

## Principles to Preserve
1. Accuracy is sacred — web-verify every new connection
2. Aha over obvious — surprising connections beat famous ones
3. Uniqueness — first 3 clues must point to exactly one answer
4. Recognisable enough — obscure in connection, not no-name players
5. Append, don't insert — keeps the daily sequence stable

═══════════════════════════════════════
# PART B — ROADMAP
═══════════════════════════════════════

## 🔥 Now (this week)
- [ ] Real streak on home card (wire to `lockerRoomHistory` storage)

## 🔜 Next (this month)
- [ ] Stats screen — total played, win rate, current + best streak, history
- [ ] Archive — replay past puzzles (moved up after competitor analysis — strong retention mechanic)
- [ ] Skip option for a puzzle
- [ ] Feedback section — lightweight player idea collection (Google Form or mailto)
- [ ] Buy Me a Coffee / Ko-fi donation link

## 💡 Someday / Ideas
- [ ] **Leaderboard** — requires accounts + backend. Revisit when numbers justify it.
- [ ] Custom analytics events — track puzzle completion + share rate
- [ ] Unify visual language — photo header vs illustrated card art
- [ ] Difficulty hint or "reveal a letter" mechanic

## App-wide (not Locker Room specific)
- [ ] Build The Grid (Game 2) — HIGHEST PRIORITY
- [ ] Build Transfer Window (Game 3)
- [ ] Build One Season Wonder (Game 5)
- [ ] Native app / App Store submission (deferred)

## ✅ Shipped
- [x] Core daily game — 83-player dataset, autocomplete, 5 lives, teammate reveals
- [x] Win/loss end screens (green takeover + confetti / muted) with "How They Connect"
- [x] Streak tracking + persistence (AsyncStorage, survives refresh)
- [x] Share Result (spoiler-free text)
- [x] Animations (lives shake, card slide-in)
- [x] Puzzle number ("Day #N") + locked launch sequence
- [x] Deployed live on Vercel + Web Analytics
- [x] Fixed blank-screen bug (removed font-loading gate)
- [x] Custom domain `pitchiq.games`
- [x] Open Graph image + meta tags
- [x] Guess count bug fixed (`totalGuesses` state)
- [x] Expanded autocomplete to 953 players (`players.json` merged with puzzle pool)
- [x] Progressive reveal system (name → position → years → club → nationality → 5th teammate)
- [x] Help modal (? button) — rules + progressive reveal table
- [x] Wrong guesses moved above teammates section
- [x] Hint pills (position + nationality) — cream bg, green border, centered, flag emoji size 24
- [x] `nationality` + `position` fields added to all 83 players in `teammates.json`
