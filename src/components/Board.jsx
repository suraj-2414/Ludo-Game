import { memo } from 'react';
import { COLORS, COLOR_NAME, PATH, HOME_COL, YARD, cellOf } from '../game/logic.js';

// Board ka SVG 150x150 units ka hai, har cell 10x10.

const SPOTS = [
  [20, 20],
  [40, 20],
  [20, 40],
  [40, 40],
];

function starPoints(cx, cy) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 3.4 : 1.4;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

// Har color ki goti ka "gola" jaisa chamakdaar gradient. Rang CSS variable se aata hai, to light/dark dono mein chalta hai.
function Defs() {
  return (
    <defs>
      {COLORS.map((name) => (
        <radialGradient key={name} id={`tok-${name}`} cx="34%" cy="28%" r="80%">
          <stop offset="0" style={{ stopColor: `color-mix(in srgb, var(--${name}) 45%, #ffffff)` }} />
          <stop offset="0.5" style={{ stopColor: `var(--${name})` }} />
          <stop offset="1" style={{ stopColor: `color-mix(in srgb, var(--${name}) 68%, #000000)` }} />
        </radialGradient>
      ))}
    </defs>
  );
}

// Har color apne home column mein jaane se pehle jis cell par aata hai wahan chhota teer bana hai.
const ARROWS = [
  { k: 0, pts: '3,72.4 7.6,75 3,77.6' }, // Red: dayen
  { k: 1, pts: '72.4,3 77.6,3 75,7.6' }, // Green: neeche
  { k: 2, pts: '147,72.4 142.4,75 147,77.6' }, // Blue: bayen
  { k: 3, pts: '72.4,147 77.6,147 75,142.4' }, // Yellow: upar
];

// Board ka wo hissa jo kabhi nahi badalta. memo ki wajah se ye har chaal par dobara nahi banta.
const StaticBoard = memo(function StaticBoard({ activeKey }) {
  const active = activeKey.split(',').filter(Boolean).map(Number);
  const on = (k) => active.includes(k);
  const cell = (c, r, cls, key) => (
    <rect key={key} className={`cell ${cls}`} x={c * 10} y={r * 10} width="10" height="10" />
  );
  return (
    <g>
      <rect className="board-bg" width="150" height="150" />

      {/* Chaaron kone ke yard. Jo color khel mein nahi hai wo phika (idle) dikhta hai. */}
      {YARD.map(([ox, oy], k) => {
        const name = on(k) ? COLORS[k] : 'idle';
        return (
          <g key={k}>
            <rect className={`q-${name}`} x={ox} y={oy} width="60" height="60" />
            <rect className="yard-in" x={ox + 9} y={oy + 9} width="42" height="42" rx="7" />
            {SPOTS.map(([dx, dy], i) => (
              <circle key={i} className={`spot-${name}`} cx={ox + dx} cy={oy + dy} r="5.2" />
            ))}
          </g>
        );
      })}

      {/* 52 cell ka track. Start cell apne color ke hote hain. */}
      {PATH.map(([c, r], i) => {
        const k = [0, 13, 26, 39].indexOf(i);
        const cls = k === -1 ? '' : on(k) ? COLORS[k] : 'idle';
        return cell(c, r, cls, `p${i}`);
      })}

      {/* Home columns */}
      {HOME_COL.map((col, k) =>
        col.map(([c, r], i) => cell(c, r, on(k) ? COLORS[k] : 'idle-hc', `h${k}-${i}`))
      )}

      {/* Beech ke chaar tikon */}
      <polygon className={on(0) ? 'c-red-t' : 'c-idle-t'} points="60,60 75,75 60,90" />
      <polygon className={on(1) ? 'c-green-t' : 'c-idle-t'} points="60,60 90,60 75,75" />
      <polygon className={on(2) ? 'c-blue-t' : 'c-idle-t'} points="90,60 90,90 75,75" />
      <polygon className={on(3) ? 'c-yellow-t' : 'c-idle-t'} points="60,90 90,90 75,75" />
      <circle className="hub" cx="75" cy="75" r="4.2" />
      <circle className="hub-dot" cx="75" cy="75" r="1.5" />

      {/* Home column ki taraf jaane wale teer */}
      {ARROWS.map((a) => (
        <polygon key={a.k} className={`arrow ${on(a.k) ? 'ar-' + COLORS[a.k] : 'ar-idle'}`} points={a.pts} />
      ))}

      {/* Safe cells par star */}
      {[0, 8, 13, 21, 26, 34, 39, 47].map((i) => {
        const [c, r] = PATH[i];
        const isStart = i % 13 === 0;
        return (
          <polygon
            key={`s${i}`}
            className={`star ${isStart && on(i / 13) ? 'w' : ''}`}
            points={starPoints(c * 10 + 5, r * 10 + 5)}
          />
        );
      })}
    </g>
  );
});

// Goti kahan dikhegi (x, y) aur kitni badi (s). Ek cell par kai goti ho to thoda faila dete hain.
function layoutTokens(tokens, active) {
  const items = [];
  const groups = {};
  active.forEach((k) => {
    let fin = 0;
    for (let ti = 0; ti < 4; ti++) {
      const p = tokens[k][ti];
      let x;
      let y;
      let s = 1;
      let key = null;
      if (p === -1) {
        x = YARD[k][0] + SPOTS[ti][0];
        y = YARD[k][1] + SPOTS[ti][1];
      } else if (p === 56) {
        // Home pahunchi goti apne tikon mein chhoti hokar baith jaati hai
        const along = 68 + fin * 4.6;
        if (k === 0) { x = 65; y = along; }
        else if (k === 1) { x = along; y = 65; }
        else if (k === 2) { x = 85; y = along; }
        else { x = along; y = 85; }
        s = 0.55;
        fin += 1;
      } else {
        const [c, r] = cellOf(k, p);
        x = c * 10 + 5;
        y = r * 10 + 5;
        key = `${c},${r}`;
        (groups[key] = groups[key] || []).push(items.length);
      }
      items.push({ k, ti, x, y, s });
    }
  });
  const offs = [
    [], [],
    [[-1.9, 0], [1.9, 0]],
    [[-2, -1.6], [2, -1.6], [0, 2.1]],
    [[-2, -2], [2, -2], [-2, 2], [2, 2]],
  ];
  Object.values(groups).forEach((idx) => {
    const n = Math.min(idx.length, 4);
    if (n < 2) return;
    idx.forEach((it, j) => {
      const o = offs[n][j % n];
      items[it].x += o[0];
      items[it].y += o[1];
      items[it].s = 0.82;
    });
  });
  return items;
}

export default function Board({ tokens, active, movable, onToken, turnColor }) {
  const items = layoutTokens(tokens, active);
  return (
    <svg id="board" viewBox="0 0 150 150" role="img" aria-label="Ludo board">
      <Defs />
      <StaticBoard activeKey={active.join(',')} />

      {/* Jiski baari hai uske yard ke chaaron taraf chamakti hui line */}
      {turnColor !== null && turnColor !== undefined && (
        <rect
          className={`yard-glow g-${COLORS[turnColor]}`}
          x={YARD[turnColor][0] + 1.2}
          y={YARD[turnColor][1] + 1.2}
          width="57.6"
          height="57.6"
          rx="3"
        />
      )}

      <g>
        {items.map((it) => {
          const can = movable.color === it.k && movable.set.has(it.ti);
          return (
            <g
              key={`${it.k}-${it.ti}`}
              className={`token t-${COLORS[it.k]}${can ? ' movable' : ''}`}
              style={{ transform: `translate(${it.x}px, ${it.y}px) scale(${it.s})` }}
              role="button"
              tabIndex={can ? 0 : -1}
              aria-label={`${COLOR_NAME[it.k]} token ${it.ti + 1}${can ? ', press to move' : ''}`}
              onClick={() => can && onToken(it.k, it.ti)}
              onKeyDown={(e) => {
                if (can && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onToken(it.k, it.ti);
                }
              }}
            >
              <circle className="halo" r="5.8" />
              <ellipse className="tshadow" cx="0.5" cy="2.7" rx="3.5" ry="1.4" />
              <circle className="body" r="3.8" fill={`url(#tok-${COLORS[it.k]})`} />
              <circle className="inner" r="2" />
              <circle className="shine" cx="-1.3" cy="-1.5" r="1" />
              <circle className="hit" r="6" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
