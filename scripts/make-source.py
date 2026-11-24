from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent.parent
targets = ['src', 'scripts', 'tests', 'docs', 'ios', '.github', 'public/fonts', 'public/fixtures']
files = [root / n for n in ['.gitignore', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'vite.config.js', 'capacitor.config.json', 'index.html', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.txt']]
for target in targets:
    files.extend(p for p in (root / target).rglob('*') if p.is_file() and not any(x in p.parts for x in ['xcuserdata', 'DerivedData', '.build']) and not p.is_relative_to(root / 'ios/App/App/public') and p.name not in ['capacitor.config.json', 'config.xml'])
with ZipFile(root / 'dist/source.zip', 'w', ZIP_DEFLATED, compresslevel=9) as out:
    for p in sorted(files):
        out.write(p, p.relative_to(root).as_posix())
print('Packaged application source without user drawings or credentials.')
