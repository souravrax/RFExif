import { detailEntries, loadDetail } from '$lib/server/catalog.js';
export const entries = () => detailEntries('lens');
export const load = ({ params }) => loadDetail('lens', params);
