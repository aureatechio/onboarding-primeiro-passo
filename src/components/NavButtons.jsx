import { COLORS } from "../theme/colors";
import Icon from "./Icon";

export default function NavButtons({
  onPrev,
  onNext,
  nextLabel = "Próximo",
  prevLabel = "Anterior",
  nextDisabled = false,
  nextVariant = "red",
}) {
  const bgColor = nextVariant === "warning" ? COLORS.warning : COLORS.red;
  const bgGradient =
    nextVariant === "warning"
      ? `linear-gradient(135deg, #B8960A, ${COLORS.warning})`
      : `linear-gradient(135deg, ${COLORS.redGradientStart}, ${COLORS.red})`;
  const textColor = nextVariant === "warning" ? COLORS.bg : COLORS.text;

  const handleNext = () => {
    if (!nextDisabled && onNext) {
      onNext();
    }
  };

  return (
    <div style={{ display: "flex", gap: 12 }}>
      {onPrev && (
        <button
          type="button"
          onClick={onPrev}
          style={{
            flex: 1,
            padding: 14,
            borderRadius: 10,
            border: `1px solid ${COLORS.border}`,
            background: COLORS.card,
            color: COLORS.textMuted,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Icon name="arrowLeft" size={16} color={COLORS.textMuted} />
            {prevLabel}
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={handleNext}
        style={{
          flex: 2,
          padding: 14,
          borderRadius: 10,
          border: "none",
          background: nextDisabled ? COLORS.border : bgGradient,
          color: nextDisabled ? COLORS.textDim : textColor,
          fontSize: 14,
          fontWeight: nextDisabled ? 700 : 800,
          cursor: nextDisabled ? "not-allowed" : "pointer",
          boxShadow: nextDisabled ? "none" : `0 4px 16px ${bgColor}25`,
          transition: "all 0.3s ease",
          letterSpacing: "0.01em",
          opacity: nextDisabled ? 0.6 : 1,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {nextLabel}
          <Icon
            name="arrowRight"
            size={16}
            color={nextDisabled ? COLORS.textDim : textColor}
          />
        </span>
      </button>
    </div>
  );
}
