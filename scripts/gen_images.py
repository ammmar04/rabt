#!/usr/bin/env python3
"""
Rabt — image generator.

Reads data/inventory.json and draws every SVG the site needs:
  - item photos (4:5)      : garment on a wooden hanger, warm studio ground
  - item fabric details (4:5)
  - category cards (3:2)   : a small rail of garments
  - hero (16:9)            : a full clothing rail
  - a couple of scene images for About / Contribute

Everything is vector, so colours are exact, files are tiny, and nothing can
404 into a broken placeholder.
"""

import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "inventory.json")
IMG = os.path.join(ROOT, "assets", "img")

INK = "#23241F"
PAPER = "#EDE7DA"
WOOD = "#8B7355"

# ------------------------------------------------------------ colour utils
def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def rgb2hex(c):
    return "#%02X%02X%02X" % tuple(max(0, min(255, int(round(v)))) for v in c)

def mix(c1, c2, t):
    a, b = hex2rgb(c1), hex2rgb(c2)
    return rgb2hex(tuple(a[i] + (b[i] - a[i]) * t for i in range(3)))

def lighten(c, t): return mix(c, "#FFFFFF", t)
def darken(c, t):  return mix(c, INK, t)

def lum(c):
    r, g, b = [v / 255 for v in hex2rgb(c)]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def shades(base):
    light = lum(base) > 0.72          # white / pale shirts need darker modelling
    return {
        "base": base,
        "hi":  lighten(base, 0.07 if light else 0.15),
        "hi2": lighten(base, 0.14 if light else 0.30),
        "lo":  darken(base, 0.10 if light else 0.20),
        "deep": darken(base, 0.20 if light else 0.36),
        "edge": darken(base, 0.28 if light else 0.46),
    }

# ------------------------------------------------------------ geometry
def catmull(points, closed=True, k=1.0):
    n = len(points)
    d = "M %.1f,%.1f " % points[0]
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0, p1 = points[(i - 1) % n], points[i]
        p2, p3 = points[(i + 1) % n], points[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6 * k, p1[1] + (p2[1] - p0[1]) / 6 * k)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6 * k, p2[1] - (p3[1] - p1[1]) / 6 * k)
        d += "C %.1f,%.1f %.1f,%.1f %.1f,%.1f " % (c1[0], c1[1], c2[0], c2[1], p2[0], p2[1])
    return d + ("Z" if closed else "")

def mirror(right, cx=400.0):
    return right + [(2 * cx - x, y) for (x, y) in reversed(right[1:-1])]

# ------------------------------------------------------------ fabric
def pattern_def(uid, kind, sh):
    if kind == "pinstripe":
        return ('<pattern id="p%s" width="18" height="18" patternUnits="userSpaceOnUse">'
                '<line x1="5" y1="0" x2="5" y2="18" stroke="%s" stroke-width="1.7" opacity="0.55"/>'
                '</pattern>' % (uid, sh["hi2"]))
    if kind == "herringbone":
        return ('<pattern id="p%s" width="16" height="16" patternUnits="userSpaceOnUse">'
                '<path d="M0,8 L8,0 L16,8" fill="none" stroke="%s" stroke-width="1.5" opacity="0.34"/>'
                '<path d="M0,16 L8,8 L16,16" fill="none" stroke="%s" stroke-width="1.5" opacity="0.30"/>'
                '</pattern>' % (uid, sh["hi2"], sh["deep"]))
    if kind == "stripe":
        return ('<pattern id="p%s" width="22" height="22" patternUnits="userSpaceOnUse">'
                '<rect width="8" height="22" fill="%s" opacity="0.62"/>'
                '</pattern>' % (uid, sh["deep"]))
    return ""

def fabric(path_d, uid, kind, sh):
    """base gradient + optional woven pattern + an edge line so pale
    garments still read against the warm paper ground"""
    out = '<path d="%s" fill="url(#g%s)"/>' % (path_d, uid)
    if kind and kind != "solid":
        out += '<path d="%s" fill="url(#p%s)"/>' % (path_d, uid)
    out += '<path d="%s" fill="none" stroke="%s" stroke-width="2" opacity="0.34"/>' % (path_d, sh["edge"])
    return out

def grad_def(uid, sh):
    return ('<linearGradient id="g%s" x1="0.12" y1="0.04" x2="0.88" y2="1">'
            '<stop offset="0" stop-color="%s"/><stop offset="0.46" stop-color="%s"/>'
            '<stop offset="1" stop-color="%s"/></linearGradient>' % (uid, sh["hi"], sh["base"], sh["lo"]))

# ------------------------------------------------------------ hanger
def hanger(sh_hook="#9E9B90"):
    """slim wooden hanger; garment hangs beneath the bar at y=300"""
    g = []
    g.append('<path d="M400,196 C400,176 384,170 384,156 C384,144 392,138 400,138 C410,138 418,145 418,157" '
             'fill="none" stroke="%s" stroke-width="7" stroke-linecap="round"/>' % sh_hook)
    g.append('<path d="M400,196 L262,282 Q252,290 258,298 L542,298 Q548,290 538,282 Z" fill="%s"/>' % WOOD)
    g.append('<path d="M400,196 L262,282 Q252,290 258,298 L542,298 Q548,290 538,282 Z" fill="none" stroke="%s" stroke-width="1.5" opacity="0.35"/>' % darken(WOOD, 0.3))
    g.append('<rect x="258" y="286" width="284" height="6" rx="3" fill="%s" opacity="0.55"/>' % lighten(WOOD, 0.18))
    return "".join(g)

def trouser_bar():
    g = []
    g.append('<path d="M400,196 C400,176 384,170 384,156 C384,144 392,138 400,138 C410,138 418,145 418,157" '
             'fill="none" stroke="#9E9B90" stroke-width="7" stroke-linecap="round"/>')
    g.append('<path d="M400,196 L400,268" stroke="#9E9B90" stroke-width="6"/>')
    g.append('<rect x="288" y="268" width="224" height="14" rx="7" fill="%s"/>' % WOOD)
    g.append('<rect x="292" y="271" width="216" height="4" rx="2" fill="%s" opacity="0.5"/>' % lighten(WOOD, 0.2))
    return "".join(g)

# ------------------------------------------------------------ garments
def jacket(sh, uid, pattern="solid", satin=False, square=False):
    # shoulder -> outer sleeve -> cuff -> body side -> hem
    right = [(400, 296), (460, 292), (514, 304), (554, 332), (574, 444),
             (580, 566), (572, 668), (560, 700), (526, 704), (516, 770),
             (520, 852), (400, 860)]
    body = catmull(mirror(right))
    g = [fabric(body, uid, pattern, sh)]
    # shirt wedge, kept above where the lapels close so no gap shows through
    g.append('<path d="M372,300 L428,300 L410,516 L400,538 L390,516 Z" fill="#EFEDE6"/>')
    lap = lighten(sh["base"], 0.20 if not satin else 0.30)
    # notch lapels — wide enough to actually read
    for s in (1, -1):
        d = ("M 400,298 L %.0f,312 L %.0f,374 L %.0f,390 L %.0f,408 L %.0f,570 L 400,544 Z"
             % (400 + s * 64, 400 + s * 76, 400 + s * 50, 400 + s * 70, 400 + s * 28))
        g.append('<path d="%s" fill="%s"/>' % (d, lap))
        g.append('<path d="%s" fill="none" stroke="%s" stroke-width="2.2" opacity="0.6"/>' % (d, sh["deep"]))
    # collar band across the back of the neck
    g.append('<path d="M338,300 Q400,274 462,300 L456,322 Q400,300 344,322 Z" fill="%s"/>' % sh["deep"])
    # front closure + buttons
    g.append('<path d="M400,570 L400,852" stroke="%s" stroke-width="2.5" opacity="0.45"/>' % sh["deep"])
    for by in (584, 656):
        g.append('<circle cx="418" cy="%d" r="7.5" fill="%s"/>' % (by, sh["edge"]))
        g.append('<circle cx="418" cy="%d" r="7.5" fill="none" stroke="%s" stroke-width="1" opacity="0.55"/>' % (by, sh["hi2"]))
    # chest welt (+ optional pocket square) and flap pockets
    g.append('<path d="M306,470 l64,-9" stroke="%s" stroke-width="5" stroke-linecap="round" opacity="0.6"/>' % sh["deep"])
    if square:
        g.append('<path d="M316,462 h40 v-13 h-40 z" fill="#F1EFE8"/>')
        g.append('<path d="M316,449 h40" stroke="#D6D2C6" stroke-width="1.4"/>')
    for px in (296, 456):
        g.append('<path d="M%d,716 h68 v26 h-68 z" fill="%s" opacity="0.5"/>' % (px, sh["deep"]))
        g.append('<path d="M%d,716 h68" stroke="%s" stroke-width="1.5" opacity="0.45"/>' % (px, sh["hi2"]))
    # cuff buttons + sleeve seams
    for sx in (562, 238):
        for i in range(3):
            g.append('<circle cx="%d" cy="%d" r="3.6" fill="%s" opacity="0.7"/>' % (sx, 636 + i * 16, sh["edge"]))
    g.append('<path d="M520,356 q20,180 26,330" fill="none" stroke="%s" stroke-width="2.5" opacity="0.32"/>' % sh["deep"])
    g.append('<path d="M280,356 q-20,180 -26,330" fill="none" stroke="%s" stroke-width="2.5" opacity="0.32"/>' % sh["deep"])
    # soft drape
    g.append('<path d="M466,620 q8,120 6,210" fill="none" stroke="%s" stroke-width="9" opacity="0.13"/>' % sh["deep"])
    g.append('<path d="M334,620 q-8,120 -6,210" fill="none" stroke="%s" stroke-width="9" opacity="0.13"/>' % sh["deep"])
    return "".join(g)

def shirt(sh, uid, pattern="solid"):
    right = [(400, 306), (452, 302), (500, 314), (538, 338), (558, 444),
             (564, 552), (554, 648), (542, 680), (508, 684), (498, 744),
             (504, 838), (400, 846)]
    body = catmull(mirror(right))
    g = [fabric(body, uid, pattern, sh)]
    # yoke seam
    g.append('<path d="M300,354 Q400,334 500,354" fill="none" stroke="%s" stroke-width="2.5" opacity="0.45"/>' % sh["lo"])
    # placket + buttons
    g.append('<path d="M381,330 h38 v508 h-38 z" fill="%s" opacity="0.6"/>' % sh["hi2"])
    g.append('<path d="M381,330 v508 M419,330 v508" stroke="%s" stroke-width="1.8" opacity="0.55"/>' % sh["lo"])
    for by in range(392, 836, 76):
        g.append('<circle cx="400" cy="%d" r="5.6" fill="%s" opacity="0.85"/>' % (by, sh["edge"]))
    # collar — band plus two points
    g.append('<path d="M348,306 Q400,288 452,306 L448,332 Q400,314 352,332 Z" fill="%s"/>' % sh["hi2"])
    for s in (1, -1):
        d = "M %.0f,320 L 400,400 L %.0f,352 Z" % (400 + s * 34, 400 + s * 56)
        g.append('<path d="%s" fill="%s"/>' % (d, lighten(sh["base"], 0.06)))
        g.append('<path d="%s" fill="none" stroke="%s" stroke-width="2.2" opacity="0.5"/>' % (d, sh["lo"]))
    g.append('<path d="M348,306 Q400,288 452,306" fill="none" stroke="%s" stroke-width="2" opacity="0.5"/>' % sh["lo"])
    # cuffs
    for cx0 in (508, 244):
        g.append('<path d="M%d,632 h48 v46 h-48 z" fill="%s" opacity="0.7"/>' % (cx0, sh["hi2"]))
        g.append('<path d="M%d,632 h48 M%d,678 h48" stroke="%s" stroke-width="2" opacity="0.5"/>' % (cx0, cx0, sh["lo"]))
    # drape
    g.append('<path d="M344,380 q-8,240 -4,450" fill="none" stroke="%s" stroke-width="8" opacity="0.13"/>' % sh["lo"])
    g.append('<path d="M456,380 q8,240 4,450" fill="none" stroke="%s" stroke-width="8" opacity="0.13"/>' % sh["lo"])
    return "".join(g)

def trousers(sh, uid, pattern="solid", pleated=False):
    right = [(400, 292), (476, 300), (494, 350), (488, 494), (478, 652),
             (468, 834), (462, 890), (418, 894), (411, 706), (404, 560), (400, 496)]
    body = catmull(mirror(right))
    g = [fabric(body, uid, pattern, sh)]
    # waistband
    g.append('<path d="M324,292 Q400,280 476,292 L476,336 Q400,324 324,336 Z" fill="%s"/>' % sh["lo"])
    g.append('<path d="M324,314 Q400,303 476,314" fill="none" stroke="%s" stroke-width="1.6" opacity="0.5"/>' % sh["deep"])
    for lx in (340, 400, 460):
        g.append('<rect x="%d" y="288" width="6" height="50" rx="2" fill="%s" opacity="0.7"/>' % (lx - 3, sh["deep"]))
    # fly + pressed creases
    g.append('<path d="M400,336 L400,494" stroke="%s" stroke-width="2.2" opacity="0.45"/>' % sh["deep"])
    g.append('<path d="M360,344 q-6,270 -4,540" fill="none" stroke="%s" stroke-width="2.6" opacity="0.55"/>' % sh["hi2"])
    g.append('<path d="M440,344 q6,270 4,540" fill="none" stroke="%s" stroke-width="2.6" opacity="0.55"/>' % sh["hi2"])
    if pleated:
        g.append('<path d="M370,342 q-3,90 -2,150 M430,342 q3,90 2,150" fill="none" stroke="%s" stroke-width="2" opacity="0.4"/>' % sh["deep"])
    # side pockets
    g.append('<path d="M326,348 q-6,36 -2,64 M474,348 q6,36 2,64" fill="none" stroke="%s" stroke-width="2.2" opacity="0.4"/>' % sh["deep"])
    # shading between legs
    g.append('<path d="M400,510 q-4,190 -2,376" fill="none" stroke="%s" stroke-width="9" opacity="0.18"/>' % sh["deep"])
    return "".join(g)

def suit_trouser_backdrop(sh, uid):
    """trouser legs peeking out behind a jacket, so a suit reads as a set"""
    g = []
    for x0 in (334, 418):
        d = "M%d,620 L%d,620 L%d,962 L%d,962 Z" % (x0, x0 + 48, x0 + 44, x0 + 4)
        g.append('<path d="%s" fill="%s"/>' % (d, darken(sh["base"], 0.12)))
        g.append('<path d="M%d,626 L%d,958" stroke="%s" stroke-width="2" opacity="0.45"/>'
                 % (x0 + 24, x0 + 23, sh["hi2"]))
    return "".join(g)

# ------------------------------------------------------------ scaffolding
GRAIN = ('<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" '
         'stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="saturate" values="0"/>'
         '<feComponentTransfer><feFuncA type="linear" slope="0.42"/></feComponentTransfer>'
         '<feComposite operator="in" in2="SourceGraphic"/></filter>')
BLUR = '<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>'

def ground(w, h, tone=PAPER):
    return ('<linearGradient id="bg" x1="0.2" y1="0" x2="0.8" y2="1">'
            '<stop offset="0" stop-color="%s"/><stop offset="0.55" stop-color="%s"/>'
            '<stop offset="1" stop-color="%s"/></linearGradient>'
            '<radialGradient id="vig" cx="0.5" cy="0.42" r="0.75">'
            '<stop offset="0.55" stop-color="#000000" stop-opacity="0"/>'
            '<stop offset="1" stop-color="#000000" stop-opacity="0.10"/></radialGradient>'
            % (lighten(tone, 0.30), lighten(tone, 0.10), darken(tone, 0.05)))

def svg(vb, defs, body, grain=0.045):
    w, h = vb.split()[2], vb.split()[3]
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" preserveAspectRatio="xMidYMid slice" role="img">'
            '<defs>%s</defs>'
            '<rect width="%s" height="%s" fill="url(#bg)"/>%s'
            '<rect width="%s" height="%s" fill="url(#vig)"/>'
            '<rect width="%s" height="%s" filter="url(#grain)" opacity="%.3f"/></svg>'
            % (vb, defs, w, h, body, w, h, w, h, grain))

def garment_for(item, uid):
    sh = shades(item["colourHex"])
    cat, pat = item["category"], item.get("pattern", "solid")
    if cat == "trousers":
        return sh, trouser_bar() + trousers(sh, uid, pat, item["fit"] == "Relaxed")
    if cat == "shirts":
        return sh, hanger() + shirt(sh, uid, pat)
    if cat == "suits":
        return sh, suit_trouser_backdrop(sh, uid) + hanger() + jacket(sh, uid, pat, square=True)
    evening = "Evening" in item["name"]
    return sh, hanger() + jacket(sh, uid, pat, satin=evening, square=evening)

# ------------------------------------------------------------ renderers
def item_svg(item):
    uid = "a"
    sh, g = garment_for(item, uid)
    defs = ground(800, 1000) + grad_def(uid, sh) + pattern_def(uid, item.get("pattern"), sh) + GRAIN + BLUR
    body = ('<ellipse cx="400" cy="950" rx="210" ry="26" fill="%s" opacity="0.16" filter="url(#soft)"/>' % INK) + g
    return svg("0 0 800 1000", defs, body)

def detail_svg(item):
    base = item["colourHex"]
    if lum(base) > 0.80:          # pale fabrics need tone or the macro reads blank
        base = darken(base, 0.10)
    sh = shades(base)
    uid = "d"
    pat = item.get("pattern", "solid")
    weave = ('<pattern id="w" width="9" height="9" patternUnits="userSpaceOnUse">'
             '<path d="M0,9 L9,0" stroke="%s" stroke-width="2" opacity="0.20"/>'
             '<path d="M0,0 L9,9" stroke="%s" stroke-width="1.4" opacity="0.14"/></pattern>'
             % (sh["deep"], sh["hi2"]))
    defs = (ground(800, 1000) + grad_def(uid, sh) + pattern_def(uid, pat, sh) + weave + GRAIN +
            '<radialGradient id="lg" cx="0.34" cy="0.28" r="0.85">'
            '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16"/>'
            '<stop offset="1" stop-color="#000000" stop-opacity="0.16"/></radialGradient>')
    b = ['<rect width="800" height="1000" fill="url(#g%s)"/>' % uid,
         '<rect width="800" height="1000" fill="url(#w)"/>']
    if pat != "solid":
        b.append('<rect width="800" height="1000" fill="url(#p%s)"/>' % uid)
    b.append('<rect width="800" height="1000" fill="url(#lg)"/>')
    # a fold running through the frame
    b.append('<path d="M-20,620 C210,540 560,760 820,590 L820,1000 L-20,1000 Z" fill="%s" opacity="0.26"/>' % sh["deep"])
    b.append('<path d="M-20,620 C210,540 560,760 820,590" fill="none" stroke="%s" stroke-width="3" opacity="0.35"/>' % sh["hi2"])
    if item["category"] == "shirts":
        b.append('<path d="M250,150 h300 v54 h-300 z" fill="%s" opacity="0.55"/>' % sh["hi2"])
        for i in range(3):
            b.append('<circle cx="%d" cy="330" r="16" fill="%s"/>' % (300 + i * 100, sh["edge"]))
            b.append('<circle cx="%d" cy="330" r="16" fill="none" stroke="%s" stroke-width="2" opacity="0.5"/>' % (300 + i * 100, sh["hi2"]))
    else:
        b.append('<circle cx="400" cy="300" r="46" fill="%s"/>' % sh["edge"])
        b.append('<circle cx="400" cy="300" r="46" fill="none" stroke="%s" stroke-width="3" opacity="0.45"/>' % sh["hi2"])
        for dx, dy in ((-15, -15), (15, -15), (-15, 15), (15, 15)):
            b.append('<circle cx="%d" cy="%d" r="5" fill="%s" opacity="0.7"/>' % (400 + dx, 300 + dy, sh["hi2"]))
        b.append('<path d="M170,700 h460" stroke="%s" stroke-width="3" stroke-dasharray="9 9" opacity="0.5"/>' % sh["hi2"])
    return svg("0 0 800 1000", defs, "".join(b), grain=0.055)

def rail(items, w, h, y_bar, positions, scale):
    """a horizontal rail with garments hanging from it"""
    defs, body = [], []
    body.append('<rect x="%d" y="%d" width="%d" height="9" rx="4.5" fill="%s"/>'
                % (int(w * 0.04), y_bar, int(w * 0.92), darken(WOOD, 0.1)))
    body.append('<rect x="%d" y="%d" width="%d" height="3" rx="1.5" fill="%s" opacity="0.6"/>'
                % (int(w * 0.04), y_bar + 2, int(w * 0.92), lighten(WOOD, 0.25)))
    for i, (item, x) in enumerate(zip(items, positions)):
        uid = "r%d" % i
        sh, g = garment_for(item, uid)
        defs.append(grad_def(uid, sh) + pattern_def(uid, item.get("pattern"), sh))
        body.append('<g transform="translate(%.0f,%.0f) scale(%.3f)" opacity="0.99">%s</g>'
                    % (x - 400 * scale, y_bar - 150 * scale, scale, g))
    return "".join(defs), "".join(body)

def category_svg(cat, items):
    picks = [i for i in items if i["category"] == cat["slug"]][:3]
    while len(picks) < 3:
        picks.append(picks[-1])
    d, b = rail(picks, 1200, 800, 150, [300, 600, 900], 0.62)
    defs = ground(1200, 800) + d + GRAIN + BLUR
    return svg("0 0 1200 800", defs, b)

def hero_svg(items):
    by_id = {i["id"]: i for i in items}
    pick = lambda ids: [by_id[o] for o in ids if o in by_id]
    # a soft, out-of-focus back rail gives the left side depth instead of bare wall
    bd, bb = rail(pick(["R-102", "R-302", "R-403", "R-203"]), 1600, 900, 96,
                  [190, 330, 470, 610], 0.40)
    bb = '<g opacity="0.30" filter="url(#soft2)">%s</g>' % bb
    fd, fb = rail(pick(["R-301", "R-101", "R-201", "R-401", "R-305", "R-202"]),
                  1600, 900, 168, [820, 985, 1150, 1310, 1450, 1580], 0.62)
    blur2 = ('<filter id="soft2" x="-20%" y="-20%" width="140%" height="140%">'
             '<feGaussianBlur stdDeviation="5"/></filter>')
    defs = ground(1600, 900) + bd + fd + GRAIN + BLUR + blur2
    return svg("0 0 1600 900", defs, bb + fb)

def scene_svg(items, ids, vb="0 0 1200 800", xs=None):
    by_id = {i["id"]: i for i in items}
    picks = [by_id[i] for i in ids if i in by_id]
    xs = xs or [280, 600, 920]
    d, b = rail(picks, 1200, 800, 160, xs, 0.60)
    defs = ground(1200, 800) + d + GRAIN + BLUR
    return svg(vb, defs, b)

# ------------------------------------------------------------ main
def write(path, content):
    full = os.path.join(IMG, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as f:
        f.write(content)

def main():
    data = json.load(open(DATA))
    items = data["items"]
    n = 0
    for it in items:
        write("items/%s.svg" % it["id"], item_svg(it))
        write("items/%s-detail.svg" % it["id"], detail_svg(it))
        n += 2
    for c in data["categories"]:
        write("categories/%s.svg" % c["slug"], category_svg(c, items))
        n += 1
    write("hero.svg", hero_svg(items))
    write("scene/about.svg", scene_svg(items, ["R-102", "R-302", "R-403"]))
    write("scene/contribute.svg", scene_svg(items, ["R-205", "R-301", "R-104"]))
    n += 3
    print("wrote %d svg files" % n)

if __name__ == "__main__":
    main()
