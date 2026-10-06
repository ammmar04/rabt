import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import { optimizePhoto } from '../lib/optimize-photo.ts';
const require = createRequire(new URL('../lib/image-urls.ts',import.meta.url));
const code = ts.transpileModule(readFileSync(new URL('../lib/image-urls.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
function mapper(base){
 const mod={exports:{}};
 vm.runInNewContext(code,{exports:mod.exports,require,process:{env:{NEXT_PUBLIC_IMAGE_BASE_URL:base}},URL});
 return mod.exports.imageSrc;
}
const migrated=require('./migrated-images.json');
const [url,key]=Object.entries(migrated)[0];
test('maps only verified exact source URLs and preserves local/new photos',()=>{
 const src=mapper('https://images.ammarfaisal.com/');
 assert.equal(src(url),`https://images.ammarfaisal.com/${key}`);
 for(const other of ['/img/items/placeholder.svg','blob:preview','https://example.com/photo.png',url+'?new=1','https://images.ammarfaisal.com/items/new.webp','__proto__']) assert.equal(src(other),other);
 assert.equal(src(null),'');
});
test('blank or unsafe base keeps the original photos for rollback',()=>{
 for(const base of ['',undefined,'http://images.ammarfaisal.com','https://user:password@images.ammarfaisal.com','invalid']) assert.equal(mapper(base)(url),url);
});
test('compresses, strips metadata, orients and bounds large photos',async()=>{
 const input=await sharp({create:{width:2400,height:1200,channels:3,background:'#b37f66'}}).jpeg().withMetadata({orientation:6}).toBuffer();
 const result=await optimizePhoto(input);
 const meta=await sharp(result).metadata();
 assert.equal(meta.format,'webp');
 assert.equal(meta.width,800); assert.equal(meta.height,1600);
 assert.equal(meta.exif,undefined); assert.ok(result.length<input.length);
 const small=await sharp({create:{width:40,height:50,channels:3,background:'white'}}).png().toBuffer();
 const sm=await sharp(await optimizePhoto(small)).metadata();
 assert.equal(sm.width,40); assert.equal(sm.height,50);
});
test('rejects SVG, spoofed raster, corrupt data and excessive pixels',async()=>{
 for(const bytes of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),Buffer.from([0xff,0xd8,0xff,1,2,3]),Buffer.from('not a photo')]) await assert.rejects(()=>optimizePhoto(bytes),/could not be read/);
 const huge=await sharp({create:{width:6500,height:6500,channels:3,background:'white'}}).png().toBuffer();
 await assert.rejects(()=>optimizePhoto(huge),/could not be read/);
});
const storageCode=ts.transpileModule(readFileSync(new URL('../lib/storage.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
function storage(env,transport){
 const mod={exports:{}}; let blobCalls=0;
 const mockRequire=(id)=>{
  if(id==='server-only') return {};
  if(id==='./optimize-photo') return {optimizePhoto};
  if(id==='@aws-sdk/client-s3') return {
   S3Client:class {constructor(options){transport.options=options;} async send(command){transport.commands.push(command.input);if(transport.fail)throw Error('private-provider-debug-data');}destroy(){}},
   PutObjectCommand:class {constructor(input){this.input=input;}}
  };
  if(id==='@vercel/blob') return {put:async()=>{blobCalls++;return {url:'https://legacy.invalid/photo'};}};
  return require(id);
 };
 vm.runInNewContext(storageCode,{exports:mod.exports,require:mockRequire,process:{env:{NODE_ENV:'production',...env}},Buffer,URL});
 return {...mod.exports,blobCalls:()=>blobCalls};
}
const configured={IMAGE_STORAGE_PROVIDER:'r2',R2_ACCOUNT_ID:'a'.repeat(32),R2_ACCESS_KEY_ID:'test-access',R2_SECRET_ACCESS_KEY:'test-secret',R2_BUCKET_NAME:'rabt-images',NEXT_PUBLIC_IMAGE_BASE_URL:'https://images.ammarfaisal.com',BLOB_READ_WRITE_TOKEN:'retained-rollback-token'};
test('R2 saves compressed content with immutable headers and unique keys',async()=>{
 const transport={commands:[]}; const api=storage(configured,transport);
 const bytes=await sharp({create:{width:100,height:120,channels:3,background:'white'}}).png().toBuffer();
 const file=new File([bytes],'untrusted.svg',{type:'image/svg+xml'});
 const first=await api.saveUpload(file,'../../Some Dress'); const second=await api.saveUpload(file,'../../Some Dress');
 assert.notEqual(first,second); assert.match(first,/^https:\/\/images\.ammarfaisal\.com\/items\/some-dress-[a-f0-9-]+\.webp$/);
 assert.equal(api.blobCalls(),0); assert.equal(transport.options.region,'auto');
 for(const command of transport.commands){assert.equal(command.Bucket,'rabt-images');assert.equal(command.ContentType,'image/webp');assert.equal(command.CacheControl,'public, max-age=31536000, immutable');assert.equal((await sharp(command.Body).metadata()).format,'webp');}
});
test('R2 failures never fall back to metered Blob or disclose provider errors',async()=>{
 const bytes=await sharp({create:{width:8,height:8,channels:3,background:'white'}}).png().toBuffer();const file=new File([bytes],'a.png');
 const transport={commands:[],fail:true};const api=storage(configured,transport);
 await assert.rejects(()=>api.saveUpload(file),e=>e.message==='The photo could not be saved. Please try again in a moment.');assert.equal(api.blobCalls(),0);
 const broken=storage({...configured,R2_SECRET_ACCESS_KEY:''},{commands:[]});
 assert.equal(broken.imageStorageConfigured(),false);
 await assert.rejects(()=>broken.saveUpload(file),/not connected/);assert.equal(broken.blobCalls(),0);
});
test('upload validation rejects SVG and oversized input before writing',async()=>{
 const transport={commands:[]};const api=storage(configured,transport);
 await assert.rejects(()=>api.saveUpload(new File(['<svg><script/></svg>'],'fake.png',{type:'image/png'})),/not a photo/);
 await assert.rejects(()=>api.saveUpload(new File([new Uint8Array(8*1024*1024+1)],'large.png')),/larger than 8 MB/);
 assert.equal(transport.commands.length,0);
});
