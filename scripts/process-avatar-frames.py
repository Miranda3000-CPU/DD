from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "avatar"
OUTPUT.mkdir(parents=True, exist_ok=True)


def remove_magenta(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, _ = pixels[x, y]
            if red > 130 and blue > 130 and green < 82:
                pixels[x, y] = (red, green, blue, 0)
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds:
        image = image.crop(bounds)
    image.thumbnail((700, 900), Image.Resampling.LANCZOS)
    return image


sheet = Image.open(ROOT / "scripts" / "assets" / "avatar-phases.png")
poses = {
    "menstrual": (0, 0),
    "follicular": (1, 0),
    "ovulatory": (0, 1),
    "luteal": (1, 1),
}
for name, (column, row) in poses.items():
    frame = sheet.crop((column * 1024, row * 1024, (column + 1) * 1024, (row + 1) * 1024))
    frame = remove_magenta(frame)
    frame.save(OUTPUT / f"{name}.webp", "WEBP", quality=90, method=6)

touch = remove_magenta(Image.open(ROOT / "scripts" / "assets" / "avatar-touch.png"))
touch.save(OUTPUT / "touch.webp", "WEBP", quality=90, method=6)
