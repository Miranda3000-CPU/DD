"""Bake the reference portrait's complexion into the animated sculpture's vertex colors.

The compact paint swatch contains isolated skin, iris and lip colors. Eye openings,
eyebrows and lips are removed from the complexion so blinking and smiling remain
independent mesh movements. Pillow is used only when authoring the GLB.
"""
from functools import lru_cache
from pathlib import Path

from PIL import Image

SWATCH = Path(__file__).with_name("avatar_face_paint.png")
# Model heights measured at the chin, mouth, nose, eyes, brows and forehead.
LANDMARKS = (
    (1.485, 456), (1.512, 444), (1.545, 423), (1.568, 399),
    (1.596, 365), (1.626, 339), (1.653, 321), (1.670, 302),
    (1.702, 276), (1.732, 246), (1.764, 209), (1.790, 169),
    (1.820, 133), (1.850, 94), (1.885, 70),
)


@lru_cache(maxsize=1)
def swatch():
    with Image.open(SWATCH) as image:
        return image.convert("RGB")


def linear(channel):
    value = channel / 255
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def sample(px, py):
    image = swatch()
    x = max(0, min(px, image.width - 1))
    y = max(0, min(py, image.height - 1))
    x0, y0 = int(x), int(y)
    channels = [0., 0., 0.]
    for xx, wx in ((x0, 1+x0-x), (min(x0+1, image.width-1), x-x0)):
        for yy, wy in ((y0, 1+y0-y), (min(y0+1, image.height-1), y-y0)):
            rgb = image.getpixel((xx, yy))
            for i in range(3):
                channels[i] += wx * wy * rgb[i]
    return tuple(255 * linear(channel) for channel in channels)


def portrait_y(y):
    for (a, v), (b, w) in zip(LANDMARKS, LANDMARKS[1:]):
        if y <= b:
            return v + (w-v) * max(0, (y-a)/(b-a))
    return LANDMARKS[-1][1]


def clamp(t):
    return max(0, min(1, t))


def mix_color(base, paint, amount):
    return tuple(round(a + amount * (b-a)) for a, b in zip(base, paint)) + (255,)


def face_colors(part, material, vertices, base):
    if part == "Head" and material == "skin":
        colors = []
        for x, y, z in vertices:
            # Fade around the ears and scalp into the material used on the neck and arms.
            amount = .80 * clamp((z-.020)/.070) * clamp((1.905-y)/.062)
            u = (268 + 960*x - 91) / 350
            v = (portrait_y(y) - 55) / 411
            paint = sample(clamp(u)*175, clamp(v)*205)
            # Normalize the portrait's exposure to the body material: the scene
            # supplies the illumination, the paint supplies the local pigment.
            neutral = (205, 105, 58)
            tint = tuple(
                base[i] * max(.64, min(1.50, (paint[i]/(255*linear(neutral[i])))**.68))
                for i in range(3)
            )
            colors.append(mix_color(base, tint, amount))
        return colors
    if part in ("EyeL", "EyeR") and material == "ivory":
        side = 1 if part == "EyeL" else -1
        colors = []
        for x, y, z in vertices:
            dx = x-side*.077
            u = dx/.060
            v = (y-1.732-side*.14*dx)/.038
            cornea = .179-side*.36*dx+.012*(1-u*u)-.006*v*v
            if z > cornea+.002:
                colors.append(base)  # Keep the separate corneal catchlight bright.
                continue
            # Soft lid shadow and pink inner corners on the curved sclera.
            edge = clamp(abs(dx)/.061)**2.7
            lid = clamp((v+.06)/.9)**1.65
            shade = tuple(255*linear(a-b*edge-c*lid)
                          for a,b,c in ((249,50,58),(238,78,69),(232,66,63)))
            colors.append(mix_color(base, shade, .90))
        return colors
    if part in ("EyeL", "EyeR") and material == "iris":
        side = 1 if part == "EyeL" else -1
        colors = []
        for x,y,_ in vertices:
            u = clamp(.5 + (x-side*.074)/.052)
            v = clamp(.5 - (y-1.7315)/.054)
            paint = sample(177 + u*45, 1 + v*45)
            colors.append(mix_color(base, paint, .88))
        return colors
    if part == "Mouth" and material in ("lip", "lipTop"):
        colors = []
        for x,y,_ in vertices:
            t = max(-1, min(1, x/.061))
            w = max(.005, 1-t*t)
            if material == "lipTop":
                seam = 1.594 + .013*t*t + .007*w
                v = clamp((y-seam)/(.011*w))
                row = 53+(1-v)*15
            else:
                seam = 1.594 + .013*t*t - .003*w
                v = clamp((seam-y)/(.012*w))
                row = 72+v*15
            paint = sample(177+(t+1)*22.5, row)
            colors.append(mix_color(base, paint, .82))
        return colors
    return [base] * len(vertices)
