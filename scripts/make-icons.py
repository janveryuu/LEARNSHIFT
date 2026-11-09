"""Draws the LearnShift app icons (Tarsi's face) at every size the app needs."""
from PIL import Image, ImageDraw

FUR, DEEP, CREAM, EAR = '#A8714A', '#7A4C2E', '#F3E2C8', '#E9B7A0'
IRIS, PUPIL, BG = '#E9A23B', '#1E140D', '#FDF1E2'
S = 2048


def face(d, scale=1.0, ox=0, oy=0, mono=None):
    def E(cx, cy, rx, ry, fill):
        cx, cy, rx, ry = ox + cx * scale, oy + cy * scale, rx * scale, ry * scale
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=mono or fill)
    E(600, 640, 310, 300, FUR)
    E(1448, 640, 310, 300, FUR)
    if not mono:
        E(600, 660, 190, 180, EAR)
        E(1448, 660, 190, 180, EAR)
    E(1024, 1150, 640, 580, FUR)
    if mono:
        return
    E(1024, 1290, 470, 380, CREAM)
    for x in (780, 1268):
        E(x, 1110, 262, 262, DEEP)
        E(x, 1110, 222, 222, IRIS)
        E(x, 1120, 118, 118, PUPIL)
        E(x - 62, 1055, 48, 48, '#FFFFFF')
        E(x + 52, 1170, 20, 20, '#FFFFFF')
    E(1024, 1405, 60, 40, DEEP)
    cx, cy = ox + 1024 * scale, oy + 1440 * scale
    d.arc([cx - 90 * scale, cy - 40 * scale, cx + 90 * scale, cy + 70 * scale], 20, 160, fill=DEEP, width=int(18 * scale))


def render(size, bg, scale, mono=None, out=None, shift=0):
    im = Image.new('RGBA', (S, S), bg)
    d = ImageDraw.Draw(im)
    off = (S - S * scale) / 2
    face(d, scale, off, off + shift, mono)
    im = im.resize((size, size), Image.LANCZOS)
    im.save(out)


render(1024, BG, 0.86, out='assets/images/icon.png', shift=40)
# Android adaptive: keep the face inside the central safe zone.
render(512, (0, 0, 0, 0), 0.6, out='assets/images/android-icon-foreground.png', shift=30)
Image.new('RGBA', (512, 512), BG).save('assets/images/android-icon-background.png')
render(512, (0, 0, 0, 0), 0.6, mono='#FFFFFF', out='assets/images/android-icon-monochrome.png', shift=30)
render(96, (0, 0, 0, 0), 0.9, mono='#FFFFFF', out='assets/images/notification-icon.png', shift=40)
render(512, (0, 0, 0, 0), 0.92, out='assets/images/splash-icon.png', shift=20)
render(48, BG, 0.9, out='assets/images/favicon.png', shift=40)
print('icons written')
