import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const backup = resolve(process.argv[2]);
const output = resolve(process.argv[3]);
const source = JSON.parse(await readFile(join(backup, 'verified-manifest.json'), 'utf8'));
await mkdir(output, { recursive: true });
const manifest = [];
for (const entry of source) {
  const bytes = await readFile(join(backup, entry.name));
  if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw Error('Backup checksum mismatch');
  let key = `items/${entry.name}.webp`, data, check, preservedOriginal = false;
  try {
    data = await sharp(bytes, {limitInputPixels: 40_000_000, failOn:'error'}).rotate()
      .resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:4}).toBuffer();
    check = await sharp(data).metadata();
    if(check.format !== 'webp' || check.width > 1600 || check.height > 1600) throw Error('Invalid optimized output');
  } catch (error) {
    // The old 68-byte test PNG has invalid PNG data. Preserve it byte-for-byte;
    // never discard an existing object just because it cannot be optimized.
    if(entry.name !== 'test-item-delete-me-mtq450d5-v6OkMhMjcMSqLBg7NU0VexHm1pnLHu.png' || entry.bytes !== 68) throw error;
    key = `items/${entry.name}`; data = bytes; check = {}; preservedOriginal = true;
  }
  await mkdir(join(output,'items'),{recursive:true});
  await writeFile(join(output,key),data);
  manifest.push({...entry,key,contentType:preservedOriginal?'image/png':'image/webp',preservedOriginal,optimizedBytes:data.length,width:check.width,height:check.height,optimizedSha256:createHash('sha256').update(data).digest('hex')});
}
await writeFile(join(output,'manifest.json'), JSON.stringify(manifest,null,2)+'\n');
await writeFile('lib/migrated-images.json',JSON.stringify(Object.fromEntries(manifest.map(e=>[e.url,e.key])),null,2)+'\n');
console.log(JSON.stringify({count:manifest.length,originalBytes:manifest.reduce((s,e)=>s+e.bytes,0),optimizedBytes:manifest.reduce((s,e)=>s+e.optimizedBytes,0)}));
