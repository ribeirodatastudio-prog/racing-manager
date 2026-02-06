import re
from PIL import Image
import os

# 1. Process Image for Collision Grid
img = Image.open('/tmp/file_attachments/image.png').convert('RGBA')
# Resize to 200x200 for grid (5px per cell)
# usage: grid[y][x]
GRID_SIZE = 200
img_small = img.resize((GRID_SIZE, GRID_SIZE), Image.Resampling.NEAREST)
pixels = img_small.load()

grid = []

for y in range(GRID_SIZE):
    row = []
    for x in range(GRID_SIZE):
        r, g, b, a = pixels[x, y]
        # Wall logic
        is_transparent = a < 50
        # Black detection (allow some noise, < 30)
        is_black = r < 30 and g < 30 and b < 30

        if is_transparent or is_black:
            row.append(1) # Wall
        else:
            row.append(0) # Walkable
    grid.append(row)

# Flatten for export
flat_grid = [val for sublist in grid for val in sublist]

with open('src/lib/engine/maps/dust2_collisions.ts', 'w') as f:
    f.write('// Auto-generated collision grid (200x200)\n')
    f.write('export const MAP_WIDTH = 1000;\n')
    f.write('export const MAP_HEIGHT = 1000;\n')
    f.write(f'export const GRID_SIZE = {GRID_SIZE};\n')
    f.write('// 0 = Walkable, 1 = Wall\n')
    f.write('export const COLLISION_GRID = [')
    f.write(','.join(map(str, flat_grid)))
    f.write('];\n')

print(f"Generated dust2_collisions.ts with {len(flat_grid)} cells.")

# 2. Update dust2.ts coordinates (Flip Y)
with open('src/lib/engine/maps/dust2.ts', 'r') as f:
    content = f.read()

def flip_y(match):
    y_val = int(match.group(1))
    new_y = 1000 - y_val
    return f"y: {new_y}"

# Regex for "y: 123"
new_content = re.sub(r'y:\s*(\d+)', flip_y, content)

with open('src/lib/engine/maps/dust2.ts', 'w') as f:
    f.write(new_content)

print("Updated dust2.ts with flipped Y coordinates.")
