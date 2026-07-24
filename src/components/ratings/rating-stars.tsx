import { useState } from "react";
import { Star } from "lucide-react";

const STARS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function RatingStars({
  value,
  onChange,
  onHover,
  size = 22,
  readOnly = false,
  ariaLabel,
}: {
  value: number;
  onChange?: (n: number) => void;
  onHover?: (n: number) => void;
  size?: number;
  readOnly?: boolean;
  ariaLabel?: string;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value || 0;

  if (readOnly) {
    return (
      <div
        className="inline-flex items-center gap-[2px]"
        role="img"
        aria-label={ariaLabel ?? `${value} out of 10`}
      >
        {STARS.map((n) => (
          <Star
            key={n}
            size={size}
            fill={n <= value ? "currentColor" : "none"}
            className={n <= value ? "text-ink" : "text-ink-subtle/25"}
          />
        ))}
      </div>
    );
  }

  const set = (n: number) => {
    setHover(n);
    onHover?.(n);
  };

  return (
    <div
      className="inline-flex items-center"
      role="slider"
      aria-label={ariaLabel ?? "Your rating"}
      aria-valuemin={0}
      aria-valuemax={10}
      aria-valuenow={value}
      onMouseLeave={() => set(0)}
    >
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} / 10`}
          className="flex items-center justify-center rounded-md p-1 outline-none transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.28] focus-visible:scale-[1.28] active:scale-90 motion-reduce:transition-none motion-reduce:hover:scale-100"
          onMouseEnter={() => set(n)}
          onFocus={() => set(n)}
          onBlur={() => set(0)}
          onClick={() => onChange?.(n)}
        >
          <Star
            size={size}
            fill={n <= active ? "currentColor" : "none"}
            className={`transition-colors duration-150 ${
              n <= active ? "text-ink" : "text-ink-subtle/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
