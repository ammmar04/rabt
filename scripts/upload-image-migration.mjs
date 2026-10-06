import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import nextEnv from '@next/env';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
nextEnv.loadEnvConfig(process.cwd());
const dir = resolve(process.argv[2]);
const manifest = JSON.parse(await readFile(join(dir,'manifest.json'),'utf8'));
const accountId = process.env.R2_ACCOUNT_ID;
if(!/^[a-f0-9]{32}$/.test(accountId||'') || process.env.R2_BUCKET_NAME !== 'rabt-images') throw Error('Unexpected target');
const s3 = new S3Client({region:'auto',endpoint:`https://${accountId}.r2.cloudflarestorage.com`,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY},maxAttempts:3});
const results=[];
try {
  for(const entry of manifest){
    const bytes=await readFile(join(dir,entry.key));
    if(createHash('sha256').update(bytes).digest('hex')!==entry.optimizedSha256) throw Error('Local checksum mismatch');
    let exists;
    try { exists=await s3.send(new HeadObjectCommand({Bucket:'rabt-images',Key:entry.key})); }
    catch(error) { if(error.$metadata?.httpStatusCode!==404) throw error; }
    if(exists){
      if(exists.Metadata?.sha256!==entry.optimizedSha256 || exists.ContentLength!==bytes.length) throw Error('Existing object differs; refusing overwrite');
    } else await s3.send(new PutObjectCommand({Bucket:'rabt-images',Key:entry.key,Body:bytes,ContentType:entry.contentType,CacheControl:'public, max-age=31536000, immutable',Metadata:{sha256:entry.optimizedSha256}}));
    const remote=await s3.send(new GetObjectCommand({Bucket:'rabt-images',Key:entry.key}));
    const data=await remote.Body.transformToByteArray();
    if(createHash('sha256').update(data).digest('hex')!==entry.optimizedSha256 || remote.ContentType!==entry.contentType || remote.CacheControl!=='public, max-age=31536000, immutable') throw Error('Remote verification failed');
    results.push({key:entry.key,bytes:data.length,sha256:entry.optimizedSha256,verified:true});
    console.log(`Verified ${results.length}/${manifest.length}`);
  }
  await writeFile(join(dir,'r2-verification.json'),JSON.stringify(results,null,2)+'\n');
} finally { s3.destroy(); }
