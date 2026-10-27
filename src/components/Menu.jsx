import { useState } from 'react';
import { COLOR_PREF } from '../game/logic.js';
import Avatar from './Avatar.jsx';
import ColorPicker from './ColorPicker.jsx';

const store = {
  get() {
    try {
      return localStorage.getItem('ludo-name') || '';
    } catch (e) {
      return '';
    }
  },
  set(v) {
    try {
      localStorage.setItem('ludo-name', v);
    } catch (e) {
      /* private window mein save nahi hoga, koi baat nahi */
    }
  },
};

function Seg({ label, options, value, onChange }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

// "Is device par" khelne ke 4 seats ka shuruaati set-up. Pehli seat insaan, baaki computer.
const initSeats = (count, firstName) =>
  [0, 1, 2, 3].map((i) => ({
    kind: i === 0 ? 'human' : 'bot',
    name: i === 0 ? firstName : '',
    color: COLOR_PREF[count][i],
  }));

export default function Menu({ onLocal, onHost, onJoin, notice, initialRoom }) {
  const [where, setWhere] = useState(initialRoom ? 'online' : 'local');
  const [count, setCount] = useState(2);
  // Invite link se aaye ho to naam khali rakhte hain, taaki dost apna naam khud likhe (host ka purana naam na dikhe).
  const [name, setName] = useState(() => (initialRoom ? '' : store.get()));
  const [code, setCode] = useState(initialRoom || '');
  const [seats, setSeats] = useState(() => initSeats(2, store.get()));

  const cleanCode = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const cleanedName = name.trim();

  const changeCount = (c) => {
    setCount(c);
    setSeats((ss) => ss.map((s, i) => ({ ...s, color: COLOR_PREF[c][i] })));
  };

  const patchSeat = (i, patch) => setSeats((ss) => ss.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  // Local mein koi bhi color chuno. Agar wo kisi aur seat ke paas hai to dono ke color aapas mein badal jaate hain.
  const pickLocalColor = (i, k) =>
    setSeats((ss) => {
      const owner = ss.findIndex((s, j) => j !== i && j < count && s.color === k);
      return ss.map((s, j) => {
        if (j === i) return { ...s, color: k };
        if (j === owner) return { ...s, color: ss[i].color };
        return s;
      });
    });

  const startLocal = () => {
    const players = seats.slice(0, count).map((s, i) => ({
      color: s.color,
      kind: s.kind,
      name: s.kind === 'bot' ? 'Computer' : s.name.trim() || `Player ${i + 1}`,
    }));
    const first = seats[0].name.trim();
    if (first) store.set(first);
    onLocal(players);
  };

  const onNameChange = (v) => {
    setName(v);
    if (v.trim()) store.set(v.trim());
  };

  return (
    <div className="home">
      {notice && (
        <div className="notice" role="alert">
          {notice}
        </div>
      )}

      <div className="card">
        {!initialRoom && (
          <div className="tabs" role="tablist" aria-label="How do you want to play?">
            <button type="button" role="tab" aria-selected={where === 'local'} className="tab" onClick={() => setWhere('local')}>
              <span className="tab-t">Play here</span>
              <span className="tab-s">Same device</span>
            </button>
            <button type="button" role="tab" aria-selected={where === 'online'} className="tab" onClick={() => setWhere('online')}>
              <span className="tab-t">Play online</span>
              <span className="tab-s">Friends on their own devices</span>
            </button>
          </div>
        )}

        {where === 'local' && !initialRoom && (
          <>
            <div className="block">
              <h2 className="step">Players</h2>
              <Seg
                label="Number of players"
                value={count}
                onChange={changeCount}
                options={[
                  [2, '2 players'],
                  [4, '4 players'],
                ]}
              />
            </div>

            <div className="block">
              <h2 className="step">Who is playing?</h2>
              <div className="seatlist">
                {seats.slice(0, count).map((s, i) => {
                  const bot = s.kind === 'bot';
                  return (
                    <div className="seatcard" key={i}>
                      <Avatar color={s.color} name={s.name || `Player ${i + 1}`} bot={bot} />
                      <div className="seat-main">
                        {bot ? (
                          <div className="seat-name">Computer</div>
                        ) : (
                          <input
                            id={`lname-${i}`}
                            className="field slim"
                            aria-label={`Player ${i + 1} name`}
                            value={s.name}
                            maxLength={14}
                            placeholder={`Player ${i + 1}`}
                            onChange={(e) => patchSeat(i, { name: e.target.value })}
                          />
                        )}
                        <ColorPicker
                          value={s.color}
                          label={`Color for player ${i + 1}`}
                          onPick={(k) => pickLocalColor(i, k)}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => patchSeat(i, { kind: bot ? 'human' : 'bot' })}
                      >
                        {bot ? 'Computer' : 'Human'}
                      </button>
                    </div>
                  );
                })}
              </div>
              <p className="hint">Tap Human or Computer to switch. Pick a color already taken and the two players swap colors.</p>
            </div>

            <div className="block">
              <button type="button" className="btn block" onClick={startLocal}>
                Start game
              </button>
            </div>
          </>
        )}

        {where === 'online' && (
          <>
            {initialRoom && (
              <div className="block invite">
                <p className="eyebrow">You are invited</p>
                <h2 className="invite-t">
                  Join room <span className="mono">{cleanCode || initialRoom}</span>
                </h2>
              </div>
            )}

            <div className="block">
              <label className="step" htmlFor="pname">
                Your name
              </label>
              <input
                id="pname"
                className="field"
                value={name}
                maxLength={14}
                placeholder="Type your name"
                autoComplete="nickname"
                autoFocus={Boolean(initialRoom)}
                onChange={(e) => onNameChange(e.target.value)}
              />
              <p className="hint">Everyone in the room sees this name. You can pick your color on the next screen.</p>
            </div>

            {!initialRoom && (
              <div className="block">
                <h2 className="step">Create a room</h2>
                <Seg
                  label="Number of players in the room"
                  value={count}
                  onChange={setCount}
                  options={[
                    [2, '2 players'],
                    [4, '4 players'],
                  ]}
                />
                <p className="hint">You get a room code and a link to send to your friends.</p>
                <button
                  type="button"
                  className="btn block"
                  disabled={!cleanedName}
                  onClick={() => onHost({ name: cleanedName, count })}
                >
                  Create room
                </button>
              </div>
            )}

            <div className="block">
              <label className="step" htmlFor="rcode">
                {initialRoom ? 'Room code' : 'Or join a friend’s room'}
              </label>
              <div className="joinrow">
                <input
                  id="rcode"
                  className="field code"
                  value={code}
                  maxLength={5}
                  placeholder="ABCDE"
                  autoCapitalize="characters"
                  onChange={(e) => setCode(e.target.value)}
                />
                <button
                  type="button"
                  className="btn"
                  disabled={cleanCode.length !== 5 || !cleanedName}
                  onClick={() => onJoin({ name: cleanedName, code: cleanCode })}
                >
                  Join
                </button>
              </div>
              {!cleanedName && <p className="hint">Type your name above to continue.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
