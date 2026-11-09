# Spending Diary mark

The split receipt represents one bill shared fairly. The two halves have equal
visual weight, with a clear central gap and receipt teeth that survive small sizes.

`logo.svg` is the editable source for the app tile. Its burnt orange and ivory
match the light theme's primary and primary-foreground tokens. `mark.svg` is the
transparent orange symbol for standalone use. Keep both halves together.

Run `node scripts/generate-brand-assets.mjs` from the repository root to regenerate
the favicon (16, 32 and 48px), 192/512px install icons, full-background maskable icon,
180px Apple icon and transparent monochrome notification badge. The script uses
Next.js's installed Sharp dependency. Maskable artwork fits inside the central
80% safe circle; the background extends to every edge.

The shared BrandIcon component uses an empty alt because the adjacent brand name
provides its accessible label. A standalone interactive logo must have an
accessible name on its containing link.
