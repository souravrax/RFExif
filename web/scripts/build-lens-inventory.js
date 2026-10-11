// Reviewed manufacturer catalog snapshots, 2026-10-11. Run from web/.
import fs from 'node:fs';
import { enrichLensRecord } from '../lenses/metadata.js';
const original = JSON.parse(fs.readFileSync('src/lib/generated-equipment.json'));
const records = [];
function add(brand, label, source, focus = 'manual', aliases = [], status = 'catalog-listed') {
  if (records.some(r => r.brand === brand && r.label === label)) return;
  records.push({ brand, label, mount: 'Canon RF', focus, status, source, aliases });
}
const canonSource = 'https://www.usa.canon.com/pro/rf-lens-world/advantages/lens-lineup';
for (const label of original.lens) add('Canon', label, canonSource, 'autofocus');
const canonMissing = `RF-S 18-150mm F3.5-6.3 IS STM
RF 7-14mm F2.8-3.5 L Fisheye STM
RF 15-30mm F4.5-6.3 IS STM
RF 16-28mm F2.8 IS STM
RF 24-50mm F4.5-6.3 IS STM
RF 24-105mm F2.8 L IS USM Z
RF 24-105mm F4-7.1 IS STM
RF 24-240mm F4-6.3 IS USM
RF 28-70mm F2 L USM
RF 28-70mm F2.8 IS STM
RF 70-200mm F2.8 L IS USM Z
RF 70-200mm F4 L IS USM
RF 100-300mm F2.8 L IS USM
RF 100-400mm F5.6-8 IS USM
RF 200-800mm F6.3-9 IS USM
RF-S 10-18mm F4.5-6.3 IS STM
RF-S 55-210mm F5-7.1 IS STM
RF 14mm F1.4 L VCM
RF 24mm F1.4 L VCM
RF 28mm F2.8 STM
RF 35mm F1.4 L VCM
RF 50mm F1.4 L VCM
RF 85mm F1.2 L USM DS
RF 135mm F1.8 L IS USM
RF 400mm F2.8 L IS USM
RF 600mm F4 L IS USM
RF 600mm F11 IS STM
RF 800mm F5.6 L IS USM
RF 800mm F11 IS STM
RF 1200mm F8 L IS USM
RF-S 3.9mm F3.5 STM Dual Fisheye
RF-S 7.8mm F4 STM Dual
RF 5.2mm F2.8 L Dual Fisheye`.split('\n');
for (const label of canonMissing) add('Canon', label, canonSource, label.includes('5.2mm') ? 'manual' : 'autofocus');
for (const [label, source] of [
  ['RF 20mm F1.4 L VCM', 'https://www.usa.canon.com/newsroom/2025/20250326-lens'],
  ['RF-S 14-30mm F4-6.3 IS STM PZ', 'https://www.usa.canon.com/shop/p/rf-s14-30mm-f4-6-3-is-stm-pz'],
  ['RF 20-50mm F4 L IS USM PZ', 'https://www.usa.canon.com/support/p/rf20-50mm-f4-l-is-usm-pz-lens'],
  ['RF 45mm F1.2 STM', 'https://personal.canon.jp/product/camera/rf/rf-lensworld/features/rf-lineup'],
  ['RF 85mm F1.4 L VCM', 'https://www.canon.com.au/camera-lenses/rf-85mm-f1-4l-vcm'],
]) add('Canon', label, source, 'autofocus');
for (const label of `12mm F1.4 DC Contemporary;15mm F1.4 DC Contemporary;16mm F1.4 DC DN Contemporary;23mm F1.4 DC DN Contemporary;30mm F1.4 DC DN Contemporary;56mm F1.4 DC DN Contemporary;10-18mm F2.8 DC DN Contemporary;16-300mm F3.5-6.7 DC OS Contemporary;17-40mm F1.8 DC Art;18-50mm F2.8 DC DN Contemporary;50-120mm F2.8 DC OS Contemporary`.split(';')) {
  add('Sigma', `Sigma ${label}`, 'https://www.sigma-global.com/en/special/sigma_rfmount_lenses/', 'autofocus', [`Sigma ${label.replace(/ Contemporary| Art/g, '')}`]);
}
add('Tamron', 'Tamron 11-20mm F2.8 Di III-A RXD', 'https://www.tamron.com/global/consumer/sp/rfmount_series/', 'autofocus', ['Tamron 11-20mm F2.8 Di III-A RXD B060']);
add('Tamron', 'Tamron 18-300mm F3.5-6.3 Di III-A VC VXD', 'https://www.tamron.com/global/consumer/sp/rfmount_series/', 'autofocus', ['Tamron 18-300mm F3.5-6.3 Di III-A VC VXD B061']);
add('Viltrox', 'Viltrox AF 85mm F1.8 RF', 'https://www.viltrox.com.tw/downloads/', 'autofocus', ['Viltrox AF85/1.8RF'], 'historical');
add('Samyang', 'Samyang AF 12mm F2 RF-S', 'https://samyangus.com/collections/auto-focus/12mm', 'autofocus');
for (const label of ['14mm F2.8', '85mm F1.4']) {
  add('Samyang', `Samyang AF ${label} RF`, 'https://www.lksamyang.com/upload/file/2022_SAMYANG_OPTICS_Catalogue_EN.pdf', 'autofocus', [`Rokinon AF ${label} RF`], 'historical');
  add('Samyang', `Samyang MF ${label} RF`, 'https://samyangus.com/collections/manual-focus/canon-rf', 'manual', [`Samyang ${label} RF`, `Rokinon ${label} RF`]);
}
// These are catalog descriptions; unknown exact EXIF spellings remain unmapped.
for (const label of ['85mm F1.8 Full Frame', '50mm F1.8 Full Frame', '35mm F2 Full Frame', '35mm F1.8 APS-C', '50mm F1.8 APS-C', '23mm F1.4 APS-C', '33mm F1.4 APS-C', '56mm F1.4 APS-C']) add('Yongnuo', `Yongnuo ${label} RF`, 'https://th.hkyongnuo.com/pages/auto-focus-rf-lens', 'autofocus');
const snapshot = site => JSON.parse(fs.readFileSync(`lenses/sources/${site}.json`));
for (const p of snapshot('ttartisan.store')) {
  if (p.title.includes('Dual Bokeh Cine')) {
    for (const mm of [35,50,85]) add('TTArtisan', `TTArtisan ${mm}mm T2.1 Dual Bokeh Cine`, p.url);
    continue;
  }
  const label = `TTArtisan ${p.title.replace(/ Multi mounts| Multi Mounts| Multi mount| Telephoto lens/gi, '').replace('F2.0', 'F2')}`;
  add('TTArtisan', label, p.url);
}
for (const p of snapshot('7artisans.store')) {
  if (/Adapter|for PL/.test(p.title)) continue;
  const title = p.title.replace(/^MF /, '').split(/ for | lens for | Lens for /)[0].replace(/Ⅲ/g, 'III').replace(/f\//g, 'F').replace(/\s+/g, ' ').trim();
  if (/^35mm\/50mm\/75mm T1.5/.test(title)) {
    for (const mm of [35,50,75]) add('7Artisans', `7Artisans ${mm}mm T1.5 Full Frame Cine`, p.url);
  } else if (/^10mm\/16mm\/25mm\/35mm\/50mm\/85mm T2.1/.test(title)) {
    for (const mm of [10,16,25,35,50,85]) add('7Artisans', `7Artisans ${mm}mm T2.1 S35 Cine`, p.url);
  } else add('7Artisans', `7Artisans ${title}`, p.url);
}
const brightLabels = new Map();
for (const p of snapshot('brightinstar.com')) {
  if (/Adapter|Leica M|28mm F2.8/i.test(p.title)) continue;
  let name = p.title.match(/(?:\d+(?:\.\d+)?mm)\s+F[\d.]+(?:\s+(?:III|II|IV|Pro|TRI-SIGHT))?/i)?.[0];
  if (!name) continue;
  name = name.replace(/F2\.0/i,'F2').replace(/F1\.0(?=\s|$)/i,'F1');
  const format = /APS-C/i.test(p.title) ? 'APS-C' : 'Full Frame';
  brightLabels.set(`${name} ${format}`, p.url);
}
for (const [label, source] of brightLabels) add('Brightin Star', `Brightin Star ${label}`, source);
for (const [series, focal, aperture, url] of [
  ['Night Walker', [16,24,35,55,75], 'T1.2 S35 Cine', 'night-walker-t1-2-s35-cine-lens-series'],
  ['Saturn', [35,50,75], 'T2.9 1.6x Anamorphic', 'saturn-35mm-50mm-75mm-full-frame-carbon-fiber-anamorphic-lens'],
  ['Saturn V2', [35,50,75], 'T2.9 1.6x Anamorphic', 'saturn-v2-series-full-frame-anamorphic-cine-lens'],
  ['Venus', [35,50,75,100,150], 'T2.9 1.6x Anamorphic', 'sirui-venus-anamorphic-lens-kit'],
  ['Venus', [135], 'T2.9 1.8x Anamorphic', 'sirui-135mm-t2-9-1-8x-full-frame-anamorphic-lens'],
  ['Vision Prime', [15,75,150], 'T1.4 Cine', 'sirui-vision-prime-15-75-150mm-t1-4-full-frame-cine-lens'],
  ['Vision Prime', [24,35,50], 'T1.4 Cine', 'vision-prime-1-series-t1-4-full-frame-cine-lens'],
  ['S35', [24], 'F2.8 1.33x Anamorphic', 'sirui-1-33x-s35-series-anamorphic-lens'],
  ['S35', [35,50,75], 'F1.8 1.33x Anamorphic', 'sirui-1-33x-s35-series-anamorphic-lens'],
]) for (const mm of focal) add('Sirui', `Sirui ${series} ${mm}mm ${aperture}`, `https://store.sirui.com/products/${url}`);
for (const label of ['Speedmaster 20mm T1.0 S35 Cine','Speedmaster 35mm T1.0 S35 Cine','Speedmaster 50mm T1.0 S35 Cine','200mm F4 1X APO Macro','Creator 28mm F5.6','Speedmaster 90mm F1.5','Creator 135mm F2.5']) add('Mitakon', `Mitakon ${label}`, 'https://zyoptics.net/');
add('Mitakon', 'Mitakon 55mm F2.8 1-5X Macro', 'https://zyoptics.net/product/mitakon-55mm-f-2-8-1-5x-macro-lens/');
add('Laowa', 'Laowa 90mm F2.8 2X Ultra Macro APO', 'https://www.venuslens.net/shop/?product_tag=RF');
add('Laowa', 'Laowa 65mm F2.8 2X Ultra Macro APO', 'https://www.venuslens.net/product-tag/l/?product_view=list');
const missing = records.slice(16);
const sheets = [];
for(let start=0; start<missing.length; start+=16) {
  const models = missing.slice(start,start+16);
  const number = sheets.length + 2;
  const file = `rf-lenses-${String(number).padStart(2,'0')}${[5,13].includes(number)?'-v2':''}-4x4.png`;
  const prompt = `Use case: stylized-concept. Create one square transparent PNG sprite sheet with EXACTLY 4 columns and 4 rows, 16 equally sized invisible cells. Each specified lens is centered inside the central 70% of its cell, full product with generous safe margins, never crossing cell boundaries. Consistent front three-quarter view, standing upright, front glass visible from slightly above, no hood or caps. Retro black-ink technical engraving, warm cream highlights, fine halftone hatching, restrained red rings on Canon L lenses, ivory barrels on long Canon L telephotos, black rubber focus rings. Manual primes have aperture rings; cine lenses have geared rings; anamorphics have rectangular-looking front elements. Distinctive relative proportions, visibly illustrative rather than accurate product photography. True transparent background, no gridlines, no labels, no typography, no scenery, no external shadows. Row-major cell assignment: ${models.map((r,i)=>`cell ${i+1}: ${r.brand === 'Canon'?'Canon ':''}${r.label}`).join('; ')}. ${models.length<16?`Cells ${models.length+1} through 16 must be entirely transparent and empty.`:'All 16 cells occupied by exactly one lens each.'}`;
  models.forEach((r,index)=>Object.assign(r,{sheet:file,index}));
  sheets.push({file,prompt,models:models.map(r=>r.label)});
}
records.slice(0,16).forEach((r,index)=>Object.assign(r,{sheet:'canon-lenses-4x4.png',index}));
const inventory = {verifiedAt:'2026-10-11',scope:'Verified native Canon RF/RF-S lens models, autofocus and manual focus, including selected cine and historical lenses. Lower bound, not an exhaustive world census. Color variants, bundles, adapters and rebrands are not separate models.',previouslyIllustrated:16,records,sheets};
fs.mkdirSync('lenses',{recursive:true});
inventory.schemaVersion = 2;
const overrides = JSON.parse(fs.readFileSync('lenses/overrides.json'));
inventory.records = records.map(record => enrichLensRecord({ ...record, ...overrides[record.label] }));
fs.writeFileSync('lenses/inventory.json', JSON.stringify(inventory,null,2)+'\n');
fs.writeFileSync('src/lib/generated-lenses.json', JSON.stringify(inventory.records.map(({label,aliases,sheet,index})=>({label,aliases,sheet,index})),null,2)+'\n');
console.log(JSON.stringify({total:records.length,missing:missing.length,sheets:sheets.length,brands:records.reduce((a,r)=>(a[r.brand]=(a[r.brand]||0)+1,a),{})}));
