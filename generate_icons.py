from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    # Create image with Airtable-ish blue background
    img = Image.new('RGB', (size, size), '#18bfff')
    draw = ImageDraw.Draw(img)

    # Draw a play button (video symbol)
    padding = size // 4
    triangle = [
        (padding, padding),
        (padding, size - padding),
        (size - padding, size // 2)
    ]
    draw.polygon(triangle, fill='white')

    return img

# Create icons directory if it doesn't exist
os.makedirs('icons', exist_ok=True)

# Generate icons
for size in [16, 48, 128]:
    icon = create_icon(size)
    icon.save(f'icons/icon{size}.png')
    print(f'Generated icon{size}.png')

print('All icons generated!')
