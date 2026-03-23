import { COLORS } from "../theme/colors";
import TopBar from "./TopBar";

export default function PageLayout({ children, bg }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: bg || COLORS.bg,
        padding: "0 0 40px 0",
      }}
    >
      <TopBar />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "28px 24px 0" }}>
        {children}
      </div>
    </div>
  );
}
