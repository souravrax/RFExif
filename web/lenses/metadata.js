// Inventory metadata derived from catalog labels, never from generated artwork.
export const equipmentSlug = value => String(value).toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^[-.]+|[-.]+$/g, '');

export function enrichLensRecord(record) {
  const make = record.make || record.brand;
  const model = record.label.toLowerCase().startsWith(`${make.toLowerCase()} `)
    ? record.label.slice(make.length + 1) : record.label;
  const mount = record.mount;
  if (!mount) throw new Error(`Missing mount for ${record.label}`);
  const mountCode = equipmentSlug(mount);
  const focal = model.match(/(\d+(?:\.\d+)?)(?:[-–](\d+(?:\.\d+)?))?mm\b/i);
  const aperture = model.match(/\b([FT])\/?(\d+(?:\.\d+)?)(?:[-–](\d+(?:\.\d+)?))?\b/i);
  const sensorFormat = record.sensorFormat || (/\bRF-S\b|APS-C/i.test(model) ? 'APS-C'
    : /full[ -]frame/i.test(model) ? 'full-frame'
    : /\bS35\b/i.test(model) ? 'Super 35' : null);
  const categories = ['macro', 'fisheye', 'tilt', 'shift', 'cine', 'anamorphic'].filter(term => model.toLowerCase().includes(term));
  return {
    ...record, id: `lens:${equipmentSlug(make)}:${mountCode}:${equipmentSlug(model)}`,
    make, model, mountCode,
    series: /^RF-S\b/i.test(model) ? 'RF-S' : /^RF\b/i.test(model) ? 'RF' : null,
    sensorFormat,
    focalLength: focal ? {
      minMm: Number(focal[1]), maxMm: Number(focal[2] || focal[1]),
      type: focal[2] ? 'zoom' : 'prime', provenance: 'model-label',
    } : null,
    maximumAperture: aperture ? {
      wide: Number(aperture[2]), tele: Number(aperture[3] || aperture[2]),
      unit: aperture[1].toUpperCase() === 'T' ? 'T-stop' : 'f-number',
      raw: aperture[0], provenance: 'model-label',
    } : null,
    categories,
    // Unknown means unresearched, not absent, unsupported or zero.
    specifications: {
      weightG: null, lengthMm: null, diameterMm: null, filterThreadMm: null,
      minimumFocusDistanceM: null, maximumMagnification: null,
      opticalStabilization: null, weatherSealed: null, apertureBlades: null,
      opticalElements: null, opticalGroups: null, releaseDate: null,
      ...record.specifications,
    },
    metadataProvenance: {
      catalog: record.source, numericValues: 'parsed-from-model-label',
      sensorFormat: sensorFormat ? 'model-label' : null,
      unknownSpecifications: 'not-yet-researched',
      ...record.metadataProvenance,
    },
  };
}
