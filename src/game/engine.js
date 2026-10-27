// Game ka state machine. Ek hi jagah (local device ya online room ka host) chalta hai.
// Baaki log sirf state ki snapshot dekhte hain aur "roll" / "move" ki request bhejte hain.
//
// state.phase:
//   'roll'    -> current player ko dice phenkna hai
//   'rolling' -> dice ghoom raha hai (animation chal rahi hai)
//   'pick'    -> player ko goti chunni hai (state.moves mein options hain)
//   'anim'    -> goti chal rahi hai
//   'over'    -> game khatam

import { COLORS, legalMoves, resolveMove, chooseMove, newTokens } from './logic.js';
import { FairDice } from './dice.js';

export const ROLL_MS = 1300; // dice animation ka time. UI ki animation 1200ms ki hai.
export const MAX_TRIES = 3; // jab saari goti ghar mein hon to 6 laane ke liye itni koshish milti hain

// Log mein {c2} likha hoga to UI use color ke naam (Blue) mein badal degi.
const c = (color) => `{c${color}}`;

export class Engine {
  // players: [{ color, kind: 'human' | 'remote' | 'bot', name }]
  // Baari board ke color-order (Red, Green, Blue, Yellow) mein chalti hai, chahe kisi ne koi bhi color chuna ho.
  constructor({ players, onChange, speed = 1, dice }) {
    this.onChange = onChange;
    this.speed = speed; // test mein chhota number dekar jaldi chalate hain
    this.dice = dice || new FairDice();
    this.dead = false;
    const sorted = players.map((p) => ({ ...p })).sort((a, b) => a.color - b.color);
    const stats = {};
    sorted.forEach((p) => {
      stats[p.color] = { rolls: 0, sum: 0, sixes: 0 };
    });
    this.state = {
      players: sorted,
      tokens: newTokens(),
      turn: 0,
      roll: null,
      rollId: 0,
      sixes: 0, // lagatar kitne 6 aaye (teen par baari jaati hai)
      tries: 0, // saari goti ghar mein ho to kitni koshish ho chuki
      phase: 'roll',
      moves: [],
      winner: null,
      log: [],
      stats, // har player ke rolls: kitne, kul jod, kitne 6. UI mein "luck" dikhane ke liye
    };
  }

  start() {
    this.say(`Game started. ${c(this.state.players[0].color)} goes first.`);
    this.emit();
    this.maybeAuto();
  }

  destroy() {
    this.dead = true;
  }

  // ---------- helpers ----------
  emit() {
    if (this.dead) return;
    this.onChange(JSON.parse(JSON.stringify(this.state)));
  }

  say(msg) {
    this.state.log.unshift(msg);
    if (this.state.log.length > 6) this.state.log.pop();
  }

  wait(ms) {
    // Agar engine band ho gaya to ye promise kabhi poora nahi hota, isliye aage ka code nahi chalta.
    return new Promise((res) => {
      setTimeout(() => {
        if (!this.dead) res();
      }, ms * this.speed);
    });
  }

  get current() {
    return this.state.players[this.state.turn];
  }

  // ---------- bahar se aane wali requests ----------
  roll(color) {
    const s = this.state;
    if (this.dead || s.phase !== 'roll') return false;
    if (this.current.color !== color || this.current.kind === 'bot') return false;
    this.doRoll();
    return true;
  }

  move(color, ti) {
    const s = this.state;
    if (this.dead || s.phase !== 'pick') return false;
    if (this.current.color !== color || this.current.kind === 'bot') return false;
    const t = s.tokens[color];
    const ok = s.moves.includes(ti) || (t[ti] === -1 && s.moves.some((m) => t[m] === -1));
    if (!ok) return false;
    this.applyMove(color, ti, s.roll);
    return true;
  }

  // Koi online player chala gaya to uski jagah computer khelega.
  convertToBot(color) {
    const s = this.state;
    const p = s.players.find((x) => x.color === color);
    if (!p || p.kind === 'bot') return;
    p.kind = 'bot';
    p.name = 'Computer';
    this.say(`${c(color)} left the game. The computer takes over.`);
    this.emit();
    if (s.phase === 'over' || this.current.color !== color) return;
    if (s.phase === 'roll') {
      this.maybeAuto();
    } else if (s.phase === 'pick') {
      this.wait(600).then(() => {
        if (s.phase === 'pick' && this.current.color === color) {
          this.applyMove(color, chooseMove(s.tokens, color, s.moves, s.roll), s.roll);
        }
      });
    }
  }

  // ---------- turn ka flow ----------
  maybeAuto() {
    const s = this.state;
    if (s.phase !== 'roll' || this.current.kind !== 'bot') return;
    this.wait(800).then(() => {
      if (s.phase === 'roll' && this.current.kind === 'bot') this.doRoll();
    });
  }

  nextTurn() {
    const s = this.state;
    s.turn = (s.turn + 1) % s.players.length;
    s.sixes = 0;
    s.tries = 0;
    s.phase = 'roll';
    s.moves = [];
    this.emit();
    this.maybeAuto();
  }

  async doRoll() {
    const s = this.state;
    const cur = this.current;
    const color = cur.color;
    // Number is player ke apne shuffled bag se aata hai (dice.js dekho).
    const roll = this.dice.next(color);

    // Number pehle hi chun lete hain, UI usi par dice ko ghuma kar rokti hai.
    s.phase = 'rolling';
    s.roll = roll;
    s.rollId += 1;
    s.moves = [];
    this.emit();
    await this.wait(ROLL_MS);

    const st = s.stats[color];
    st.rolls += 1;
    st.sum += roll;
    if (roll === 6) st.sixes += 1;

    s.sixes = roll === 6 ? s.sixes + 1 : 0;
    this.say(`${c(color)} rolled a ${roll}.`);

    if (s.sixes === 3) {
      this.say('Three 6s in a row. Turn skipped.');
      this.emit();
      await this.wait(900);
      return this.nextTurn();
    }

    const moves = legalMoves(s.tokens, color, roll);
    if (!moves.length) {
      // Saari goti ghar mein hon to 6 laane ke liye 3 koshish milti hain (asli Ludo ka rule).
      // Isse aise player ki baari bekaar nahi jaati jise shuru mein 6 nahi mila.
      const allInYard = s.tokens[color].every((p) => p === -1);
      if (allInYard && s.tries < MAX_TRIES - 1) {
        s.tries += 1;
        this.say(`No 6. Try ${s.tries + 1} of ${MAX_TRIES}.`);
        s.phase = 'roll';
        s.moves = [];
        this.emit();
        this.maybeAuto();
        return;
      }
      this.say('No token can move.');
      this.emit();
      await this.wait(900);
      return this.nextTurn();
    }

    s.moves = moves;
    s.phase = 'pick';
    this.emit();

    if (cur.kind === 'bot') {
      await this.wait(600);
      return this.applyMove(color, chooseMove(s.tokens, color, moves, roll), roll);
    }
    if (moves.length === 1) {
      // Sirf ek hi option hai to khud chal dete hain.
      await this.wait(500);
      if (s.phase === 'pick') return this.applyMove(color, moves[0], roll);
    }
  }

  async applyMove(color, ti, roll) {
    const s = this.state;
    if (s.phase !== 'pick') return;
    s.phase = 'anim';
    s.moves = [];
    s.tries = 0;

    const res = resolveMove(s.tokens, color, ti, roll);
    if (res.from === -1) {
      s.tokens[color][ti] = 0;
      this.say(`${c(color)} brought a token out.`);
      this.emit();
      await this.wait(260);
    } else {
      this.emit();
      for (let p = res.from + 1; p <= res.to; p++) {
        s.tokens[color][ti] = p;
        this.emit();
        await this.wait(150);
      }
    }

    s.tokens = res.tokens;
    const victims = [...new Set(res.captured.map((x) => x.color))];
    victims.forEach((v) => this.say(`${c(v)}'s token was captured!`));
    if (res.reachedHome) this.say(`${c(color)} got a token home.`);

    if (res.won) {
      s.phase = 'over';
      s.winner = color;
      this.say(`${c(color)} wins!`);
      this.emit();
      return;
    }

    const extra = roll === 6 || res.captured.length > 0 || res.reachedHome;
    if (extra) {
      this.say(`${c(color)} rolls again.`);
      s.phase = 'roll';
      this.emit();
      this.maybeAuto();
    } else {
      this.nextTurn();
    }
  }
}

export { COLORS };
