// Generate seeds only for the not-yet-applied wardrobe migration; metadata is shared with the client.
import { readFileSync, writeFileSync } from 'node:fs';
const items = JSON.parse(readFileSync('../content/avatar/wardrobe.json')).items;
const q = (s) => `'${s.replaceAll("'", "''")}'`;
const rows = items
  .map((i) => `(${q(i.id)},'avatar',${q(i.slot)},${q(i.name)},${i.price},'{1,1}',false,true,true)`)
  .join(',\n');
const parts = items
  .map(
    (i) =>
      `(${q(i.id)},${q(i.character)},${q(i.runtimeId)},${q(i.slot)},ARRAY[${i.conflicts.map(q).join(',')}]::text[])`,
  )
  .join(',\n');
const path = '../supabase/migrations/0023_avatar_wardrobe.sql';
const sql = readFileSync(path, 'utf8');
writeFileSync(
  path,
  sql.replace(
    /-- BEGIN GENERATED CATALOG[\s\S]*?-- END GENERATED CATALOG/,
    `-- BEGIN GENERATED CATALOG\ninsert into items(id,kind,slot,name_de,price,footprint,starter,active,shop_visible) values\n${rows};\ninsert into avatar_parts(item_id,character,runtime_id,slot,conflicts) values\n${parts};\n-- END GENERATED CATALOG`,
  ),
);
