#!/usr/bin/env python3
"""Generate the full LeapFi (rotated-F) asset set, light + dark themes.
Headless Chrome for true-alpha vector rendering, Pillow for resampling + favicon.ico."""
import subprocess, tempfile, shutil, os, time
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC, DIST = os.path.join(ROOT, "src"), os.path.join(ROOT, "dist")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

def render(svg, w, h, out, tries=4):
    """Render SVG → transparent PNG. Short timeout + retry that kills any wedged
    headless Chrome (sequential launches occasionally hang in this environment)."""
    for attempt in range(tries):
        d = tempfile.mkdtemp(prefix="lf_")
        try:
            html = os.path.join(d, "p.html")
            with open(html, "w") as f:
                f.write(f'<!doctype html><html><head><meta charset=utf8>'
                        f'<style>html,body{{margin:0;background:transparent}}'
                        f'img{{display:block;width:{w}px;height:{h}px}}</style></head>'
                        f'<body><img src="file://{os.path.join(SRC, svg)}"></body></html>')
            subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                            "--force-device-scale-factor=1", "--default-background-color=00000000",
                            f"--window-size={w},{h}", f"--screenshot={out}", f"file://{html}"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True, timeout=30)
            im = Image.open(out).convert("RGBA")
            if im.size != (w, h):
                im.crop((0, 0, w, h)).save(out)
            return out
        except Exception as e:
            subprocess.run(["pkill", "-9", "-f", "headless=new"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(2)
            if attempt == tries - 1:
                raise RuntimeError(f"render failed for {svg}: {e}")
            print(f"    retry {svg} ({attempt+1})")
        finally:
            shutil.rmtree(d, ignore_errors=True)

def resize(src, size, out):
    Image.open(src).convert("RGBA").resize((size, size), Image.LANCZOS).save(out)

for sub in ("shared", "dark", "light"):
    os.makedirs(os.path.join(DIST, sub), exist_ok=True)

for theme in ("dark", "light"):
    d = os.path.join(DIST, theme)
    print(f"» {theme}")
    # logomark (transparent) — 512 master then downscale
    m512 = os.path.join(d, "logomark-512.png"); render(f"mark-{theme}.svg", 512, 512, m512)
    for s in (256, 128, 64, 32):
        resize(m512, s, os.path.join(d, f"logomark-{s}.png"))
    shutil.copy(os.path.join(SRC, f"mark-{theme}.svg"), os.path.join(d, "logomark.svg"))
    # favicon pngs (theme-specific) — derived from the 512 master
    for s in (48, 32, 16):
        resize(m512, s, os.path.join(d, f"favicon-{s}.png"))
    # wordmark lockup (transparent) @2x rendered, @1x derived
    l2x = os.path.join(d, "lockup@2x.png"); render(f"lockup-{theme}.svg", 720, 168, l2x)
    Image.open(l2x).convert("RGBA").resize((360, 84), Image.LANCZOS).save(os.path.join(d, "lockup.png"))
    shutil.copy(os.path.join(SRC, f"lockup-{theme}.svg"), os.path.join(d, "lockup.svg"))
    # app icon tile (rounded)
    t512 = os.path.join(d, "icon-512.png"); render(f"tile-{theme}.svg", 512, 512, t512)
    resize(t512, 192, os.path.join(d, "icon-192.png"))
    shutil.copy(os.path.join(SRC, f"tile-{theme}.svg"), os.path.join(d, "icon.svg"))
    # maskable + apple
    render(f"maskable-{theme}.svg", 512, 512, os.path.join(d, "icon-maskable-512.png"))
    ap = os.path.join(d, "_apple512.png"); render(f"apple-{theme}.svg", 512, 512, ap)
    resize(ap, 180, os.path.join(d, "apple-touch-icon-180.png")); os.remove(ap)
    # og
    render(f"og-{theme}.svg", 1200, 630, os.path.join(d, "og-image.png"))

# shared: adaptive favicon.svg + favicon.ico (from the adaptive default = light/deep-green, reads on both)
print("» shared")
shutil.copy(os.path.join(SRC, "favicon.svg"), os.path.join(DIST, "shared", "favicon.svg"))
ic = []
for s in (16, 32, 48):
    p = os.path.join(DIST, "shared", f"_f{s}.png"); render("favicon.svg", s, s, p)
    ic.append(Image.open(p).convert("RGBA"))
ico = os.path.join(DIST, "shared", "favicon.ico")
try:
    ic[2].save(ico, format="ICO", sizes=[(48,48),(32,32),(16,16)], append_images=[ic[1], ic[0]])
except Exception as e:
    print("  ico fallback:", e); ic[2].save(ico, format="ICO", sizes=[(16,16),(32,32),(48,48)])
for s in (16, 32, 48):
    os.remove(os.path.join(DIST, "shared", f"_f{s}.png"))

print("\n✓ dist:")
for sub in ("shared", "dark", "light"):
    for f in sorted(os.listdir(os.path.join(DIST, sub))):
        p = os.path.join(DIST, sub, f)
        try: dim = "x".join(map(str, Image.open(p).size))
        except Exception: dim = "-"
        print(f"  {sub}/{f:26} {dim:>9}")
