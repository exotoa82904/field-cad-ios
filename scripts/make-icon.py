from pathlib import Path
import math, struct, zlib
root = Path(__file__).resolve().parent.parent
size = 1024
rows = bytearray()
for y in range(size):
    rows.append(0)
    for x in range(size):
        color = (13,23,34)
        r = math.hypot(x-512,y-512)
        if (260<=x<=764 and 300<=y<=724 and (x<=280 or x>=744 or y<=320 or y>=704)):
            color=(87,223,193)
        if (220<=x<=804 and abs(y-512)<=6) or (220<=y<=804 and abs(x-512)<=6) or 106<=r<=122:
            color=(238,251,255)
        if 255<=y<=325 and abs(x-512)<=(y-255)*.5:
            color=(87,223,193)
        rows.extend(color)
def chunk(kind, data):
    return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>2I5B',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(rows,9))+chunk(b'IEND',b'')
(root/'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png').write_bytes(png)
print('Generated original opaque RGB CAD icon.')
