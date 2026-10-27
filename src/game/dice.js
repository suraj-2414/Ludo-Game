// Fair dice.
//
// Seedha Math.random() har baar alag se number deta hai. Wo statistically theek hai, par isme ek player ko
// lagatar 5-6 aur doosre ko lagatar 1-2 aa jaana mumkin hai. Isi se "sirf usi ke achhe number aate hain" jaisa lagta hai.
//
// Yahan har player ka apna "bag" hai: 12 parchi, 1 se 6 tak har number 2 baar. Bag ko shuffle karke ek-ek parchi
// nikalte hain (nikli hui parchi wapas nahi jaati). Jab bag khatam, naya shuffle hota hai.
// Matlab har player ko har 12 rolls mein bilkul 2 baar 6, 2 baar 5, ... milta hai. Dono ki kismat barabar rehti hai,
// aur number phir bhi pehle se andaza lagane layak nahi hote.
//
// Randomness ke liye browser ka crypto.getRandomValues use hota hai (Math.random se behtar).

const FACES = [1, 2, 3, 4, 5, 6];

// 0 se n-1 ke beech ek barabar-sambhavna wala number. Modulo bias hatane ke liye rejection sampling use ki hai.
function randInt(n, rng) {
  if (rng) return Math.floor(rng() * n);
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (c && c.getRandomValues) {
    const limit = Math.floor(0x100000000 / n) * n;
    const buf = new Uint32Array(1);
    do {
      c.getRandomValues(buf);
    } while (buf[0] >= limit);
    return buf[0] % n;
  }
  return Math.floor(Math.random() * n);
}

export class FairDice {
  // copies: ek bag mein har number kitni baar (2 matlab bag mein 12 parchi)
  constructor({ copies = 2, rng } = {}) {
    this.copies = copies;
    this.rng = rng;
    this.bags = new Map(); // player ka color -> bacha hua bag
  }

  fill() {
    const bag = [];
    for (let i = 0; i < this.copies; i++) bag.push(...FACES);
    // Fisher-Yates shuffle
    for (let i = bag.length - 1; i > 0; i--) {
      const j = randInt(i + 1, this.rng);
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
  }

  // key: player ka color (har player ka alag bag)
  next(key) {
    let bag = this.bags.get(key);
    if (!bag || bag.length === 0) {
      bag = this.fill();
      this.bags.set(key, bag);
    }
    return bag.pop();
  }
}
