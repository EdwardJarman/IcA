from pathlib import Path
from PIL import Image

project = Path("/home/ubuntu/luma-workroom")
source = Path("/home/ubuntu/webdev-static-assets/luma-workroom-icon.png")
targets = [
    project / "assets/images/icon.png",
    project / "assets/images/splash-icon.png",
    project / "assets/images/favicon.png",
    project / "assets/images/android-icon-foreground.png",
]

with Image.open(source) as image:
    rgb = image.convert("RGB")
    optimized = rgb.resize((512, 512), Image.Resampling.LANCZOS)
    for target in targets:
        optimized.save(target, format="PNG", optimize=True, compress_level=9)
