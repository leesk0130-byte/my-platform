# Replicate Real-ESRGAN image upscale
# Set REPLICATE_API_TOKEN, then run:
#   python scripts/upscale_replicate.py [image_path]
# Output saved to assets/profile_upscaled.png

import os
import sys
import urllib.request

def main():
    token = os.environ.get("REPLICATE_API_TOKEN")
    if not token:
        print("REPLICATE_API_TOKEN not set. Get one at https://replicate.com/account/api-tokens")
        sys.exit(1)

    if len(sys.argv) >= 2:
        image_path = sys.argv[1]
    else:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        image_path = os.path.join(base, "assets", "profile_source.png")

    if not os.path.isfile(image_path):
        print("Image not found:", image_path)
        print("Usage: python upscale_replicate.py <path_to_image>")
        sys.exit(1)

    try:
        import replicate
    except ImportError:
        os.system("pip install replicate --quiet")
        import replicate

    print("Upscaling with Real-ESRGAN...")
    with open(image_path, "rb") as f:
        output = replicate.run(
            "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73ab4c7f3dd6f2d278c4e",
            input={"image": f, "scale": 2}
        )
    if isinstance(output, list):
        output = output[0] if output else None
    if not output:
        print("No output URL")
        sys.exit(1)
    out_url = str(output)
    print("Result URL:", out_url)

    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_path = os.path.join(base, "assets", "profile_upscaled.png")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    urllib.request.urlretrieve(out_url, out_path)
    print("Saved:", out_path)

if __name__ == "__main__":
    main()
