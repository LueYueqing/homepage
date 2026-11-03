import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const id = Date.now().toString(36);
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'build-id.mjs');
fs.writeFileSync(file, `export const BUILD_ID = ${JSON.stringify(id)};\n`);
console.log(id);
