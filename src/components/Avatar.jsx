import { COLORS } from '../game/logic.js';

// Player ke color ka gola, usme naam ka pehla akshar. Computer ke liye chhota robot-chip ka icon.
export default function Avatar({ color, name, bot = false, small = false }) {
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <span className={`avatar a-${color === null || color === undefined ? 'none' : COLORS[color]}${small ? ' small' : ''}`} aria-hidden="true">
      {bot ? (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="8" width="16" height="11" rx="3.5" />
          <path d="M12 8V4.5" />
          <circle cx="12" cy="3.6" r="1" fill="currentColor" />
          <circle cx="9" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="15" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      ) : (
        letter
      )}
    </span>
  );
}
