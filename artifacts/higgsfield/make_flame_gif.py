"""Create a short, seamless flame animation from the generated still."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "white-flame-keyframe.png"
OUTPUT = HERE / "white-flame-loop.gif"
FRAME_COUNT = 30
WIDTH = 960
HEIGHT = 540


def make_frame(source: Image.Image, index: int) -> Image.Image:
    phase = 2 * math.pi * index / FRAME_COUNT
    frame = Image.new("RGB", (WIDTH, HEIGHT))

    # Each horizontal strip shifts slightly; the phase repeats exactly at the loop.
    for y in range(HEIGHT):
        vertical_weight = max(0.0, min(1.0, (HEIGHT - y - 90) / 340))
        displacement = round(
            4.5 * vertical_weight * math.sin(phase + (HEIGHT - y) * 0.009)
        )
        row = source.crop((0, y, WIDTH, y + 1))
        frame.paste(row, (displacement, y))
        if displacement > 0:
            frame.paste(source.crop((0, y, 1, y + 1)).resize((displacement, 1)), (0, y))
        elif displacement < 0:
            frame.paste(
                source.crop((WIDTH - 1, y, WIDTH, y + 1)).resize((-displacement, 1)),
                (WIDTH + displacement, y),
            )

    # The source already has soft glow. A slight pulse makes it feel alive.
    frame = ImageEnhance.Brightness(frame).enhance(1 + 0.018 * math.sin(phase - 0.5))

    sparks = Image.new("RGBA", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(sparks)
    for x, y, offset in ((337, 283, 0), (578, 181, 8), (603, 387, 17)):
        progress = ((index + offset) % FRAME_COUNT) / FRAME_COUNT
        opacity = round(110 * (math.sin(math.pi * progress) ** 2))
        spark_y = y - round(17 * progress)
        radius = 1.2 + 0.7 * math.sin(math.pi * progress)
        draw.ellipse(
            (x - radius, spark_y - radius, x + radius, spark_y + radius),
            fill=(255, 255, 255, opacity),
        )
    sparks = sparks.filter(ImageFilter.GaussianBlur(0.6))
    frame = Image.alpha_composite(frame.convert("RGBA"), sparks).convert("RGB")
    return frame.quantize(colors=128, method=Image.Quantize.FASTOCTREE)


def main() -> None:
    source = Image.open(SOURCE).convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    frames = [make_frame(source, index) for index in range(FRAME_COUNT)]
    frames[0].save(
        OUTPUT,
        save_all=True,
        append_images=frames[1:],
        duration=67,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"Saved {OUTPUT} ({OUTPUT.stat().st_size:,} bytes, {len(frames)} frames)")


if __name__ == "__main__":
    main()
