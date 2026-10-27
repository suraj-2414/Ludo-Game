// Teen tarah ke session hain. Teeno ka interface ek jaisa hai (roll, move, close, myColor):
//
//  1. createLocalSession  -> sab log ek hi device par khelte hain
//  2. createHostSession   -> room banane wala. Game ka engine isi ke browser mein chalta hai
//  3. createGuestSession  -> room join karne wala. Ye sirf state dekhta hai aur requests bhejta hai
//
// Online ke liye PeerJS use hua hai (browser se browser direct WebRTC connection).
// Beech mein koi apna server nahi hai. PeerJS ka free public server sirf shuru mein dono browser
// ko ek dusre se milata hai, uske baad data seedha dono ke beech jaata hai.
//
// Lobby ka data ("lobby"):
//   { count: 2 | 4, seats: [ { id, kind: 'host'|'remote'|'bot'|'open', name, color: 0..3 | null } ] }
// Har seat par baitha player apna color khud chun sakta hai. Ek color do log ko nahi mil sakta.

import Peer from 'peerjs';
import { Engine } from '../game/engine.js';
import { COLOR_PREF } from '../game/logic.js';

const PREFIX = 'apnaludo-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0/O aur 1/I jaise confusing akshar nahi

const genCode = () =>
  Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
const clone = (x) => JSON.parse(JSON.stringify(x));
const cleanName = (n) => String(n || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);

function errText(err) {
  const type = err && err.type;
  if (type === 'peer-unavailable') return 'Room not found. Check the code, or ask the host to keep the room open.';
  if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed')
    return 'Could not reach the internet or the PeerJS server. Please try again in a moment.';
  if (type === 'browser-incompatible') return 'This browser does not support online play.';
  return 'Connection problem' + (type ? ' (' + type + ')' : '') + '.';
}

// ---- lobby ke chhote helpers ----
const occupied = (s) => s.kind !== 'open';
const colorsInUse = (lobby, exceptSeat) =>
  new Set(lobby.seats.filter((s) => s.id !== exceptSeat && occupied(s) && s.color !== null).map((s) => s.color));

// Pehla color jo kisi ne nahi liya (pasand ke order mein)
function freeColor(lobby, count) {
  const used = colorsInUse(lobby, -1);
  const pref = COLOR_PREF[count] || COLOR_PREF[4];
  const k = pref.find((c) => !used.has(c));
  return k === undefined ? null : k;
}

// Do log ka naam ek jaisa ho to doosre ke aage "2" laga do
function uniqueName(lobby, seatId, wanted) {
  const taken = new Set(
    lobby.seats.filter((s) => s.id !== seatId && occupied(s)).map((s) => s.name.toLowerCase())
  );
  if (!taken.has(wanted.toLowerCase())) return wanted;
  for (let i = 2; i < 30; i++) {
    const n = `${wanted.slice(0, 11)} ${i}`;
    if (!taken.has(n.toLowerCase())) return n;
  }
  return wanted;
}

// ---------------------------------------------------------------------------
// 1. Local
// ---------------------------------------------------------------------------
export function createLocalSession({ players, onState, speed = 1 }) {
  let engine = null;
  const begin = () => {
    engine = new Engine({ players, onChange: onState, speed });
    engine.start();
  };
  begin();
  const turnColor = () => engine.state.players[engine.state.turn].color;
  return {
    kind: 'local',
    myColor: null, // null matlab is device par jiski baari ho wahi khel sakta hai
    roll: () => engine.roll(turnColor()),
    move: (ti) => engine.move(turnColor(), ti),
    restart() {
      engine.destroy();
      begin();
    },
    close: () => engine && engine.destroy(),
  };
}

// ---------------------------------------------------------------------------
// 2. Host (room banane wala)
// ---------------------------------------------------------------------------
export function createHostSession({ name, count, onLobby, onState, onStatus, speed = 1 }) {
  const lobby = {
    count,
    seats: Array.from({ length: count }, (_, id) => ({ id, kind: 'open', name: '', color: null })),
  };
  lobby.seats[0] = { id: 0, kind: 'host', name: cleanName(name) || 'Host', color: COLOR_PREF[count][0] };

  const conns = new Map(); // seat id -> DataConnection
  let engine = null;
  let started = false;
  let closed = false;
  let peer = null;
  let code = '';

  const sendAll = (msg) => conns.forEach((cn) => cn.open && cn.send(msg));
  const pushLobby = () => {
    const l = clone(lobby);
    onLobby(l);
    sendAll({ t: 'lobby', lobby: l });
  };

  // Seat ka color badlo (sirf tab jab koi aur wo color na le chuka ho)
  function setSeatColor(id, color) {
    const seat = lobby.seats[id];
    if (started || !seat || !occupied(seat)) return false;
    if (!Number.isInteger(color) || color < 0 || color > 3) return false;
    if (colorsInUse(lobby, id).has(color)) return false;
    seat.color = color;
    pushLobby();
    return true;
  }
  function setSeatName(id, raw) {
    const seat = lobby.seats[id];
    if (started || !seat || !occupied(seat) || seat.kind === 'bot') return false;
    const wanted = cleanName(raw);
    if (!wanted) return false;
    seat.name = uniqueName(lobby, id, wanted);
    pushLobby();
    return true;
  }

  function openPeer(attempt) {
    code = genCode();
    peer = new Peer(PREFIX + code);

    peer.on('open', () => {
      onStatus({ ready: true, code });
      pushLobby();
    });

    peer.on('error', (err) => {
      if (closed) return;
      if (err.type === 'unavailable-id' && attempt < 4) {
        // Ye code kisi aur ne le rakha hai, naya code try karo.
        peer.destroy();
        openPeer(attempt + 1);
      } else {
        onStatus({ error: errText(err) });
      }
    });

    peer.on('connection', (conn) => {
      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;

        // Naya dost join karna chahta hai
        if (msg.t === 'hello') {
          if (conn._seat !== undefined) return;
          if (started) {
            conn.send({ t: 'full', why: 'The game has already started.' });
            setTimeout(() => conn.close(), 300);
            return;
          }
          const seat = lobby.seats.find((s) => s.kind === 'open');
          if (!seat) {
            conn.send({ t: 'full', why: 'The room is full.' });
            setTimeout(() => conn.close(), 300);
            return;
          }
          seat.kind = 'remote';
          seat.color = freeColor(lobby, count);
          seat.name = uniqueName(lobby, seat.id, cleanName(msg.name) || `Player ${seat.id + 1}`);
          conn._seat = seat.id;
          conns.set(seat.id, conn);
          conn.send({ t: 'welcome', seat: seat.id });
          pushLobby();
          return;
        }

        // Baaki sab requests ek seat se judi hoti hain. Seat connection se pata chalti hai, message se nahi,
        // taaki koi dusre ki seat ya baari par kuch na kar sake.
        const id = conn._seat;
        if (id === undefined) return;

        if (msg.t === 'color') setSeatColor(id, msg.color);
        else if (msg.t === 'name') setSeatName(id, msg.name);
        else if (engine) {
          const color = lobby.seats[id].color;
          if (msg.t === 'roll') engine.roll(color);
          else if (msg.t === 'move' && Number.isInteger(msg.ti)) engine.move(color, msg.ti);
        }
      });

      conn.on('close', () => {
        const id = conn._seat;
        if (id === undefined || conns.get(id) !== conn) return;
        conns.delete(id);
        const seat = lobby.seats[id];
        if (started) {
          if (engine) engine.convertToBot(seat.color);
        } else {
          seat.kind = 'open';
          seat.name = '';
          seat.color = null;
          pushLobby();
        }
      });
    });
  }
  openPeer(0);

  return {
    kind: 'host',
    seatId: 0,
    get myColor() {
      return lobby.seats[0].color;
    },
    get code() {
      return code;
    },
    setName: (n) => setSeatName(0, n),
    setColor: (c) => setSeatColor(0, c),
    setSeatColor, // host bot ka color bhi badal sakta hai
    // Khali seat par computer lagao ya hatao
    setSeat(id, kind) {
      const seat = lobby.seats[id];
      if (started || !seat || (seat.kind !== 'open' && seat.kind !== 'bot')) return;
      if (kind === 'bot' && seat.kind === 'open') {
        const c = freeColor(lobby, count);
        if (c === null) return;
        seat.kind = 'bot';
        seat.name = 'Computer';
        seat.color = c;
      } else if (kind === 'open' && seat.kind === 'bot') {
        seat.kind = 'open';
        seat.name = '';
        seat.color = null;
      } else return;
      pushLobby();
    },
    start() {
      if (started) return;
      started = true;
      // Khali seat par computer khelta hai. Uska color bhi yahin chun lete hain (lobby ko badle bina).
      const used = colorsInUse(lobby, -1);
      const players = lobby.seats.map((s) => {
        if (s.kind === 'open') {
          const pref = COLOR_PREF[count];
          const color = pref.find((c) => !used.has(c));
          used.add(color);
          return { color, kind: 'bot', name: 'Computer' };
        }
        return {
          color: s.color,
          kind: s.kind === 'host' ? 'human' : s.kind === 'remote' ? 'remote' : 'bot',
          name: s.kind === 'bot' ? 'Computer' : s.name,
        };
      });
      engine = new Engine({
        players,
        speed,
        onChange: (st) => {
          onState(st);
          sendAll({ t: 'state', state: st });
        },
      });
      engine.start();
    },
    backToLobby() {
      if (engine) engine.destroy();
      engine = null;
      started = false;
      // Jo player beech mein chale gaye the unki seat khali karo
      lobby.seats.forEach((s) => {
        if (s.kind === 'remote' && !conns.has(s.id)) {
          s.kind = 'open';
          s.name = '';
          s.color = null;
        }
      });
      pushLobby();
    },
    roll: () => engine && engine.roll(lobby.seats[0].color),
    move: (ti) => engine && engine.move(lobby.seats[0].color, ti),
    close() {
      closed = true;
      if (engine) engine.destroy();
      try {
        peer && peer.destroy();
      } catch (e) {
        /* ignore */
      }
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Guest (room join karne wala)
// ---------------------------------------------------------------------------
export function createGuestSession({ code, name, onLobby, onState, onError, onClosed }) {
  const roomCode = String(code).trim().toUpperCase();
  let peer = null;
  let conn = null;
  let seat = null;
  let lobby = null;
  let welcomed = false;
  let closed = false;

  const fail = (msg) => {
    if (!closed) onError(msg);
  };
  const timer = setTimeout(() => {
    if (!welcomed) fail('Could not connect to the room. Check the code and make sure the host still has it open.');
  }, 15000);

  peer = new Peer();
  peer.on('error', (err) => fail(errText(err)));
  peer.on('open', () => {
    conn = peer.connect(PREFIX + roomCode, { reliable: true });
    conn.on('open', () => conn.send({ t: 'hello', name: cleanName(name) }));
    conn.on('data', (msg) => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'welcome') {
        welcomed = true;
        seat = msg.seat;
      } else if (msg.t === 'lobby') {
        lobby = msg.lobby;
        onLobby(msg.lobby);
      } else if (msg.t === 'state') onState(msg.state);
      else if (msg.t === 'full') fail(msg.why);
    });
    conn.on('close', () => {
      if (!closed && welcomed) onClosed();
    });
    conn.on('error', (err) => fail(errText(err)));
  });

  const send = (m) => conn && conn.open && conn.send(m);
  return {
    kind: 'guest',
    code: roomCode,
    get seatId() {
      return seat;
    },
    // Mera color lobby se pata chalta hai (host hi asli sach rakhta hai)
    get myColor() {
      return lobby && seat !== null && lobby.seats[seat] ? lobby.seats[seat].color : null;
    },
    setName: (n) => send({ t: 'name', name: n }),
    setColor: (c) => send({ t: 'color', color: c }),
    roll: () => send({ t: 'roll' }),
    move: (ti) => send({ t: 'move', ti }),
    close() {
      closed = true;
      clearTimeout(timer);
      try {
        peer && peer.destroy();
      } catch (e) {
        /* ignore */
      }
    },
  };
}
