/** Logo branco transparente da marca (topbar). Asset em `public/logo_acelerai_white_transp.png`. */
const LOGO_SRC = "/logo_acelerai_white_transp.png";

export default function TopBarLogo({ height = 22, maxWidth = 140, style: styleProp }) {
  return (
    <img
      src={LOGO_SRC}
      alt="Acelerai"
      style={{
        height,
        width: "auto",
        maxWidth,
        display: "block",
        objectFit: "contain",
        ...styleProp,
      }}
    />
  );
}
