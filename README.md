# Apna Ludo

Ludo built with React + Vite. 2 or 4 players, against the computer, on one device, or online from separate devices.

## Run on your computer

```
npm install
npm run dev
```

Open the link it prints (usually http://localhost:5173).

## Deploy on Vercel

1. Push the project to GitHub (node_modules and dist are ignored automatically).
2. On vercel.com choose "Add New > Project" and pick that repo.
3. Vercel detects Vite by itself (build command `npm run build`, output folder `dist`). Change nothing.
4. Click Deploy. You get a link to share.

## Play with a friend on a different device

1. In the menu choose "Online", pick 2 or 4 players and click "Create room".
2. A 5-character room code and a link appear. Click "Copy link" and send it to your friend.
3. Your friend opens the link, types a name and clicks "Join".
4. Everyone can change their own name and pick their own color in the lobby (any of Red, Green, Blue, Yellow that nobody else has taken). The host can also pick colors for computer seats.
5. When everyone is in, the host clicks "Start game". Any empty seat is played by the computer.

Turns always follow the board order (Red, Green, Blue, Yellow), whatever colors people picked.

Online mode needs no server of your own. The browsers connect directly to each other (PeerJS / WebRTC).
PeerJS's free public server is only used at the start to introduce the two browsers.

Things to know:
- The host's page must stay open. If the host closes or refreshes it, the room ends.
- If a friend leaves mid-game, the computer takes over their color.
- Some office or college networks block WebRTC. If joining fails, try mobile data or another wifi.
- The game rules run in the host's browser. Friends only send "roll" and "move token" requests on their own turn.

## Fair dice

Every player gets their own shuffled "bag" of 12 rolls (each number 1 to 6 appears twice). Numbers are drawn from the bag one by one, and a fresh bag is shuffled when it runs out. So every player gets the same balanced set of numbers, and one player cannot get a long lucky streak while the other gets only low numbers. Over 30 rolls, two players' totals differed by 10 or more in about 48% of games with plain random dice, and in about 2.5% with this bag.

If all four of a player's tokens are still at home, they get 3 tries to roll a 6 (the classic Ludo rule), so a player is not stuck waiting turn after turn.

The scoreboard shows each player's average roll and number of 6s so you can see that luck stays even. The dice are rolled by the host's browser in online games.

## Files

- `src/game/logic.js`: Ludo rules (path, safe squares, capture, computer strategy)
- `src/game/dice.js`: fair dice (shuffled bag per player)
- `src/game/engine.js`: turn flow (dice, 3 tries, extra roll on 6, three 6s, winning)
- `src/net/session.js`: local, host and guest sessions (PeerJS lives here)
- `src/components/`: Board, Dice (3D), Menu, Lobby, Game, Avatar, ColorPicker
- `src/styles.css`: all styling, light and dark theme
