import { buildApp } from "./app.js";

const port = Number(process.env.PORT ?? 4310);

async function main() {
  const app = await buildApp();
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
