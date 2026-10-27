import { useEffect, useRef, useState } from 'react';
import Menu from './components/Menu.jsx';
import Lobby from './components/Lobby.jsx';
import Game from './components/Game.jsx';
import { createLocalSession, createHostSession, createGuestSession } from './net/session.js';

// Link mein ?room=ABCDE ho to seedha join wali screen khulti hai.
const roomFromUrl = () => {
  try {
    const r = new URLSearchParams(window.location.search).get('room');
    return r ? r.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5) : '';
  } catch (e) {
    return '';
  }
};

// Logo: ek dice jisme chaaron player ke rang ke 4 pips hain
function Mark() {
  return (
    <svg className="mark" viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">
      <rect x="3" y="3" width="42" height="42" rx="12" className="mark-bg" />
      <circle cx="16" cy="16" r="5" className="m-red" />
      <circle cx="32" cy="16" r="5" className="m-green" />
      <circle cx="16" cy="32" r="5" className="m-yellow" />
      <circle cx="32" cy="32" r="5" className="m-blue" />
    </svg>
  );
}

export default function App() {
  const [screen, setScreen] = useState('menu'); // menu | lobby | game
  const [session, setSession] = useState(null);
  const [state, setState] = useState(null); // game ki taaza snapshot
  const [lobby, setLobby] = useState(null);
  const [status, setStatus] = useState({}); // host ke liye: { ready, code, error }
  const [notice, setNotice] = useState('');
  const ref = useRef(null);
  const [initialRoom] = useState(roomFromUrl);

  // Page band hone par ya session badalne par purana connection saaf karo
  useEffect(() => () => ref.current && ref.current.close(), []);

  const adopt = (s) => {
    if (ref.current) ref.current.close();
    ref.current = s;
    setSession(s);
  };

  const leave = (msg = '') => {
    if (ref.current) ref.current.close();
    ref.current = null;
    setSession(null);
    setState(null);
    setLobby(null);
    setStatus({});
    setNotice(msg);
    setScreen('menu');
  };

  const startLocal = (players) => {
    setNotice('');
    setScreen('game');
    adopt(createLocalSession({ players, onState: setState }));
  };

  // Lobby ka naya update aaya (ya game khatam hone ke baad host ne lobby khol di)
  const onLobby = (l) => {
    setLobby(l);
    setState(null);
    setScreen('lobby');
  };
  const onState = (st) => {
    setState(st);
    setScreen('game');
  };

  const startHost = ({ name, count }) => {
    setNotice('');
    setLobby(null);
    setStatus({});
    setScreen('lobby');
    adopt(createHostSession({ name, count, onLobby, onState, onStatus: setStatus }));
  };

  const startJoin = ({ name, code }) => {
    setNotice('');
    setLobby(null);
    setScreen('lobby');
    adopt(
      createGuestSession({
        code,
        name,
        onLobby,
        onState,
        onError: (m) => leave(m),
        onClosed: () => leave('Lost connection to the host. The room may have been closed.'),
      })
    );
    // Join hone ke baad URL se ?room hata do, taaki refresh par dobara wahi code na khule
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch (e) {
      /* koi baat nahi */
    }
  };

  const restart = () => {
    if (!session) return;
    if (session.kind === 'local') session.restart();
    else if (session.kind === 'host') session.backToLobby();
  };

  return (
    <div className="wrap">
      <header className="topbar">
        <Mark />
        <div>
          <h1>Apna Ludo</h1>
          <p className="sub">Play with friends or against the computer. 2 or 4 players.</p>
        </div>
      </header>

      {screen === 'menu' && (
        <Menu onLocal={startLocal} onHost={startHost} onJoin={startJoin} notice={notice} initialRoom={initialRoom} />
      )}
      {screen === 'lobby' && session && (
        <Lobby session={session} lobby={lobby} status={status} onLeave={() => leave()} />
      )}
      {screen === 'game' && session && state && (
        <Game
          session={session}
          state={state}
          roomCode={session.kind === 'host' ? status.code : session.kind === 'guest' ? session.code : ''}
          onLeave={() => leave()}
          onRestart={restart}
        />
      )}
    </div>
  );
}
