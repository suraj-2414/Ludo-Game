// Ludo ke pure rules. Yahan React ya network ka kuch nahi hai, isliye ise Node mein test karna aasaan hai.
//
// Board 15x15 grid hai. Har cell [col, row] hai. Track mein 52 cell hain, clockwise.
// Colors ka index: 0 Red (top-left), 1 Green (top-right), 2 Blue (bottom-right), 3 Yellow (bottom-left).

export const COLORS = ['red', 'green', 'blue', 'yellow'];
export const COLOR_NAME = ['Red', 'Green', 'Blue', 'Yellow'];

// 2 players ho to opposite corners (Red, Blue), 4 ho to sab.
export const ACTIVE_FOR = { 2: [0, 2], 4: [0, 1, 2, 3] };

// Naye player ko pehle kaun sa color dena hai. 2 player mein pehle opposite corners (Red, Blue).
// Player baad mein apna color khud badal sakta hai (koi bhi 4 mein se, jo kisi aur ne na liya ho).
export const COLOR_PREF = { 2: [0, 2, 1, 3], 4: [0, 1, 2, 3] };

export const PATH = [];
(function buildPath() {
  // seg(startCol, startRow, dCol, dRow, kitne cell)
  const seg = (c, r, dc, dr, n) => {
    for (let i = 0; i < n; i++) PATH.push([c + dc * i, r + dr * i]);
  };
  seg(1, 6, 1, 0, 5);
  seg(6, 5, 0, -1, 6);
  seg(7, 0, 1, 0, 2);
  seg(8, 1, 0, 1, 5);
  seg(9, 6, 1, 0, 6);
  seg(14, 7, 0, 1, 2);
  seg(13, 8, -1, 0, 5);
  seg(8, 9, 0, 1, 6);
  seg(7, 14, -1, 0, 2);
  seg(6, 13, 0, -1, 5);
  seg(5, 8, -1, 0, 6);
  seg(0, 7, 0, -1, 2);
})();

// Har color apne start cell se track par chalna shuru karta hai.
export const START = [0, 13, 26, 39];

// Safe cells: 4 start cell + 4 star cell. Yahan goti nahi katti.
export const SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Har color ka apna 5 cell ka home column, jo center ki taraf jaata hai.
export const HOME_COL = [
  [1, 2, 3, 4, 5].map((c) => [c, 7]),
  [1, 2, 3, 4, 5].map((r) => [7, r]),
  [13, 12, 11, 10, 9].map((c) => [c, 7]),
  [13, 12, 11, 10, 9].map((r) => [7, r]),
];

// Yard (ghar) ka top-left corner, SVG units mein (board 150x150 hai).
export const YARD = [
  [0, 0],
  [90, 0],
  [90, 90],
  [0, 90],
];

// Goti ki "progress" p:
//   -1       = ghar (yard) mein
//   0..50    = track par (0 matlab apna start cell)
//   51..55   = home column ke 5 cell
//   56       = home pahunch gayi
export function trackIndex(color, p) {
  return (START[color] + p) % 52;
}

export function cellOf(color, p) {
  if (p < 0) return null;
  if (p <= 50) return PATH[trackIndex(color, p)];
  if (p <= 55) return HOME_COL[color][p - 51];
  return [7, 7];
}

export function newTokens() {
  return [0, 1, 2, 3].map(() => [-1, -1, -1, -1]);
}

// Dice ke number par kaun si goti chal sakti hai. Ghar mein baithi sab goti ek jaisi hain,
// isliye unme se sirf pehli ko option banate hain.
export function legalMoves(tokens, color, roll) {
  const out = [];
  let yardUsed = false;
  tokens[color].forEach((p, i) => {
    if (p === -1) {
      if (roll === 6 && !yardUsed) {
        out.push(i);
        yardUsed = true;
      }
    } else if (p < 56 && p + roll <= 56) {
      out.push(i);
    }
  });
  return out;
}

// Ek chaal chalo aur result do. tokens ko badalta nahi, naya copy return karta hai.
export function resolveMove(tokens, color, ti, roll) {
  const nt = tokens.map((a) => a.slice());
  const from = nt[color][ti];
  const to = from === -1 ? 0 : from + roll;
  nt[color][ti] = to;

  const captured = []; // [{color, ti}]
  if (to <= 50) {
    const cell = trackIndex(color, to);
    if (!SAFE.has(cell)) {
      for (let op = 0; op < 4; op++) {
        if (op === color) continue;
        nt[op].forEach((q, j) => {
          if (q >= 0 && q <= 50 && trackIndex(op, q) === cell) {
            nt[op][j] = -1;
            captured.push({ color: op, ti: j });
          }
        });
      }
    }
  }
  return {
    tokens: nt,
    from,
    to,
    captured,
    reachedHome: to === 56,
    won: nt[color].every((p) => p === 56),
  };
}

// Kya is jagah ki goti ke peeche 1 se 6 step ke andar kisi aur ki goti hai?
function threatened(tokens, color, p) {
  const cell = trackIndex(color, p);
  if (SAFE.has(cell)) return false;
  for (let op = 0; op < 4; op++) {
    if (op === color) continue;
    for (const q of tokens[op]) {
      if (q < 0 || q > 50) continue;
      const d = (cell - trackIndex(op, q) + 52) % 52;
      if (d >= 1 && d <= 6) return true;
    }
  }
  return false;
}

// Computer ka simple dimaag: har chaal ko number do aur sabse accha chuno.
function scoreMove(tokens, color, ti, roll) {
  const p = tokens[color][ti];
  const np = p === -1 ? 0 : p + roll;
  let s = Math.random() * 5 + np * 0.3;
  if (np === 56) s += 70; // home pahunchi
  if (p === -1) s += 45; // ghar se nikli
  if (np >= 51 && p < 51) s += 35; // home column mein ghusi
  if (np <= 50) {
    const cell = trackIndex(color, np);
    if (SAFE.has(cell)) {
      s += 18;
    } else {
      let hits = 0;
      for (let op = 0; op < 4; op++) {
        if (op === color) continue;
        hits += tokens[op].filter((q) => q >= 0 && q <= 50 && trackIndex(op, q) === cell).length;
      }
      s += hits * 100; // goti kaatna sabse badhiya
      if (!hits && threatened(tokens, color, np)) s -= 30; // khatre wali jagah par jaana kharab
    }
  }
  if (p >= 0 && p <= 50 && threatened(tokens, color, p)) s += 25; // khatre se bahar nikalna accha
  return s;
}

export function chooseMove(tokens, color, moves, roll) {
  let best = moves[0];
  let bestScore = -Infinity;
  for (const ti of moves) {
    const s = scoreMove(tokens, color, ti, roll);
    if (s > bestScore) {
      bestScore = s;
      best = ti;
    }
  }
  return best;
}
