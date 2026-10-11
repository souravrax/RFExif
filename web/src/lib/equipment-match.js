export function normalizeEquipment(value) {
  return String(value || '').toLowerCase().replace(/^canon\s*/, '').replace(/[–—]/g, '-').replace(/f\//g, 'f').replace(/\s+/g, '').trim();
}

export function findLensIllustration(records, model) {
  if (!model) return null;
  const key = normalizeEquipment(model);
  const matches = records.filter(record => [record.label, ...record.aliases].some(label => normalizeEquipment(label) === key));
  // Ambiguous metadata must never select an arbitrary product variant.
  return matches.length === 1 ? matches[0] : null;
}
