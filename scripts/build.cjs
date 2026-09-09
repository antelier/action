"use strict";
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process"),crypto=require("node:crypto");
const root=path.resolve(process.argv[2]||""),out=path.resolve(__dirname,"..");
if(!process.argv[2])throw Error("Usage: node scripts/build.cjs <authorized engine checkout>");
const commit=cp.execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
if(cp.execFileSync("git",["status","--porcelain","--untracked-files=no"],{cwd:root,encoding:"utf8"}).trim())throw Error("Engine tracked files must be clean");
const esbuild=require(path.join(root,"node_modules/esbuild"));
if(esbuild.version!=="0.28.1")throw Error("esbuild 0.28.1 is required");
const strip={name:"strip-test-modules",setup(b){b.onResolve({filter:/\.test(?:\.js)?$/},a=>({path:a.path,namespace:"test-stub"}));b.onLoad({filter:/.*/,namespace:"test-stub"},()=>({contents:"module.exports = Object.freeze({});",loader:"js"}));}};
(async()=>{
 const file=path.join(out,"dist/index.js");
 const result=await esbuild.build({absWorkingDir:root,entryPoints:["github-app/action-entry.js"],bundle:true,platform:"node",target:"node22",minify:true,legalComments:"none",outfile:file,metafile:true,plugins:[strip]});
 const imports=[...new Set(Object.values(result.metafile.inputs).flatMap(v=>v.imports.filter(i=>i.external).map(i=>i.path)))];
 if(imports.some(p=>p==="node:test"||p==="node:assert/strict"||p.startsWith(".")))throw Error("Unexpected runtime import: "+imports.join(","));
 const bytes=fs.readFileSync(file);
 const manifest={source_commit:commit,esbuild:esbuild.version,target:"node22",test_modules_excluded:true,bytes:bytes.length,sha256:crypto.createHash("sha256").update(bytes).digest("hex"),external_imports:imports};
 fs.writeFileSync(path.join(out,"dist/manifest.json"),JSON.stringify(manifest,null,2)+"\n");console.log(JSON.stringify(manifest,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1});
