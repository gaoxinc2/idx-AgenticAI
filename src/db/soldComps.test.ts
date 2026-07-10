import { getSoldComps } from "./soldComps";

async function run() {
  const sold = await getSoldComps("Irvine");

  console.log(sold);
}

run();