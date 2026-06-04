# LeapFi — logo & brand assets (rotated-F)

The mark is a **capital F rotated 90° counter-clockwise**: the spine + top arm become a rounded, hand-drawn green **"L" form** (which also nods to LeapFi's *L*), and the F's middle bar becomes a **floating flat orange dot**. The dot sits at the **golden section** of the bottom bar (left : right ≈ φ : 1), and the form's proportion is golden too (bar ≈ φ × prong height). Wordmark is set in **Arial Rounded MT Bold** to match the rounded, playful mark.

## Palette

| Role | Dark theme | Light theme |
|------|-----------|-------------|
| Green (mark) | `#2BF6A0 → #00A85C` | `#00B765 → #008F4E` |
| Orange dot | `#F7931A` | `#F7931A` |
| Wordmark "Leap" | `#F5F5F5` | `#0B0E13` |
| Wordmark "Fi" | `#00DB7C` | `#00A85C` |
| Tile / background | `#161D27 → #06080C` | `#FFFFFF → #EAEEF3` |

Font: **Arial Rounded MT Bold** (rendered into the PNGs; SVGs reference it with `ui-rounded, system-ui` fallback).

## Structure

- `src/` — editable master SVGs (`mark`, `lockup`, `tile`, `apple`, `maskable`, `og` × dark/light; `favicon.svg` is light/dark adaptive).
- `dist/dark/` & `dist/light/` — rendered PNGs per theme.
- `dist/shared/` — `favicon.svg` (adaptive) + `favicon.ico` (16/32/48).
- `build.py` — regenerate everything: `python3 build.py` (needs Google Chrome + Pillow).

## Uses (each in `dist/dark/` and `dist/light/`)

| File | Use |
|------|-----|
| `logomark.svg`, `logomark-512…32.png` | the icon alone (sidebar, buttons, anywhere) |
| `lockup.svg`, `lockup.png`, `lockup@2x.png` | horizontal mark + "LeapFi" wordmark |
| `icon.svg`, `icon-512.png`, `icon-192.png` | rounded app-icon tile (PWA / stores) |
| `icon-maskable-512.png` | PWA maskable icon (safe-zone) |
| `apple-touch-icon-180.png` | iOS home-screen icon |
| `favicon-16/32/48.png` | raster favicons |
| `og-image.png` (1200×630) | social / OpenGraph card |
| `dist/shared/favicon.svg` + `favicon.ico` | primary favicon (SVG adaptive + ico fallback) |

## Shipped into the app

This **dark** set is the live app's identity (the app is dark-themed). Mapping:

| brand file | app path(s) |
|---|---|
| `dist/shared/favicon.svg` | `app/icon.svg`, `public/favicon.svg` |
| `dist/shared/favicon.ico` | `app/favicon.ico` |
| `dist/dark/apple-touch-icon-180.png` | `app/apple-icon.png`, `public/apple-touch-icon.png` |
| `dist/dark/logomark.svg` | `public/logo.svg` (sidebar) |
| `dist/dark/icon-192.png` · `icon-512.png` · `icon-maskable-512.png` | `public/` (same names; referenced by `public/site.webmanifest`) |
| `dist/dark/favicon-16.png` · `favicon-32.png` | `public/` (same names) |
| `dist/dark/og-image.png` | `public/og-image.png` |

To update an icon: edit `src/`, run `python3 build.py`, then copy the changed file(s) to the path(s) above. The OG/Twitter absolute URL is built from `metadataBase` in `app/layout.tsx` (`NEXT_PUBLIC_SITE_URL` → falls back to the netlify preview origin).

The **light** set is not wired in (the app is dark-only) but is kept for any light-surface use.
