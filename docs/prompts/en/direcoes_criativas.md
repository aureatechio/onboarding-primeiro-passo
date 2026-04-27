
## Model we'll use
gemini-3-pro-image-preview

## Context used to generate the images
The Nano Banana prompt is composed of:

1) Celebrity PNG
2) Client logo PNG
3) Color palette
4) Product, environment, or element image (optional)
5) Dynamic prompt with client data
6) Global Rules!

## Group table
| Category    | 🖤 Modern                                  | 🤍 Clean                                       | 🟡 Retail                                      |
|-------------|--------------------------------------------|------------------------------------------------|------------------------------------------------|
| Background  | Black / dark                               | Pure white                                     | Solid brand color                              |
| Celebrity   | Hero at 70–80% of frame, cinematic         | Clean photo floating on white, right side      | Standing cut-out, right side, breaks the frame |
| Layout      | Asymmetric, photo dominates, text at base  | Editorial 30/70 split with text column         | Hard geometric, blocks and badges              |
| Typography  | Ultra-bold condensed, impactful            | Light/regular serif or sans, generous spacing  | All-caps condensed, maximum contrast           |
| Reference   | Nike / movie poster                        | Vogue / Apple ad                               | Casas Bahia / Magazine Luiza                   |

## Prompts by category

Each prompt assumes the model has already received the celebrity PNG, logo, palette, and (optional) product/environment image, plus the client's dynamic prompt.

### 🖤 Modern — `direction_moderna`

```
Style: modern cinematic poster, editorial energy in the style of Nike / movie key-art.

BACKGROUND
- Solid black or very dark tone derived from the brand palette (prefer #0A0A0A to #1A1A1A).
- Subtle radial gradient behind the celebrity for depth; no noisy textures.
- Dramatic directional lighting (rim light), preserving high contrast.

CELEBRITY
- The figure is the absolute hero: occupies 70–80% of the frame's height.
- Cinematic framing, clean PNG cutout, no distortion of proportions.
- Positioned slightly off-center (rule of thirds), firm gaze toward the viewer or three-quarters.
- Soft shadow projected at the base to integrate with the scene.

LAYOUT
- Asymmetric composition: the photo dominates the vertical axis; the text block lives at the base or lower side.
- Discreet client logo, at the top or footer, in a monochromatic version that respects the dark background.
- Product/environment image (if provided) enters as a small secondary element, integrated into the lower block.

TYPOGRAPHY
- Ultra-bold condensed sans-serif (Druk, Anton, Bebas Neue Bold style), in uppercase.
- Short, impactful headline; optional subtitle in a much smaller regular weight.
- Pure white or a single accent color extracted from the brand palette.
- Aggressive hierarchy: giant headline, tiny support text.

PALETTE
- Base: black/dark.
- Accents: 1 color from the brand palette as a punctual highlight in typography or graphic detail.
- Avoid more than two accent colors.

ATMOSPHERE / REFERENCE
- Inspiration: Nike campaigns, A24 movie posters, sports launch key visuals.
- Finish: cinematic, high contrast, with optional light film grain.

PROHIBITIONS
- No generic stock photos, no clip-art, no white frame around the celebrity.
- No multiple visual focal points — only the celebrity commands.
```

### 🤍 Clean — `direction_clean`

```
Style: minimalist premium editorial, Vogue / Apple ad energy.

BACKGROUND
- Pure white (#FFFFFF) or very subtle off-white (#FAFAFA) across the entire composition.
- No textures, no gradients, no background shadows.
- Negative space is the protagonist: generous breathing room on all edges.

CELEBRITY
- Clean PNG cutout floating over white, with no visible background or base.
- Positioned to the right of the frame, occupying approximately 50–60% of the height.
- Very soft, diffuse shadow (editorial drop shadow), never hard.
- Half-body or full-body framing, natural and elegant posture.

LAYOUT
- Editorial 30/70 split: left column dedicated to text (30%), right area for the celebrity (70%).
- Small client logo, top-left or bottom, in light weight.
- Product/environment image (if provided) enters subtly, aligned with the base of the text column.
- Strict grid alignment; wide, consistent margins.

TYPOGRAPHY
- Elegant serif (Tiempos, Canela, Söhne style) or light sans (Inter Light, Helvetica Neue Light).
- Weights: light or regular; never bold.
- Medium-sized headline with slightly open tracking.
- Short supporting copy, in small body, with excellent legibility.
- Color: pure black or graphite gray (#111 to #333).

PALETTE
- Base: white.
- Text: black/graphite.
- Brand color appears with extreme parsimony: a detail (thin line, dot, badge) or only on the logo.

ATMOSPHERE / REFERENCE
- Inspiration: Vogue cover, Apple ad, COS campaign, Kinfolk editorial.
- Finish: silent, refined, premium, with no visual noise.

PROHIBITIONS
- No background colors, no decorative geometric shapes, no flashy badges.
- No bold or condensed typography.
- No elements competing for attention with the celebrity.
```

### 🟡 Retail — `direction_retail`

```
Style: high-impact retail campaign, Casas Bahia / Magazine Luiza / Mercado Livre Black Friday energy.

BACKGROUND
- Solid 100% saturated color extracted from the brand palette (the most vibrant primary color available).
- No complex gradients; a secondary palette color block may be used to divide areas.
- Flat, even lighting, no cinematic drama.

CELEBRITY
- Full-body cutout, standing, positioned on the right side of the frame.
- The figure "breaks the frame": part of the silhouette extends past the layout edges, creating dynamism.
- Hard, defined shadow at the base to anchor the celebrity to the plane.
- Confident posture, direct gesture (pointing, holding the product, thumbs up, or similar).

LAYOUT
- Hard geometric structure: rectangular color blocks, diagonal stripes, circular or star-shaped badges.
- Left side dedicated to offer/message; right side for the celebrity.
- Client logo prominent at the top, at a comfortable size.
- Product image (if provided) appears prominently in the center/left, with a hard shadow.
- Seals and badges ("OFFER", "EXCLUSIVE", percentage style) compose the scene with clear hierarchy.

TYPOGRAPHY
- Condensed sans-serif in uppercase (Impact, Anton, Oswald Bold, Bebas Neue).
- Giant headline, max weight, absolute contrast with the background.
- Two type colors: primary (white or yellow) + accent (complementary color from the palette).
- Numbers (prices, percentages) even larger than the headline, formatted as a headline.
- Occasional italics to reinforce urgency.

PALETTE
- Brand primary color as dominant background.
- White and black as support.
- One complementary color (typically yellow, red, or cyan) for highlights and badges.

ATMOSPHERE / REFERENCE
- Inspiration: Casas Bahia flyer, Magazine Luiza banner, Mercado Livre Black Friday campaign.
- Finish: high contrast, instant readability from 3 meters away, promotional energy.

PROHIBITIONS
- No pure white or pure black background (those belong to the other categories).
- No thin or serif typography.
- No minimalist composition: the frame must be densely filled, but with clear hierarchy.
```
