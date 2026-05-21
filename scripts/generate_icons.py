#!/usr/bin/env python3
from PIL import Image, ImageDraw
import math, os

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
os.makedirs(OUT_DIR, exist_ok=True)

OBSIDIANA = (10, 10, 11, 255)
INDIGO = (99, 102, 241, 255)
CHAMPAN = (201, 168, 76, 255)
SLATE = (15, 23, 42, 255)
INDIGO_DIM = (99, 102, 241, 80)

def draw_icon(img: Image.Image, size: int):
    draw = ImageDraw.Draw(img)
    margin = size * 0.08
    radius = size * 0.18
    r = int(radius)

    # Rounded rect background
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=r, fill=255
    )

    bg = Image.new('RGBA', (size, size), OBSIDIANA)
    img.paste(bg, (0, 0), mask)

    cx = size / 2
    line_w = max(1, int(size * 0.025))

    # Head circle
    head_r = size * 0.15
    head_y = size * 0.38
    draw.ellipse(
        [cx - head_r, head_y - head_r, cx + head_r, head_y + head_r],
        outline=INDIGO, width=line_w
    )

    # Body arc
    body_top = size * 0.55
    body_r = size * 0.18
    draw.arc(
        [cx - body_r, body_top - body_r * 0.6, cx + body_r, body_top + body_r * 0.8],
        start=180, end=360, fill=INDIGO, width=line_w
    )

    # Horiz line (shoulders)
    line_y = body_top + body_r * 0.05
    line_l = cx - body_r * 0.5
    line_r2 = cx + body_r * 0.5
    draw.line([line_l, line_y, line_r2, line_y], fill=CHAMPAN, width=max(1, int(size * 0.02)))

    # Decorative dots
    dot_r = max(1, int(size * 0.012))
    dot_y = size * 0.48
    for dx in (-4, 0, 4):
        dx_val = dx * dot_r * 1.8
        alpha = 100 if abs(dx) == 4 else 160
        color = (*CHAMPAN[:3], alpha)
        draw.ellipse(
            [cx + dx_val - dot_r, dot_y - dot_r, cx + dx_val + dot_r, dot_y + dot_r],
            fill=color
        )

def generate(size: int):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw_icon(img, size)
    path = os.path.join(OUT_DIR, f'icon-{size}.png')
    img.save(path, 'PNG')
    file_size = os.path.getsize(path)
    print(f'  icon-{size}.png: {file_size} bytes')
    return path

generate(192)
generate(512)
print('Icons generated successfully.')
