import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const builtAt = new Date();
const id = builtAt.getTime().toString(36);
const time = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
}).format(builtAt);
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'build-id.mjs');
fs.writeFileSync(
  file,
  `export const BUILD_ID = ${JSON.stringify(id)};\nexport const BUILD_TIME = ${JSON.stringify(time)};\n`,
);
console.log(`${id} ${time}`);
