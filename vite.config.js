import {defineConfig} from 'vite';
import fs from 'node:fs';
import path from 'node:path';
export default defineConfig(({mode})=>({
 base:'/',worker:{format:'es'},
 plugins:[{name:'local-wasm',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url?.endsWith('/libredwg-web.wasm')){res.setHeader('Content-Type','application/wasm');fs.createReadStream(path.resolve('node_modules/@mlightcad/libredwg-web/wasm/libredwg-web.wasm')).pipe(res);}else next();});}}],
 build:{target:mode.startsWith('ios')?'safari15':'es2022',chunkSizeWarningLimit:1000}
}));
