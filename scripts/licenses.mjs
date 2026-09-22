import { readFile, writeFile } from 'node:fs/promises';
const packages = ['react', 'react-dom', 'leaflet', 'lucide-react'];
let notices = await readFile('public/THIRD-PARTY-NOTICES.txt', 'utf8');
for (const name of packages) notices += `\n\n======== ${name} ========\n\n${await readFile(`node_modules/${name}/LICENSE`, 'utf8')}`;
await writeFile('dist/THIRD-PARTY-NOTICES.txt', notices);
