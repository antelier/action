"use strict";
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process"),crypto=require("node:crypto");
const root=path.resolve(process.argv[2]||""),out=path.resolve(__dirname,"..");
if(!process.argv[2])throw Error("Usage: node scripts/build.cjs <authorized engine checkout>");
const commit=cp.execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim();
if(cp.execFileSync("git",["status","--porcelain","--untracked-files=no"],{cwd:root,encoding:"utf8"}).trim())throw Error("Engine tracked files must be clean");
// The install contract travels with its engine revision; do not leave a newer
// runtime beside stale workflow permissions or manually maintained setup docs.
fs.copyFileSync(path.join(root,"github-app/execution-workflow.example.yml"),path.join(out,"execution-workflow.example.yml"));
fs.writeFileSync(path.join(out,"EXECUTION-VERIFICATION.md"),fs.readFileSync(path.join(root,"docs/journeys/pr-verification.md"),"utf8").replaceAll("](../../github-app/execution-workflow.example.yml)","](execution-workflow.example.yml)"));
const esbuild=require(path.join(root,"node_modules/esbuild"));
if(esbuild.version!=="0.28.1")throw Error("esbuild 0.28.1 is required");
const strip={name:"strip-test-modules",setup(b){b.onResolve({filter:/\.test(?:\.js)?$/},a=>({path:a.path,namespace:"test-stub"}));b.onLoad({filter:/.*/,namespace:"test-stub"},()=>({contents:"module.exports = Object.freeze({});",loader:"js"}));}};
(async()=>{
 const file=path.join(out,"dist/index.js");
 const result=await esbuild.build({absWorkingDir:root,entryPoints:["github-app/action-entry.js"],bundle:true,platform:"node",target:"node22",minify:true,legalComments:"none",outfile:file,metafile:true,plugins:[strip]});
 const imports=[...new Set(Object.values(result.metafile.inputs).flatMap(v=>v.imports.filter(i=>i.external).map(i=>i.path)))];
 if(imports.some(p=>p==="node:test"||p==="node:assert/strict"||p.startsWith(".")))throw Error("Unexpected runtime import: "+imports.join(","));
 const bytes=fs.readFileSync(file);
 const workerFile=path.join(out,"dist/journey-worker.js");
 await esbuild.build({absWorkingDir:root,entryPoints:["github-app/journey-worker.js"],bundle:true,platform:"node",target:"node22",minify:true,legalComments:"none",outfile:workerFile,external:["playwright-core"],plugins:[strip]});
 const vendor=path.join(root,"node_modules/playwright-core"),destination=path.join(out,"dist/node_modules/playwright-core");
 const version=JSON.parse(fs.readFileSync(path.join(vendor,"package.json"),"utf8")).version;
 // Vendor the pinned browser driver, including its licenses, but no browser
 // binary. No package manager or PR dependency install runs in either job.
 if(version!=="1.61.0")throw Error("playwright-core 1.61.0 is required");
 if(!fs.existsSync(destination))fs.cpSync(vendor,destination,{recursive:true,dereference:false});
 const vendorFiles=[];
 function inventory(dir,prefix="",rows=vendorFiles){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const name=prefix+entry.name,p=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error("Unexpected vendor symlink");if(entry.isDirectory())inventory(p,name+"/",rows);else{const data=fs.readFileSync(p);rows.push({path:name,bytes:data.length,sha256:crypto.createHash("sha256").update(data).digest("hex")});}}}
 inventory(destination);
 const expectedVendor=[];inventory(vendor,"",expectedVendor);
 if(JSON.stringify(vendorFiles)!==JSON.stringify(expectedVendor))throw Error("Vendored driver differs from pinned source; build into a clean checkout");
 fs.writeFileSync(path.join(out,"dist/vendor-manifest.json"),JSON.stringify(vendorFiles,null,2)+"\n");
 const workerBytes=fs.readFileSync(workerFile);
 const manifest={source_commit:commit,esbuild:esbuild.version,target:"node22",test_modules_excluded:true,bytes:bytes.length,sha256:crypto.createHash("sha256").update(bytes).digest("hex"),external_imports:imports,
 worker:{bytes:workerBytes.length,sha256:crypto.createHash("sha256").update(workerBytes).digest("hex")},playwright_core:version,vendor_manifest_sha256:crypto.createHash("sha256").update(fs.readFileSync(path.join(out,"dist/vendor-manifest.json"))).digest("hex")};
 fs.writeFileSync(path.join(out,"dist/manifest.json"),JSON.stringify(manifest,null,2)+"\n");console.log(JSON.stringify(manifest,null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1});
