import { chips as defaultChips } from "../../../data/games";

export default function BetBar({
  bet,
  setBet,
  chips = defaultChips,
  formatLabel,
}: {
  bet: number;
  setBet: (n: number) => void;
  chips?: number[];
  formatLabel?: (n: number) => string;
}) {
  return (
    <div className="chip-row">
      {chips.map((n) => (
        <button
          key={n}
          className={`chip-btn ${bet === n ? "selected" : ""} chip-c${n}`}
          onClick={() => setBet(n)}
        >
          {formatLabel ? formatLabel(n) : `${n / 1000}K`}
        </button>
      ))}
    </div>
  );
}