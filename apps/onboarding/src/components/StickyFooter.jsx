import { COLORS } from "../theme/colors";

export default function StickyFooter({ children }) {
  return (
    <div
      className="safe-bottom"
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 5,
        paddingTop: 24,
        paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))",
        paddingLeft: 24,
        paddingRight: 24,
        marginLeft: -24,
        marginRight: -24,
        background: `linear-gradient(to top, ${COLORS.bg} 60%, ${COLORS.bg}EE 80%, transparent 100%)`,
      }}
    >
      {children}
    </div>
  );
}
