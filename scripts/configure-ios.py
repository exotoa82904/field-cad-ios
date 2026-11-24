from pathlib import Path
import plistlib

root = Path(__file__).resolve().parent.parent
p = root / 'ios/App/App/Info.plist'
info = plistlib.loads(p.read_bytes())
info['CFBundleDevelopmentRegion'] = 'zh-Hant'
info['ITSAppUsesNonExemptEncryption'] = False
info['UTImportedTypeDeclarations'] = [
    {'UTTypeIdentifier': 'org.fieldcad.' + ext, 'UTTypeDescription': ext.upper() + ' drawing',
     'UTTypeConformsTo': ['public.data', 'public.content'],
     'UTTypeTagSpecification': {'public.filename-extension': [ext], 'public.mime-type': [mime]}}
    for ext, mime in [('dwg', 'image/vnd.dwg'), ('dxf', 'image/vnd.dxf')]]
p.write_bytes(plistlib.dumps(info, sort_keys=False))
p = root / 'ios/App/App.xcodeproj/project.pbxproj'
s = p.read_text(encoding='utf-8').replace('MARKETING_VERSION = 1.0;', 'MARKETING_VERSION = 0.3.0;')
if 'F1E1DCA00000000000000001' not in s:
    edits = [
      ('/* Begin PBXBuildFile section */', '/* Begin PBXBuildFile section */\n\t\tF1E1DCA00000000000000001 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = F1E1DCA00000000000000002 /* PrivacyInfo.xcprivacy */; };'),
      ('/* Begin PBXFileReference section */', '/* Begin PBXFileReference section */\n\t\tF1E1DCA00000000000000002 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };'),
      ('504EC3131FED79650016851F /* Info.plist */,', '504EC3131FED79650016851F /* Info.plist */,\n\t\t\t\tF1E1DCA00000000000000002 /* PrivacyInfo.xcprivacy */,'),
      ('504EC3121FED79650016851F /* LaunchScreen.storyboard in Resources */,', '504EC3121FED79650016851F /* LaunchScreen.storyboard in Resources */,\n\t\t\t\tF1E1DCA00000000000000001 /* PrivacyInfo.xcprivacy in Resources */,')]
    for old, new in edits:
        if old not in s:
            raise RuntimeError('Cannot locate iOS project anchor: ' + old)
        s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
print('Configured iOS privacy resource, imported CAD types, version and local-only app metadata.')
