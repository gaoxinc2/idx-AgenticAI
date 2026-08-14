import {
  validateWithComps,
} from "./compValidation";

async function runTest() {
  try {
    const result =
      await validateWithComps(
        "Beverly Hills",
        3677,
        3_950_000,
      );

    console.log(
      "Comp validation result:",
    );

    console.log(result);

    if (result.compCount === 0) {
      console.log(
        "\nNo recent comps found for this test property.",
      );
    } else {
      console.log(
        `\nComps used: ${result.compCount}`,
      );

      console.log(
        `Average sold $/sqft: $${result.avgPricePerSqft}`,
      );

      console.log(
        `Estimated comp value: $${result.compPrice?.toLocaleString()}`,
      );

      console.log(
        `List price: $${result.listPrice.toLocaleString()}`,
      );

      console.log(
        `Difference: ${result.deltaPct}%`,
      );
    }
  } catch (error) {
    console.error(
      "Comp validation test failed:",
      error,
    );
  } finally {
    await poolEnd();
  }
}

async function poolEnd() {
  const { pool } =
    await import("./mysql");

  await pool.end();
}

runTest();