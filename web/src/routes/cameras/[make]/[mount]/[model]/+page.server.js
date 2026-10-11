import { detailEntries, loadDetail } from '$lib/server/catalog.js';
export const entries = () => detailEntries('camera');
export const load = ({ params }) => loadDetail('camera', params);
