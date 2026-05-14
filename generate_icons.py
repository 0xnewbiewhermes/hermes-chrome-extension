import base64
import struct
import zlib

def create_png(width, height, color):
    """Create a simple PNG icon with rounded rectangle and lightning bolt."""
    
    def create_rgba(r, g, b, a=255):
        return bytes([r, g, b, a])
    
    # Create pixel data
    pixels = []
    center_x, center_y = width // 2, height // 2
    radius = width // 4
    
    for y in range(height):
        row = b'\x00'  # Filter byte
        for x in range(width):
            # Check if pixel is in rounded rectangle
            dx = abs(x - center_x)
            dy = abs(y - center_y)
            
            # Rounded rectangle check
            in_rect = False
            if dx <= (width // 2 - width // 8) and dy <= (height // 2 - height // 8):
                in_rect = True
            elif dx <= (width // 2 - width // 8) or dy <= (height // 2 - height // 8):
                # Check corners
                corner_x = (width // 2 - width // 8) - radius
                corner_y = (height // 2 - height // 8) - radius
                if dx > corner_x and dy > corner_y:
                    dist = ((dx - corner_x) ** 2 + (dy - corner_y) ** 2) ** 0.5
                    if dist <= radius:
                        in_rect = True
            
            if in_rect:
                # Check if pixel is in lightning bolt
                in_bolt = False
                bolt_size = width // 3
                
                # Simplified bolt shape
                rel_x = x - center_x
                rel_y = y - center_y
                
                # Upper triangle
                if (-bolt_size//4 <= rel_x <= bolt_size//6 and 
                    -bolt_size//2 <= rel_y <= -bolt_size//6):
                    in_bolt = True
                
                # Lower triangle
                if (-bolt_size//8 <= rel_x <= bolt_size//4 and 
                    -bolt_size//6 <= rel_y <= bolt_size//2):
                    in_bolt = True
                
                if in_bolt:
                    row += create_rgba(255, 255, 255)
                else:
                    row += create_rgba(124, 58, 237)
            else:
                row += create_rgba(0, 0, 0, 0)
        
        pixels.append(row)
    
    # Create PNG file
    def create_chunk(chunk_type, data):
        chunk = chunk_type + data
        crc = zlib.crc32(chunk) & 0xffffffff
        return struct.pack('>I', len(data)) + chunk + struct.pack('>I', crc)
    
    # PNG signature
    signature = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr = create_chunk(b'IHDR', ihdr_data)
    
    # IDAT chunk
    raw_data = b''.join(pixels)
    compressed = zlib.compress(raw_data)
    idat = create_chunk(b'IDAT', compressed)
    
    # IEND chunk
    iend = create_chunk(b'IEND', b'')
    
    return signature + ihdr + idat + iend

# Generate icons
for size in [16, 48, 128]:
    png_data = create_png(size, size, (124, 58, 237))
    with open(f'icons/icon{size}.png', 'wb') as f:
        f.write(png_data)
    print(f'Created icon{size}.png ({len(png_data)} bytes)')

print('Icons generated successfully!')
