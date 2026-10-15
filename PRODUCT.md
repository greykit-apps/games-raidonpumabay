# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Desktop players of all kinds, new players first: people who never played *Raid on Bungeling Bay* should find it inviting, and fans of the 1984 original should recognise it. Keyboard or gamepad on a computer, in sessions of a round or two; phone play is out of scope.

## Product Purpose

A remake of Broderbund's *Raid on Bungeling Bay* (C64, 1984) where the pilot is a puma and the enemy is the Wolf Empire: six factories that each improve one line of the enemy's war while they stand, a battleship building in a secret yard that hunts the carrier once it sails, and rounds that come back harder. Success is a player who wins a round, wants another, and comes back for a better score.

## Positioning

The 1984 game's design (factories that rebuild, the battleship race, landing on the carrier to rearm, a bay that wraps), rebuilt as its own game rather than an emulation. Classic plays as 1984 did; Field adds modern aids.

## Operating Context

Part of the greykit.games portfolio, served at greykit.com/games/raidonpumabay. It opens on the shared greykit boot screen (owner's decision, 2026-10-15: the only thing kept as it is); everything after the boot is the game's own. High scores and a game in progress live in this browser only.

## Capabilities and Constraints

- Plain scripts, no build step, nothing fetched at play time: every picture is drawn and every sound synthesised in the page.
- The engine (`js/engine/`) is DOM-free and deterministic from a seed; `tools/sim-check.js` plays it headless.
- Desktop only; small screens get a note instead of the game.
- Keyboard first, gamepad supported.
- games-meta STANDARD.md rules apply (credit, Forget everything, menu keys, Settings order, sound).

## Brand Commitments

- The name Raid on Puma Bay. The pilot is a puma; the enemy is the Wolf Empire (owner's decision, 2026-10-15).
- Seen straight down, as 1984 was (owner's decision, 2026-10-15), in modern hi-bit pixel art.
- It must not look like a mobile game, and it must not look like it is running in an emulator.

## Evidence on Hand

No Broderbund code, art, sound or text may be used; the reference disk is gitignored. The numbers are ours (`js/engine/const.js`) and still need real play to tune.

## Product Principles

1. The game first: graphics serve reading the bay, the threats and the clock the battleship sets.
2. Faithful in play, free in look.
3. Inviting to newcomers without hiding the original's depth.

## Accessibility & Inclusion

Keyboard-complete play and menus; text contrast at WCAG AA; nothing essential conveyed by colour alone; respects reduced motion.
