from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parent.parent
flavor=json.loads((root/'ios/App/App/public/field-cad-build.json').read_text())
if flavor.get('testing'):
    raise RuntimeError('Run pnpm ios:sync to restore the normal app before packaging; this is a CI-only build.')
release = root / 'release'
release.mkdir(exist_ok=True)
target = release / 'FieldCAD-iOS-0.3.0.zip'
files = [root / n for n in ['.gitignore', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'vite.config.js', 'capacitor.config.json', 'index.html', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.txt']]
for folder in ['src', 'scripts', 'tests', 'docs', 'ios', 'public', '.github']:
    files.extend(p for p in (root / folder).rglob('*') if p.is_file() and not any(part in ['xcuserdata', 'DerivedData', '.build', '.DS_Store'] for part in p.parts))
with ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=6) as out:
    for p in sorted(files):
        out.write(p, 'FieldCAD/' + p.relative_to(root).as_posix())
    evidence = json.loads((root / 'docs/IOS-CLOUD-RESULT.json').read_text(encoding='utf-8'))
    out.writestr('FieldCAD/BUILD-STATUS.json', json.dumps({'project': 'Capacitor iOS / SPM', 'webAssets': 'normal offline app, built and bundled', 'xcodeBuild': 'CI simulator build passed for the source commit identified in lastCloudValidation', 'iOSSimulator': '8 compatibility checks passed; dedicated CI build, not physical iPhone acceptance', 'lastCloudValidation': {'status': evidence['status'], **evidence['provenance']}, 'physicalIPhone': 'not tested', 'TestFlight': 'not uploaded; developer membership and signing pending', 'containsUserDrawings': False, 'containsPublicSyntheticCalibration': True}, ensure_ascii=False, indent=2))
print(target)
print(f'{target.stat().st_size:,} bytes; source + offline app assets, no node_modules, credentials or engineering samples.')
