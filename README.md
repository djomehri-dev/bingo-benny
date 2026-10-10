# bingo-benny

A casual bingo game hosted by Benny, a bingo-ball mascot. Plain HTML/CSS/JS, no build step.

## Run it

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## How it plays

Benny is a real long-haired black cat (smoky brown ruff, yellow-green eyes), drawn as an SVG in `index.html`. The card is shaped like his face.

- 5×5 card (B 1–15, I 16–30, N 31–45, G 46–60, O 61–75), free centre.
- Every 6.5s a ball is called as a **riddle**: arithmetic, primes, squares, Fibonacci, coin/dice probability, combinations ("ways to pick 2 cats from 8"). The column letter is shown; the number is revealed in the answer history when the next ball comes.
- **Schrödinger boxes**: 4 cells hold "a or b", and only one of them is real. Open one after either number is called for a 50/50, or wait for both to be called and it's 100% safe. Open it on the wrong number and the box is empty for the rest of the round.
- **Odds meter**: the exact chance the next ball completes a line, worked out from your daubs and the answers already revealed (it never gives away the current riddle).
- Tapping a number that hasn't been called makes Benny hiss and freezes the card for 2s, so guessing by tapping everything doesn't pay off.
- 3 rival bots play their own cards. If one gets bingo first, you lose the round.

## Ad placements

All ad calls go through [ads.js](ads.js), which currently shows a placeholder countdown.

| Placement | Type | Where |
|---|---|---|
| Benny Boost: Benny pounces, peeks in every box (empty ones get one of his nine lives back), paws every called number, and solves the next 5 riddles | Rewarded | During a round, once per round |
| Double coins | Rewarded | Result screen after a win |
| Ad break | Interstitial | Before "Play again", max every 2 rounds and 90s |

To go live, replace the bodies of `showRewarded()` and `maybeInterstitial()` in `ads.js` with your SDK's calls:

- **Web portals (Poki, CrazyGames):** they host the game and serve ads, and you get a revenue share. Easiest way to start.
- **Mobile (AdMob, AppLovin MAX):** wrap the game with Capacitor and use a native ad plugin.

## Tuning knobs (top of game.js)

`CALL_MS` (pace), `RIVALS`, `BOXES`, `BOOST_BALLS`, `FREEZE_MS`, `BASE_REWARD`, `LUCKY_BOX_BONUS`. A round lasts about 33 balls (~3.5 min).
