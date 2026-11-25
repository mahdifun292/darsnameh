#!/usr/bin/env python3
"""Generate the Darsnameh app icon (PNG + Windows ICO + Linux icon set)."""
from PIL import Image, ImageDraw, ImageFilter
import math
import os

S = 2048
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "build")


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


# Diagonal gradient
small = Image.new("RGB", (2, 2))
small.putpixel((0, 0), (167, 139, 250))
small.putpixel((1, 0), (139, 92, 246))
small.putpixel((0, 1), (45, 212, 191))
small.putpixel((1, 1), (34, 211, 238))
bg = small.resize((S, S), Image.Resampling.BICUBIC).convert("RGBA")

# Soft light blobs
blob = Image.new("RGBA", (S, S), (0, 0, 0, 0))
bd = ImageDraw.Draw(blob)
bd.ellipse((-S * 0.15, -S * 0.25, S * 0.65, S * 0.55), fill=(255, 255, 255, 70))
bd.ellipse((S * 0.55, S * 0.5, S * 1.25, S * 1.2), fill=(6, 78, 90, 70))
blob = blob.filter(ImageFilter.GaussianBlur(S // 8))
bg = Image.alpha_composite(bg, blob)

# Inner book shadow
shadow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.ellipse((S * 0.20, S * 0.62, S * 0.80, S * 0.82), fill=(5, 10, 25, 130))
shadow = shadow.filter(ImageFilter.GaussianBlur(S // 30))
bg = Image.alpha_composite(bg, shadow)

draw = ImageDraw.Draw(bg)

# Star glow
glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse((S * 0.36, S * 0.13, S * 0.64, S * 0.41), fill=(255, 236, 170, 150))
glow = glow.filter(ImageFilter.GaussianBlur(S // 40))
bg = Image.alpha_composite(bg, glow)
draw = ImageDraw.Draw(bg)


def star_points(cx, cy, outer, inner, points=5, rotation=-math.pi / 2):
    pts = []
    for i in range(points * 2):
        r = outer if i % 2 == 0 else inner
        angle = rotation + i * math.pi / points
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    return pts


star = star_points(S * 0.5, S * 0.275, S * 0.075, S * 0.032)
draw.polygon(star, fill=(255, 240, 190, 255))

# Open book
white = (250, 250, 255, 255)
page_edge = (222, 226, 250, 255)
line_color = (139, 92, 246, 95)

left_page = [
    (S * 0.205, S * 0.405),
    (S * 0.33, S * 0.355),
    (S * 0.485, S * 0.395),
    (S * 0.485, S * 0.715),
    (S * 0.33, S * 0.685),
    (S * 0.205, S * 0.735),
]
right_page = [
    (S * 0.515, S * 0.395),
    (S * 0.67, S * 0.355),
    (S * 0.795, S * 0.405),
    (S * 0.795, S * 0.735),
    (S * 0.67, S * 0.685),
    (S * 0.515, S * 0.715),
]

# Pages with subtle edge
draw.polygon(right_page, fill=white, outline=page_edge, width=int(S * 0.006))
draw.polygon(left_page, fill=white, outline=page_edge, width=int(S * 0.006))

# Spine
draw.line([(S * 0.5, S * 0.385), (S * 0.5, S * 0.725)], fill=(167, 139, 250, 255), width=int(S * 0.012))

# Page lines
for i in range(4):
    y = S * (0.475 + i * 0.052)
    draw.line([(S * 0.255, y + S * 0.012), (S * 0.43, y)], fill=line_color, width=int(S * 0.008))
    draw.line([(S * 0.57, y), (S * 0.745, y + S * 0.012)], fill=line_color, width=int(S * 0.008))

# Page corner fold highlights
draw.line([(S * 0.205, S * 0.735), (S * 0.205, S * 0.405)], fill=(255, 255, 255, 60), width=int(S * 0.008))
draw.line([(S * 0.795, S * 0.405), (S * 0.795, S * 0.735)], fill=(255, 255, 255, 60), width=int(S * 0.008))

# Rounded mask for the whole tile
mask = Image.new("L", (S, S), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle((0, 0, S, S), radius=int(S * 0.225), fill=255)
bg.putalpha(mask)

icon = bg.resize((1024, 1024), Image.Resampling.LANCZOS)
os.makedirs(os.path.join(ROOT, "assets"), exist_ok=True)
icon.save(os.path.join(ROOT, "assets", "icon.png"))

os.makedirs(OUT, exist_ok=True)
icon.save(os.path.join(OUT, "icon.png"))
icon.save(os.path.join(OUT, "icon.ico"), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

icons_dir = os.path.join(OUT, "icons")
os.makedirs(icons_dir, exist_ok=True)
for size in [16, 24, 32, 48, 64, 128, 256, 512, 1024]:
    icon.resize((size, size), Image.Resampling.LANCZOS).save(os.path.join(icons_dir, f"{size}x{size}.png"))

print("icon generated")
