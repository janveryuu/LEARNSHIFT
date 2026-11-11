"""Build all Paty layers and export as a TS module + preview sheet."""
import copy, json, sys
from PIL import Image

exec(open('base.py').read())  # defines W, H, PAL, g (unoutlined base)
PAL['M'] = '#7A3B24'   # mouth
PAL['m'] = '#D9574A'   # tongue
PAL['n'] = '#9AA3B5'   # metal
PAL['N'] = '#6B7385'   # metal dark
PAL['A'] = '#E2582B'   # accent (book cover)
PAL['L'] = '#7CC3F2'   # sweat drop
PAL['z'] = '#5B6B8C'   # sleep z

BASE = copy.deepcopy(g)

def outline(grid, protect=None):
    h, w = len(grid), len(grid[0])
    filled = [[grid[y][x] != '.' for x in range(w)] for y in range(h)]
    out = [row[:] for row in grid]
    for y in range(h):
        for x in range(w):
            if filled[y][x]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and filled[ny][nx]:
                    if protect is None or not protect(x, y):
                        out[y][x] = 'K'
                    break
    return out

def body(no_left=False, no_right=False):
    b = copy.deepcopy(BASE)
    for y in range(34, 39):
        if no_left:
            for x in (8, 9, 10):
                b[y][x] = '.'
            b[y][11] = 'v'
        else:
            b[y][11] = 'K'
        if no_right:
            for x in (25, 26, 27):
                b[y][x] = '.'
            b[y][24] = 'v'
        else:
            b[y][24] = 'K'
    return outline(b)

FULL = body()
NOL = body(no_left=True)
NOLR = body(no_left=True, no_right=True)

# Layers on an offset canvas (x from -8) so arms can leave the body box.
OX, LW = -8, W + 16

def layer(fn):
    grid = [['.'] * LW for _ in range(H)]
    fn(lambda x, y, ch: (0 <= x - OX < LW and 0 <= y < H) and grid[y].__setitem__(x - OX, ch))
    def protect(x, y):
        bx = x + OX
        return 0 <= bx < W and NOL[y][bx] in 'wvRrY'
    return outline(grid, protect)

def seg_d(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)))
    return ((px - ax - t * vx) ** 2 + (py - ay - t * vy) ** 2) ** .5

def arm(put, a, b, hand, mirror=False):
    for y in range(H):
        for x in range(OX, OX + LW):
            sx = 35 - x if mirror else x
            if seg_d(sx + .5, y + .5, *a, *b) <= 1.45:
                put(x, y, 'S')
            hx, hy, rx, ry = hand
            if ((sx + .5 - hx) / rx) ** 2 + ((y + .5 - hy) / ry) ** 2 <= 1:
                put(x, y, 'S')
    # sleeve cuff over the shoulder end
    for (cx, cy) in [(8, 30), (9, 30), (10, 30), (8, 31), (9, 31), (10, 31), (8, 32), (9, 32), (10, 32)]:
        put(35 - cx if mirror else cx, cy, 'w')

WAVE_A = layer(lambda p: arm(p, (9.5, 31), (3.5, 25.5), (1.6, 22.6, 2.5, 2.9)))
WAVE_B = layer(lambda p: arm(p, (9.5, 31), (5.2, 24.2), (4.0, 21.0, 2.5, 2.9)))
CHEER = layer(lambda p: (arm(p, (9.5, 31), (4.2, 23.5), (3.2, 20.2, 2.5, 2.9)),
                         arm(p, (9.5, 31), (4.2, 23.5), (3.2, 20.2, 2.5, 2.9), mirror=True)))

def book(put):
    for y in range(33, 41):
        for x in range(11, 25):
            put(x, y, 'w' if x != 17 and x != 18 else 'A')
    for x in range(11, 25):
        put(x, 40, 'A')
    for y in (35, 37):
        for x in list(range(13, 16)) + list(range(20, 23)):
            put(x, y, 'v')
BOOK = layer(book)

def pencil(put):
    pts = [(27, 39), (28, 38), (28, 37), (29, 36), (29, 35), (30, 34), (30, 33), (31, 32)]
    for (x, y) in pts:
        put(x, y, 'Y'); put(x + 1, y, 'Y')
    put(27, 40, 'b'); put(28, 40, 'b')
    put(31, 31, 'S'); put(32, 31, 'S'); put(32, 30, 'K')
PENCIL = layer(pencil)

def wrench(put):
    pts = [(8, 39), (7, 38), (7, 37), (6, 36), (6, 35), (5, 34), (5, 33)]
    for (x, y) in pts:
        put(x, y, 'n'); put(x + 1, y, 'N')
    for (x, y) in [(3, 31), (4, 31), (6, 31), (7, 31), (3, 32), (4, 32), (5, 32), (6, 32), (7, 32), (4, 30), (6, 30)]:
        put(x, y, 'n')
WRENCH = layer(wrench)

def rows(grid):
    return [''.join(r) for r in grid]

def to_runs(grid, ox=0):
    """Merge horizontal runs -> [x, y, w, colorKey]."""
    runs = []
    for y, r in enumerate(grid):
        x = 0
        while x < len(r):
            ch = r[x]
            if ch == '.':
                x += 1
                continue
            s = x
            while x < len(r) and r[x] == ch:
                x += 1
            runs.append([s + ox, y, x - s, ch])
    return runs

layers = {
    'full': to_runs(FULL), 'noL': to_runs(NOL), 'noLR': to_runs(NOLR),
    'waveA': to_runs(WAVE_A, OX), 'waveB': to_runs(WAVE_B, OX), 'cheer': to_runs(CHEER, OX),
    'book': to_runs(BOOK, OX), 'pencil': to_runs(PENCIL, OX), 'wrench': to_runs(WRENCH, OX),
}

# Preview sheet: full, waveA, waveB, cheer, book
def comp(base, over):
    im = [['.'] * LW for _ in range(H)]
    for y in range(H):
        for x in range(W):
            im[y][x - OX] = base[y][x]
    for o in over:
        for y in range(H):
            for x in range(LW):
                if o[y][x] != '.':
                    im[y][x] = o[y][x]
    return im

frames = [comp(FULL, []), comp(NOL, [WAVE_A]), comp(NOL, [WAVE_B]), comp(NOLR, [CHEER]), comp(FULL, [BOOK]),
          comp(FULL, [PENCIL, WRENCH])]
S = 8
sheet = Image.new('RGB', (LW * S * len(frames), H * S), '#FDF1E2')
px = sheet.load()
for i, f in enumerate(frames):
    for y in range(H):
        for x in range(LW):
            col = PAL.get(f[y][x])
            if not col:
                continue
            rgb = tuple(int(col[k:k + 2], 16) for k in (1, 3, 5))
            for yy in range(S):
                for xx in range(S):
                    px[(i * LW + x) * S + xx, y * S + yy] = rgb
sheet.save('sheet.png')

out = sys.argv[1]
with open(out, 'w', encoding='utf-8') as f:
    f.write('// Generated by design/paty/gen2.py. Do not edit by hand.\n')
    f.write('// Paty pixel sprite: runs are [x, y, width, colorKey] on a 36x48 grid.\n\n')
    f.write('export const PATY_W = %d;\nexport const PATY_H = %d;\n\n' % (W, H))
    f.write('export const PATY_PALETTE: Record<string, string> = %s;\n\n' % json.dumps(PAL, indent=2))
    f.write('export type Run = readonly [number, number, number, string];\n\n')
    for k, v in layers.items():
        f.write('export const %s: readonly Run[] = %s;\n\n' % ('L_' + k.upper(), json.dumps(v, separators=(',', ':'))))
print({k: len(v) for k, v in layers.items()})
