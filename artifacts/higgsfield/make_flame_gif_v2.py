"""Animate the flame itself while keeping the background stationary."""

from __future__ import annotations

import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "white-flame-keyframe.png"
OUTPUT = HERE / "white-flame-loop-v2.gif"
VIDEO_OUTPUT = HERE / "white-flame-loop-v2.mp4"
WEBP_OUTPUT = HERE.parent.parent / "frontend" / "public" / "landing-flame-animated.webp"
WIDTH, HEIGHT = 960, 540
FRAME_COUNT = 60


def main() -> None:
    still = np.asarray(Image.open(SOURCE).convert("RGB").resize((WIDTH, HEIGHT))).copy()
    yy, xx = np.mgrid[:HEIGHT, :WIDTH].astype(np.float32)

    # Isolate the white subject while leaving its blue glow and reflection in place.
    region = (xx > 300) & (xx < 620) & (yy > 75) & (yy < 420)
    white = np.minimum(still[:, :, 0], still[:, :, 1]).astype(np.float32)
    core = np.clip((white - 125) / 75, 0, 1) * region
    alpha = cv2.GaussianBlur(core, (0, 0), 2.2)
    removal = (core > 0.16).astype(np.uint8) * 255
    removal = cv2.dilate(removal, np.ones((19, 19), np.uint8))
    background = cv2.inpaint(still, removal, 19, cv2.INPAINT_TELEA).astype(np.float32)

    # One shared palette prevents color shimmer between GIF frames.
    palette = Image.fromarray(still).quantize(colors=192, method=Image.Quantize.MEDIANCUT)
    frames: list[Image.Image] = []
    webp_frames: list[Image.Image] = []
    video = cv2.VideoWriter(
        str(VIDEO_OUTPUT), cv2.VideoWriter_fourcc(*"mp4v"), 30, (WIDTH, HEIGHT)
    )
    if not video.isOpened():
        raise RuntimeError("Could not open MP4 writer")
    for index in range(FRAME_COUNT):
        phase = 2 * math.pi * index / FRAME_COUNT
        height_weight = np.clip((405 - yy) / 315, 0, 1) ** 1.2
        horizontal = (
            16 * height_weight * np.sin(phase + (405 - yy) * 0.008)
            + 4 * height_weight * np.sin(2 * phase - yy * 0.012)
        )
        vertical = 5 * height_weight * np.sin(phase + 0.4)
        map_x = (xx - horizontal).astype(np.float32)
        map_y = (yy - vertical).astype(np.float32)
        moving_flame = cv2.remap(still, map_x, map_y, cv2.INTER_CUBIC)
        moving_alpha = cv2.remap(alpha, map_x, map_y, cv2.INTER_CUBIC)

        glow = np.exp(-(((xx - 465) / 205) ** 2 + ((yy - 295) / 210) ** 2))
        pulse = 1 + 0.055 * math.sin(phase - 0.6) * glow
        base = np.clip(background * pulse[:, :, None], 0, 255)
        composited = (
            base * (1 - moving_alpha[:, :, None])
            + moving_flame * moving_alpha[:, :, None]
        )
        rgb = np.uint8(np.clip(composited, 0, 255))
        video.write(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
        image = Image.fromarray(rgb)
        webp_frames.append(image)
        frames.append(image.quantize(palette=palette, dither=Image.Dither.NONE))

    video.release()

    webp_frames[0].save(
        WEBP_OUTPUT,
        save_all=True,
        append_images=webp_frames[1:],
        duration=33,
        loop=0,
        quality=85,
        method=6,
    )

    frames[0].save(
        OUTPUT,
        save_all=True,
        append_images=frames[1:],
        duration=33,
        loop=0,
        optimize=True,
        disposal=2,
    )
    print(f"Saved {OUTPUT} ({OUTPUT.stat().st_size:,} bytes, {len(frames)} frames)")
    print(f"Saved {VIDEO_OUTPUT} ({VIDEO_OUTPUT.stat().st_size:,} bytes)")
    print(f"Saved {WEBP_OUTPUT} ({WEBP_OUTPUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
