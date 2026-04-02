import { COLORS } from "../theme/colors";

export default function SlideDots({ total, current, onSelect }) {
  return (
    <div
      role="tablist"
      aria-label="Navegacao entre slides"
      style={{ display: "flex", gap: 6, marginBottom: 20 }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          role="tab"
          aria-selected={i === current}
          aria-label={`Slide ${i + 1} de ${total}`}
          onClick={() => onSelect?.(i)}
          style={{
            flex: 1,
            border: "none",
            padding: "14px 0",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              height: 4,
              borderRadius: 2,
              background:
                i === current
                  ? COLORS.red
                  : i < current
                    ? COLORS.success
                    : COLORS.border,
              transition: "all 0.3s ease",
            }}
          />
        </button>
      ))}
    </div>
  );
}
