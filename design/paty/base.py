"""Generate Paty pixel sprite (base body, no eyes/mouth) and preview PNG."""
import json, sys
from PIL import Image

W, H = 36, 48
PAL = {
    'K': '#2B1B14',  # outline
    'H': '#8A4B2A',  # hair
    'h': '#B5693D',  # hair highlight
    'd': '#5C2F1A',  # hair dark
    'S': '#F7CBA4',  # skin
    's': '#E5A983',  # skin shade
    'b': '#F19A8A',  # blush
    'G': '#2E55B8',  # glasses
    'g': '#7FA0E8',  # glasses shine
    'w': '#FFFFFF',  # shirt
    'v': '#DCE3F0',  # shirt shade
    'T': '#1D3787',  # tie
    't': '#2E4FB0',  # tie light
    'R': '#D93B2E',  # backpack
    'r': '#A0261D',  # backpack dark
    'Y': '#F8C630',  # star
    'P': '#1F2B5E',  # pants
    'p': '#151D42',  # pants dark
    'O': '#20202A',  # shoe
    'o': '#565668',  # shoe shine
    'c': '#C9BBA8',  # badge
}

g = [['.'] * W for _ in range(H)]

def put(x, y, ch):
    if 0 <= x < W and 0 <= y < H:
        g[y][x] = ch

def ell(cx, cy, rx, ry, x, y):
    return ((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1

# Ears
for y in range(H):
    for x in range(W):
        if ell(6.6, 19.5, 2.4, 2.8, x, y) or ell(29.4, 19.5, 2.4, 2.8, x, y):
            put(x, y, 'S')
# Face
for y in range(H):
    for x in range(W):
        if ell(18, 17.9, 11.9, 10.4, x, y):
            put(x, y, 'S')
# Hair cap + fringe
def fringe(x):
    if x < 21:
        return 8.6 + (21 - x) * 0.36
    return 8.6 + (x - 21) * 0.42
for y in range(H):
    for x in range(W):
        if ell(18, 12.6, 12.9, 11.2, x, y):
            side = (x <= 7 and y <= 15) or (x >= 29 and y <= 14)
            if y <= fringe(x) or side:
                put(x, y, 'H')
# Part / forehead gap (a lock falling over the brow on the right)
for (x, y) in [(22, 10), (23, 10), (23, 11), (24, 11)]:
    put(x, y, 'H')
# Tuft
for (x, y) in [(24, 2), (25, 1), (26, 1), (27, 2), (25, 2), (26, 2), (24, 3), (25, 3), (23, 3), (28, 3), (27, 3),
               (29, 4), (28, 4)]:
    put(x, y, 'H')
# Hair highlights (sweeping strands)
for (x, y) in [(12, 5), (13, 5), (14, 5), (11, 6), (12, 6), (19, 4), (20, 4), (21, 4), (18, 5), (19, 5),
               (15, 7), (16, 7), (17, 7), (23, 6), (24, 6), (25, 7), (9, 9), (10, 8), (26, 2)]:
    if g[y][x] == 'H':
        put(x, y, 'h')
# Hair dark edge where it meets skin + strand lines
for y in range(H - 1):
    for x in range(W):
        if g[y][x] in 'Hh' and g[y + 1][x] == 'S':
            put(x, y, 'd')
for (x, y) in []:
    if g[y][x] in 'Hh':
        put(x, y, 'd')
# Skin shade under the fringe
for y in range(1, H):
    for x in range(W):
        if g[y][x] == 'S' and g[y - 1][x] == 'd':
            put(x, y, 's')
# Eyebrows
for (x, y) in [(10, 14), (11, 13), (12, 13), (13, 13), (23, 13), (24, 13), (25, 13), (26, 14)]:
    if g[y][x] in 'Ss':
        put(x, y, 'd')
# Glasses: two round rings + bridge + temples
LENS = [(12.5, 19.0), (23.5, 19.0)]
for (cx, cy) in LENS:
    for y in range(H):
        for x in range(W):
            d = ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2) ** .5
            if 3.6 <= d <= 4.9:
                put(x, y, 'G')
    put(int(cx) - 2, int(cy) - 3, 'g')
for x in (17, 18, 19):
    put(x, 18, 'G')
for x in (6, 7):
    put(x, 18, 'G')
for x in (28, 29):
    put(x, 18, 'G')
# Nose + blush
put(18, 22, 's')
for (x, y) in [(8, 24), (9, 24), (27, 24), (28, 24)]:
    put(x, y, 'b')

# Neck
for y in (28, 29):
    for x in range(16, 21):
        put(x, y, 's' if y == 28 else 'S')
# Backpack peeking behind shoulders
for y in range(29, 38):
    for x in (9, 10, 25, 26):
        put(x, y, 'R' if x in (9, 26) else 'r')
# Shirt torso
for y in range(29, 39):
    for x in range(11, 25):
        put(x, y, 'w')
for y in range(29, 39):
    put(11, y, 'v')
    put(24, y, 'v')
# Sleeves
for y in range(29, 33):
    for x in (8, 9, 10):
        put(x, y, 'w')
    for x in (25, 26, 27):
        put(x, y, 'w')
for x in (8, 9, 10, 25, 26, 27):
    put(x, 33, 'v')
# Arm/torso separation
for y in range(34, 39):
    put(11, y, 'K'); put(24, y, 'K')
# Arms + hands
for y in range(34, 39):
    for x in (8, 9, 10):
        put(x, y, 'S')
    for x in (25, 26, 27):
        put(x, y, 'S')
for x in (8, 27):
    put(x, 38, 's')
# Collar
for (x, y) in [(15, 29), (16, 29), (16, 30), (20, 29), (21, 29), (20, 30)]:
    put(x, y, 'v')
# Tie
for y in range(29, 37):
    w = 1 if y < 31 else (1 if y < 35 else 0)
    for x in range(18 - w, 19 + w):
        put(x, y, 'T')
put(18, 37, 'T')
put(17, 30, 't')
put(18, 29, 't')
# Straps + stars
for y in range(29, 39):
    for x in (12, 13):
        put(x, y, 'R')
    for x in (22, 23):
        put(x, y, 'R')
for x in (13, 22):
    for y in range(29, 39):
        put(x, y, 'r') if x == 13 else None
put(12, 31, 'Y'); put(23, 31, 'Y')
# Badge
for (x, y) in [(20, 32), (21, 32), (20, 33), (21, 33)]:
    put(x, y, 'c')
# Belt line
for x in range(11, 25):
    put(x, 39, 'p')
# Pants
for y in range(40, 45):
    for x in range(11, 25):
        put(x, y, 'P')
for y in range(42, 45):
    put(17, y, 'p'); put(18, y, '.')
for y in range(40, 45):
    put(11, y, 'p')
# Shoes
for y in (45, 46):
    for x in range(10, 18):
        put(x, y, 'O')
    for x in range(19, 27):
        put(x, y, 'O')
put(11, 45, 'o'); put(12, 45, 'o'); put(20, 45, 'o'); put(21, 45, 'o')


