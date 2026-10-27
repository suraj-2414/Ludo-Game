import { useState } from 'react';
import { COLOR_NAME } from '../game/logic.js';
import Avatar from './Avatar.jsx';
import ColorPicker from './ColorPicker.jsx';

export default function Lobby({ session, lobby, status, onLeave }) {
  const [copied, setCopied] = useState('');
  const isHost = session.kind === 'host';
  const code = isHost ? status.code : session.code;
  const link = code ? `${window.location.origin}${window.location.pathname}?room=${code}` : '';

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 1800);
    } catch (e) {
      setCopied('');
    }
  };

  // Room abhi ban raha ho ya error aaya ho
  if (isHost && status.error) {
    return (
      <div className="home">
        <div className="card">
          <div className="notice flat" role="alert">{status.error}</div>
          <div className="block">
            <button type="button" className="btn block" onClick={onLeave}>Back</button>
          </div>
        </div>
      </div>
    );
  }
  if (!lobby) {
    return (
      <div className="home">
        <div className="card">
          <div className="block">
            <h2 className="step">{isHost ? 'Creating room...' : 'Connecting to room...'}</h2>
            <p className="hint">This can take a few seconds.</p>
          </div>
          <div className="block">
            <button type="button" className="btn ghost small" onClick={onLeave}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  const myId = session.seatId;
  // Kis rang ko kis ne le rakha hai
  const takenBy = {};
  lobby.seats.forEach((s) => {
    if (s.kind !== 'open' && s.color !== null) takenBy[s.color] = s.name;
  });
  const filled = lobby.seats.filter((s) => s.kind !== 'open').length;
  const openSeats = lobby.count - filled;

  const roleOf = (s) => {
    if (s.kind === 'host') return s.id === myId ? 'Host, you' : 'Host';
    if (s.kind === 'bot') return 'Computer';
    return s.id === myId ? 'You' : 'Player';
  };

  return (
    <div className="home">
      <div className="card">
        {isHost && (
          <div className="block">
            <h2 className="step">Room code</h2>
            <div className="ticket">
              <div className="ticket-code" aria-label={`Room code ${(code || '').split('').join(' ')}`}>{code}</div>
              <div className="btnrow center">
                <button type="button" className="btn small" onClick={() => copy(link, 'link')}>
                  {copied === 'link' ? 'Link copied' : 'Copy invite link'}
                </button>
                <button type="button" className="btn ghost small" onClick={() => copy(code, 'code')}>
                  {copied === 'code' ? 'Code copied' : 'Copy code'}
                </button>
              </div>
            </div>
            <p className="hint">Send the link to your friends. They type their name, join, and pick a color. The room stays open while you keep this page open.</p>
          </div>
        )}

        {!isHost && (
          <div className="block">
            <p className="eyebrow">Room</p>
            <div className="mini-code">{code}</div>
          </div>
        )}

        <div className="block">
          <h2 className="step">
            Players <span className="count">{filled} of {lobby.count}</span>
          </h2>
          <div className="seatlist">
            {lobby.seats.map((s) => {
              const mine = s.id === myId;
              const open = s.kind === 'open';
              const editColor = !open && (mine || (isHost && s.kind === 'bot'));
              return (
                <div
                  className={`seatcard${open ? ' open' : ''}${mine ? ' me' : ''}`}
                  key={s.id}
                  style={!open ? { '--me': `var(--${['red', 'green', 'blue', 'yellow'][s.color]})` } : undefined}
                >
                  <Avatar color={open ? null : s.color} name={s.name} bot={s.kind === 'bot'} />
                  <div className="seat-main">
                    {open ? (
                      <div className="seat-name muted">Waiting for a player...</div>
                    ) : mine ? (
                      <input
                        key={s.name}
                        id="my-name"
                        className="field slim"
                        aria-label="Your name"
                        defaultValue={s.name}
                        maxLength={14}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== s.name) session.setName(v);
                          else e.target.value = s.name;
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      />
                    ) : (
                      <div className="seat-name">{s.name}</div>
                    )}
                    {!open && (
                      <div className="seat-sub">
                        <span className="role">{roleOf(s)}</span>
                        {!editColor && <span className="role-dot">{COLOR_NAME[s.color]}</span>}
                      </div>
                    )}
                    {editColor && (
                      <ColorPicker
                        value={s.color}
                        takenBy={takenBy}
                        label={mine ? 'Your color' : `Color for ${s.name}`}
                        onPick={(k) => (mine ? session.setColor(k) : session.setSeatColor(s.id, k))}
                      />
                    )}
                  </div>
                  {isHost && open && (
                    <button type="button" className="btn ghost small" onClick={() => session.setSeat(s.id, 'bot')}>
                      Add computer
                    </button>
                  )}
                  {isHost && s.kind === 'bot' && (
                    <button type="button" className="btn ghost small" onClick={() => session.setSeat(s.id, 'open')}>
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="block">
          {isHost ? (
            <>
              <button type="button" className="btn block" onClick={() => session.start()}>
                Start game
              </button>
              <p className="hint">
                {openSeats > 0
                  ? `${openSeats} empty ${openSeats === 1 ? 'seat' : 'seats'} will be played by the computer.`
                  : 'Everyone is in. Start when you are ready.'}
              </p>
            </>
          ) : (
            <p className="hint waiting">Waiting for the host to start. You can change your name and color until then.</p>
          )}
          <div className="btnrow" style={{ marginTop: 10 }}>
            <button type="button" className="btn ghost small" onClick={onLeave}>
              {isHost ? 'Close room' : 'Leave room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
