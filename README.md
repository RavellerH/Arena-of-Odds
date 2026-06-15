# Arena of Odds

A browser-based tactical combat game where strategy meets chance. Pick your avatar, choose your skills and stance, then battle opponents using coin flips and dice rolls in a dynamic arena.

🎮 **[Play Now](https://ravellerh.github.io/Arena-of-Odds/)**

---

## Overview

Arena of Odds is a single-page HTML5 game featuring:
- **8 unique avatars** with passive abilities that scale per round
- **6 combat skills** that modify attack and defense outcomes
- **3 tactical stances** for round-wide bonuses
- **8 powerful ultimates** recharged through coin flip results
- **Multiple game modes** — 1v1, tournament brackets, and PvE campaign

---

## How to Play

1. **Select an Avatar** — Each has a unique passive that grows stronger each round.
2. **Pick a Skill** — Modifies how your attacks and defenses resolve.
3. **Choose a Stance** — Sets a round-wide tactical bonus (Assault / Counter / Balanced).
4. **Fight!** — Each turn, flip coins and roll dice. Coin results determine hits/blocks; dice determine damage.
5. **Win** by reducing your opponent's LP (Life Points) to 0.

---

## Core Mechanics

| Mechanic | Description |
|---|---|
| LP | Life Points, max 200 (250 for Warrior) |
| Coin Flip | HEADS = attack lands / defense holds; TAILS = miss / open |
| Dice Roll | 2d6 — determines base damage (×6 multiplier) |
| Perfect Hit | Dice sum ≤ 4 → fixed 10 damage |
| Explosion | Dice sum ≥ 11 (~8% chance) → bonus damage |
| Ultimate | Charged by rolling TAILS on attack coins |

---

## Avatars

| Avatar | Passive Ability |
|---|---|
| Warrior | Battle Hardened — bonus max LP per round |
| Mage | Spellpower — bonus damage on high dice rolls |
| Rogue | Assassination — bypasses defender's coin flip |
| Paladin | Holy Shield — flat damage reduction |
| Berserker | War Cry — bonus damage based on wins |
| Healer | Rejuvenation — LP recovery each round |
| Archer | Precision — low dice sums treated as 6 |
| Necromancer | Life Drain — heals a % of damage dealt |

---

## Skills

| Skill | Effect |
|---|---|
| Double Strike | Double damage on matching dice |
| Perfect Hit | Low dice sums deal fixed 10 damage |
| Iron Guard | Negate attack and reflect 15 damage on a 6 |
| Gambler's Edge | Reroll attack TAILS once per round |
| Mystic Heal | Recover 25 LP after taking damage |
| Berserker | Damage doubled both ways below 80 LP |

---

## Stances

| Stance | Effect |
|---|---|
| Assault | +10 bonus damage on all hits |
| Counter | Deal 15 counter-damage on successful block |
| Balanced | +15 LP recovery at turn start; defense coins can't be forced TAILS |

---

## Project Structure

```
Arena-of-Odds/
├── index.html   # App shell & screen containers
├── style.css    # Styling and animations
├── data.js      # Game constants, avatar/skill/stance definitions
├── game.js      # Core combat engine
└── ui.js        # UI rendering and screen management
```

---

## Tech Stack

- Vanilla HTML5 / CSS3 / JavaScript (no frameworks)
- Google Fonts: Exo 2 + Rajdhani
- Deployed via GitHub Pages

---

## License

MIT License — feel free to fork and mod.
