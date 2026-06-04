import subprocess, tempfile, shutil, os
from PIL import Image
SRC="src"; CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
def render(svg,w,h):
    d=tempfile.mkdtemp(); out=os.path.join(d,"o.png"); html=os.path.join(d,"p.html")
    open(html,"w").write(f'<!doctype html><html><head><meta charset=utf8><style>html,body{{margin:0;background:transparent}}img{{display:block;width:{w}px;height:{h}px}}</style></head><body><img src="file://{os.path.abspath(os.path.join(SRC,svg))}"></body></html>')
    subprocess.run([CH,"--headless=new","--disable-gpu","--hide-scrollbars","--force-device-scale-factor=1","--default-background-color=00000000",f"--window-size={w},{h}",f"--screenshot={out}",f"file://{html}"],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True,timeout=90)
    im=Image.open(out).convert("RGBA"); shutil.rmtree(d,ignore_errors=True); return im
def on(bg,im,box):
    c=Image.new("RGBA",(box[0],box[1]),bg); x=(box[0]-im.width)//2; y=(box[1]-im.height)//2; c.alpha_composite(im,(x,y)); return c
DK=(11,14,19,255); LT=(238,241,244,255)
cv=Image.new("RGBA",(1260,1180),(7,9,13,255))
# marks
cv.alpha_composite(on(DK,render("mark-dark.svg",150,150),(300,200)),(20,20))
cv.alpha_composite(on(LT,render("mark-light.svg",150,150),(300,200)),(340,20))
# lockups
cv.alpha_composite(on(DK,render("lockup-dark.svg",460,107),(600,200)),(660,20))
cv.alpha_composite(on(LT,render("lockup-light.svg",460,107),(600,200)),(20,240))
# tiles (opaque)
cv.alpha_composite(render("tile-dark.svg",200,200),(640,240))
cv.alpha_composite(render("tile-light.svg",200,200),(860,240))
cv.alpha_composite(render("maskable-dark.svg",200,200),(1050,240))
# og
cv.alpha_composite(render("og-dark.svg",600,315),(20,470))
cv.alpha_composite(render("og-light.svg",600,315),(640,470))
cv.alpha_composite(render("apple-dark.svg",180,180),(20,810))
cv.alpha_composite(render("apple-light.svg",180,180),(220,810))
cv.convert("RGB").save("/tmp/final_proof.png")
print("ok")
