import { query } from "./mysql";

async function test() {
  const rows = await query<any>(
    "SELECT COUNT(*) AS count FROM rets_property"
  );

  console.log(rows);
}

test();