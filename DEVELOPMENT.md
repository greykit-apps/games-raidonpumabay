# Raid on Puma Bay: development

Plain scripts, no build step, nothing fetched at play time: every picture is drawn and every sound synthesised in the page, and the two typefaces are in `fonts/`. What the game is meant to be is in [PRODUCT.md](PRODUCT.md).

## What's in here

```
js/engine/   the game, DOM-free: the map, the helicopter and carrier, the enemy, a step of it all, and a bot
js/art/      the pixel art: the sprite rasteriser, vehicles, buildings, effects, the painted bay
js/          rendering, the HUD, input, sound, the screens, settings and scores, and the loop
js/gk-*.js   games-meta canon, taken whole: the boot and default title (@gk-title v0.4), the integrated intro (@gk-intro v0.2)
tools/       sim-check (the bot plays every difficulty headless), asset stamps and checks, icons, the share card
```

## Checks

`node tools/sim-check.js` plays the game headless: the map is sound, the bot wins round one on Easy every time and on Normal at least once, and a game replays step for step. `node tools/stamp-assets.js` stamps every script and stylesheet with its hash after an edit. `tools/preview.html` is the sprite sheet; `tools/og.html` draws the share card.

## The intro

The integrated intro (games-meta STANDARD.md §14): the boot with the meow, a hold for a press only where the browser will not play sound yet, then the bay alone while "Raid on Puma Bay" fades in as the theme starts, "Raid" on its first chord and a word every other beat after, and the menu landing two bars in. `?hold=always` holds even where the browser would play sound; `?shot` and `?sheet` keep the plain boot, and `?play` has none.
