import { useEffect, useRef } from 'react';

// Asli dice jaisa 3D cube. Phenkne par:
//   1. poora dice hawa mein uchhalta hai, gir kar do baar tappa khata hai (toss animation)
//   2. saath mein teeno axis par ghoomta hai aur sahi number wali face upar rukti hai
//   3. neeche uska parchhai (shadow) chhota-bada hota rehta hai
// Animation Web Animations API (element.animate) se hoti hai, taaki bina dobara banaye har baar chal sake.

// Real dice mein saamne wale aur piche wale face ka jod 7 hota hai (1-6, 2-5, 3-4).
// Har number ko saamne laane ke liye cube ko [rotateX, rotateY] itna ghumana padta hai:
const FACE_ROT = {
  1: [0, 0],
  6: [0, 180],
  2: [0, -90],
  5: [0, 90],
  3: [-90, 0],
  4: [90, 0],
};

// 3x3 grid mein pips (bindi) kahan hongi
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const DURATION = 1200;

const rot = (x, y, z) => `rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`;
const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Face({ n }) {
  return (
    <span className={`face face-${n}`}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={PIPS[n].includes(i) ? 'pip on' : 'pip'} />
      ))}
    </span>
  );
}

export default function Dice({ value, rollId, canRoll, onRoll }) {
  const cube = useRef(null);
  const toss = useRef(null);
  const shadow = useRef(null);
  const angle = useRef({ x: 0, y: 0 }); // cube ka abhi ka angle (360 ke multiples ke saath)
  const seenRoll = useRef(null);

  useEffect(() => {
    const el = cube.current;
    if (!el) return;
    const [bx, by] = FACE_ROT[value || 5];
    const first = seenRoll.current === null;
    const changed = !first && seenRoll.current !== rollId;
    seenRoll.current = rollId;

    // Pehli baar ya jab animation nahi chalani: seedha sahi face dikha do.
    if (!changed || !value || reduced()) {
      angle.current = { x: bx, y: by };
      el.style.transform = rot(bx, by, 0);
      return;
    }

    // Naya angle hamesha pichle se bada rakhte hain, taaki dice aage hi ghoome (peeche nahi).
    const cur = angle.current;
    const kx = Math.ceil((cur.x - bx) / 360) + 2 + Math.floor(Math.random() * 2);
    const ky = Math.ceil((cur.y - by) / 360) + 2 + Math.floor(Math.random() * 2);
    const to = { x: bx + 360 * kx, y: by + 360 * ky };
    const z = 360 * (1 + Math.floor(Math.random() * 2));

    el.style.transform = rot(to.x, to.y, 0);
    el.animate(
      [{ transform: rot(cur.x, cur.y, 0) }, { transform: rot(to.x, to.y, z) }],
      { duration: DURATION, easing: 'cubic-bezier(.2,.75,.25,1)' }
    );
    angle.current = to;

    // Uchhal: upar jao, gir kar tappa khao, phir chhota tappa, phir ruk jao.
    // Har keyframe ka easing us se aage wale hisse par lagta hai (upar jaate waqt ease-out, girte waqt ease-in).
    if (toss.current) {
      toss.current.animate(
        [
          { transform: 'translate(-36px,0) scale(1)', offset: 0, easing: 'ease-out' },
          { transform: 'translate(-20px,-62px) scale(1.18)', offset: 0.3, easing: 'ease-in' },
          { transform: 'translate(-8px,0) scale(1)', offset: 0.58, easing: 'ease-out' },
          { transform: 'translate(-3px,-22px) scale(1.06)', offset: 0.74, easing: 'ease-in' },
          { transform: 'translate(0,0) scale(1)', offset: 0.88, easing: 'ease-out' },
          { transform: 'translate(0,-6px) scale(1.02)', offset: 0.94, easing: 'ease-in' },
          { transform: 'translate(0,0) scale(1)', offset: 1 },
        ],
        { duration: DURATION }
      );
    }
    // Parchhai: dice upar ho to chhoti aur halki, zameen par ho to bari aur gehri.
    if (shadow.current) {
      shadow.current.animate(
        [
          { transform: 'translateX(-36px) scale(1)', opacity: 0.4, offset: 0, easing: 'ease-out' },
          { transform: 'translateX(-20px) scale(.55)', opacity: 0.12, offset: 0.3, easing: 'ease-in' },
          { transform: 'translateX(-8px) scale(1)', opacity: 0.4, offset: 0.58, easing: 'ease-out' },
          { transform: 'translateX(-3px) scale(.8)', opacity: 0.25, offset: 0.74, easing: 'ease-in' },
          { transform: 'translateX(0) scale(1)', opacity: 0.4, offset: 0.88, easing: 'ease-out' },
          { transform: 'translateX(0) scale(.95)', opacity: 0.35, offset: 0.94, easing: 'ease-in' },
          { transform: 'translateX(0) scale(1)', opacity: 0.4, offset: 1 },
        ],
        { duration: DURATION }
      );
    }
  }, [rollId, value]);

  return (
    <button
      type="button"
      className="tray"
      onClick={onRoll}
      disabled={!canRoll}
      aria-label={value ? `Dice shows ${value}.${canRoll ? ' Press to roll again.' : ''}` : 'Press to roll the dice'}
    >
      <span className="stage">
        <span className="shadow" ref={shadow} />
        <span className="toss" ref={toss}>
          <span className="scene">
            <span className="tilt">
              <span className="cube" ref={cube}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <Face key={n} n={n} />
                ))}
              </span>
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
