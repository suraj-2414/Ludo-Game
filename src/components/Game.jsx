import Board from './Board.jsx';
import Dice from './Dice.jsx';
import Avatar from './Avatar.jsx';
import { COLORS, COLOR_NAME } from '../game/logic.js';
import { MAX_TRIES } from '../game/engine.js';

// Log mein {c2} likha ho to use Blue (rang ke saath) bana do.
function LogLine({ text }) {
  return text.split(/\{c(\d)\}/).map((part, i) =>
    i % 2 === 1 ? (
      <b key={i} className={`c-${COLORS[+part]}`}>
        {COLOR_NAME[+part]}
      </b>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// Jeetne par girne wale rang-birange tukde. Position index se tay hoti hai, random nahi, taaki re-render par na badle.
function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 30 }, (_, i) => (
        <i
          key={i}
          style={{
            '--x': `${(i * 37 + 11) % 100}%`,
            '--d': `${(i % 8) * 0.16}s`,
            '--t': `${2.6 + (i % 5) * 0.4}s`,
            '--c': `var(--${COLORS[i % 4]})`,
            '--r': `${(i * 53) % 360}deg`,
          }}
        />
      ))}
    </div>
  );
}

export default function Game({ session, state, onLeave, onRestart, roomCode }) {
  const cur = state.players[state.turn];
  const my = session.myColor; // null ho to local game hai
  const mine = my === null || cur.color === my;
  const over = state.phase === 'over';
  const canAct = cur.kind !== 'bot' && mine && !over;
  const active = state.players.map((p) => p.color);

  // Kin goti par tap kar sakte hain
  const set = new Set();
  if (canAct && state.phase === 'pick') {
    const t = state.tokens[cur.color];
    state.moves.forEach((ti) => set.add(ti));
    if (state.moves.some((ti) => t[ti] === -1)) t.forEach((p, ti) => p === -1 && set.add(ti));
  }

  const playerName = (p) => (my !== null && p.color === my ? 'You' : p.name);
  const youTurn = my !== null && cur.color === my;
  const winner = over ? state.players.find((p) => p.color === state.winner) : null;
  const youWon = winner && my !== null && winner.color === my;

  const title = over
    ? youWon
      ? 'You win!'
      : `${winner.name} wins!`
    : youTurn
      ? 'Your turn'
      : `${cur.name}'s turn`;

  // Dice ghoomte waqt koi message nahi dikhate (hint khali rehta hai)
  let hint = '';
  if (over) hint = 'Game over.';
  else if (state.phase === 'roll') {
    if (state.tries > 0) hint = `No 6 yet. Try ${state.tries + 1} of ${MAX_TRIES}.`;
    else hint = canAct ? 'Roll the dice.' : cur.kind === 'bot' ? 'The computer will roll.' : `${cur.name} will roll.`;
  } else if (state.phase === 'pick') hint = canAct ? 'Tap a glowing token.' : `${cur.name} is choosing a token.`;
  else if (state.phase === 'anim') hint = 'Moving...';

  const canRoll = canAct && state.phase === 'roll';
  let label = 'Roll dice';
  if (!canRoll) {
    if (state.phase === 'pick' && canAct) label = 'Pick a token';
    else if (state.phase === 'roll') label = cur.kind === 'bot' ? "Computer's turn" : `${cur.name}'s turn`;
    else if (state.phase !== 'rolling') label = 'Wait...';
  }

  const stat = (color) => {
    const st = state.stats && state.stats[color];
    if (!st || !st.rolls) return 'No rolls yet';
    return `Avg roll ${(st.sum / st.rolls).toFixed(1)} · 6s: ${st.sixes}`;
  };

  return (
    <main className="game">
      <section className="boardwrap">
        <Board
          tokens={state.tokens}
          active={active}
          turnColor={over ? null : cur.color}
          movable={{ color: cur.color, set }}
          onToken={(color, ti) => session.move(ti)}
        />

        {over && (
          <div className="winner" role="dialog" aria-label="Game over">
            <Confetti />
            <div className="winner-card" style={{ '--me': `var(--${COLORS[winner.color]})` }}>
              <Avatar color={winner.color} name={winner.name} bot={winner.kind === 'bot'} />
              <p className="eyebrow">{COLOR_NAME[winner.color]} wins</p>
              <h2>{youWon ? 'You win!' : `${winner.name} wins!`}</h2>
              <p className="hint">All four tokens reached home.</p>
              <div className="btnrow center">
                {session.kind === 'local' && (
                  <button type="button" className="btn" onClick={onRestart}>Play again</button>
                )}
                {session.kind === 'host' && (
                  <button type="button" className="btn" onClick={onRestart}>Back to lobby</button>
                )}
                <button type="button" className="btn ghost" onClick={onLeave}>
                  {session.kind === 'local' ? 'Menu' : 'Leave room'}
                </button>
              </div>
              {session.kind === 'guest' && <p className="hint">The host decides when to play again.</p>}
            </div>
          </div>
        )}
      </section>

      <aside
        className="panel"
        style={{ '--turn': `var(--${COLORS[cur.color]})`, '--on-turn': `var(--on-${COLORS[cur.color]})` }}
      >
        <div className="sec">
          <div className="turn">
            <Avatar color={cur.color} name={cur.name} bot={cur.kind === 'bot'} />
            <div className="turn-text">
              <h2>{title}</h2>
              <p className="hint">{hint}</p>
            </div>
          </div>
        </div>

        <div className="sec">
          <Dice value={state.roll} rollId={state.rollId} canRoll={canRoll} onRoll={() => canRoll && session.roll()} />
          {!over && (
            <button type="button" className="go" disabled={!canRoll} onClick={() => session.roll()}>
              {label}
            </button>
          )}
        </div>

        <div className="sec">
          <div className="score">
            {state.players.map((p) => {
              const home = state.tokens[p.color].filter((x) => x === 56).length;
              return (
                <div className={`row${p.color === cur.color && !over ? ' now' : ''}`} key={p.color} style={{ '--me': `var(--${COLORS[p.color]})` }}>
                  <Avatar color={p.color} name={p.name} bot={p.kind === 'bot'} small />
                  <span className="who">
                    <span className="nm">{playerName(p)}</span>
                    <span className="luck">{stat(p.color)}</span>
                  </span>
                  <span className="pips" aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                      <i key={i} className={i < home ? 'f' : ''} />
                    ))}
                  </span>
                  <span className="cnt">{home}/4</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sec">
          <ul className="log" aria-live="polite">
            {state.log.map((l, i) => (
              <li key={i}>
                <LogLine text={l} />
              </li>
            ))}
          </ul>
        </div>

        <div className="sec">
          <div className="btnrow">
            <button type="button" className="btn ghost small" onClick={onLeave}>
              {session.kind === 'local' ? 'Menu' : 'Leave room'}
            </button>
            {roomCode && <span className="muted small-t">Room {roomCode}</span>}
          </div>
          <details>
            <summary>Rules</summary>
            <ul>
              <li>A token leaves home only when you roll a 6.</li>
              <li>If all your tokens are at home you get 3 tries to roll a 6.</li>
              <li>Rolling a 6, capturing a token or getting a token home gives you another roll.</li>
              <li>Three 6s in a row and you lose the turn.</li>
              <li>Star squares and colored start squares are safe. Tokens cannot be captured there.</li>
              <li>You need the exact number to reach home. If the roll is too high, that token cannot move.</li>
              <li>Every player gets an equally balanced set of dice numbers, so luck evens out over time.</li>
              <li>The first player to bring all four tokens home wins.</li>
            </ul>
          </details>
        </div>
      </aside>
    </main>
  );
}
