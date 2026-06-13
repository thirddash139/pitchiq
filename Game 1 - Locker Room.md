# Game 1 — Locker Room
*Design decisions + roadmap for Locker Room. Pairs with `pitchiq-context.md` (app-wide technical + shared design system).*

═══════════════════════════════════════
# PART A — DESIGN & DECISIONS (the "why")
═══════════════════════════════════════

## Concept
Wordle-style daily football quiz. Players guess a mystery footballer from their revealed **club teammates**. Mix of active + retired players, all leagues and eras.

## Core Mechanic
- 5 lives (footballs ⚽)
- 3 teammates shown initially → 4th unlocks after 2 wrong guesses → 5th after 4 wrong
- Free-text autocomplete input (opens upward)
- Date-based daily puzzle, same for everyone
- Streak tracking + spoiler-free share

## Key Design Decisions (the "why")

### 1. Teammates span DIFFERENT clubs across the answer's career
The heart of the uniqueness guarantee. Picking teammates from across a player's whole career (not one club) means **only one footballer in history** could have played with all five at club level. This is what makes a single correct answer possible.

### 2. No club labels shown during play
Club names were initially displayed but **deliberately removed** — makes puzzles harder and more rewarding when the player works out the career path themselves. (Clubs DO appear on the end screen's "How They Connect" as the payoff.)

### 3. Favour "aha moment" connections over famous ones
Teammate selection prioritises **surprising, less-obvious** connections — short stints, unexpected transfers, loan spells — over the most famous associations. Emotional target: the "wait, THEY played together?!" moment on reveal.
Flavour examples:
- Raúl + Manuel Neuer (Schalke — not the obvious Real Madrid pick)
- Harry Kane + Jamie Vardy (forgotten 2013 Leicester loan — sat on the bench together)
- Son + Rafael van der Vaart (Hamburg 2012-13, VdV mentored Son)
- Ronaldo Nazário + Andrea Pirlo (Inter Milan overlap people forget)

## Data Accuracy — THE make-or-break factor
A single wrong connection undermines the game's credibility. Non-negotiable.

### The lesson that started it all
Early dataset listed **Haaland + Solskjær** as Molde teammates — but Solskjær was Haaland's *manager*, never a playing teammate. Catching this triggered a full audit.

### What the audit found (325 connections / 65 players at the time)
~19-25 wrong connections, in categories:
- Wrong clubs entirely
- Players at *rival* clubs (never same squad)
- Players who **missed each other by one transfer window** (most common error)
- National-team-only connections wrongly presented as club connections

Verified fixes (web search):
- Robben + Van Dijk at Groningen → WRONG (Robben left 2002, VVD arrived 2010) → replaced w/ Tim Matavž
- Modrić + Michael Owen at Real Madrid → WRONG (Owen left 2004, Modrić joined 2012)
- Confirmed CORRECT: Kane + Vardy (Leicester 2013), Son + Van der Vaart (Hamburg 2012-13)

### Approach
Every connection web-search verified BEFORE going in. Built a visual review tool (React artifact: expand/collapse by player, click-to-flag, search/filter). Dataset is pre-verified — no runtime verification.

### Recognisability pass
Some obscure teammates swapped for recognisable names while keeping "aha" quality: Rooney → Schweinsteiger/Arteta/Di María; Son → Leno; Kane → Adebayor; Bruno → Nani; Van Dijk → Forster/Pellè/Lovren; Özil → Pizarro/Podolski.

## Dataset Evolution
- ~65 players → grew to 106 → **deliberately reduced to 83** (removed 21 high-risk entries whose first-3-clue answers couldn't be guaranteed unique)
- **Evolving** — grows as new verified entries are added
- Each answer: exactly 5 verified teammates (name / club / years)
- Hard rule: **no two answer players share 3+ teammates**
- File order = play order; **APPEND new players to END** to keep daily sequence stable

## Principles to Preserve (when adding/editing puzzles)
1. Accuracy is sacred — web-verify every new connection
2. Aha over obvious — surprising connections beat famous ones
3. Uniqueness — first 3 clues must point to exactly one answer
4. Recognisable enough — obscure in connection, not no-name players
5. Append, don't insert — keeps the daily sequence stable

═══════════════════════════════════════
# PART B — ROADMAP
═══════════════════════════════════════

Keep **Now** short (3–5 items). New ideas → drop in **Someday** immediately, but only pull work from **Now**. Check off as shipped.

## 🔥 Now (this week)
- [ ] Real streak on home card (currently removed — wire to `lockerRoomHistory` storage)
- [ ] Help / rules screen (the "?" button currently does nothing)

## 🔜 Next (this month)
- [ ] Stats screen — total played, win rate, current + best streak, history
- [ ] Skip option for a puzzle
- [ ] Open Graph preview image for shared links (app-wide, helps Locker Room shares)

## 💡 Someday / Ideas
- [ ] **Leaderboard** — NOTE: requires accounts + backend/database; breaks current local-storage no-accounts model. Bigger architectural step. Revisit when daily-player numbers justify it.
- [ ] Custom analytics events — track puzzle completion + share rate
- [ ] Unify visual language — photo header vs illustrated card art
- [ ] Difficulty hint or "reveal a letter" mechanic
- [ ] Archive — replay past puzzles

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
