import { createRequire } from "node:module";

// Load compiled path via tsx register by spawning is awkward — inline seed with dynamic import from tsx file.
const { seedDatabase } = await import("../services/seed-database.ts");

const result = await seedDatabase({ force: true });
console.log(JSON.stringify(result, null, 2));
