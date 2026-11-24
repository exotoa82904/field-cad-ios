import {spawnSync} from 'node:child_process';
const r=spawnSync(process.platform==='win32'?'python':'python3',['scripts/package-ios.py'],{stdio:'inherit'});process.exitCode=r.status||0;
