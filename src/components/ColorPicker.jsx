import { COLORS, COLOR_NAME } from '../game/logic.js';

// Chaar rang ke gole. Chuna hua rang tick wala dikhta hai.
// takenBy: { rang: "kis ne liya" }. Jo rang kisi aur ne le liya ho wo dabaya nahi ja sakta.
export default function ColorPicker({ value, takenBy = {}, onPick, label, disabled = false }) {
  return (
    <div className="swatches" role="radiogroup" aria-label={label}>
      {COLORS.map((name, k) => {
        const selected = value === k;
        const owner = takenBy[k];
        const taken = owner !== undefined && !selected;
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`swatch s-${name}${selected ? ' on' : ''}`}
            disabled={disabled || taken}
            title={taken ? `${COLOR_NAME[k]} (taken by ${owner})` : COLOR_NAME[k]}
            aria-label={taken ? `${COLOR_NAME[k]}, taken by ${owner}` : COLOR_NAME[k]}
            onClick={() => !selected && onPick(k)}
          >
            {selected && (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
