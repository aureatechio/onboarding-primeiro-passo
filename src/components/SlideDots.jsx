import { COLORS } from "../theme/colors";

export default function SlideDots({ total, current, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect?.(i)}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            border: "none",
            cursor: "pointer",
            background:
              i === current
                ? COLORS.red
                : i < current
                  ? COLORS.success
                  : COLORS.border,
            transition: "all 0.3s ease",
          }}
        />
      ))}
    </div>
  );
}
