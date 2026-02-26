import { Command } from "commander";
import { createApp } from "@neaps/api";
import type { Server } from "node:http";

let server: Server | null = null;

export async function stop() {
  if (!server) return;
  await new Promise<void>((resolve, reject) =>
    server?.close((err) => (err ? reject(err) : resolve())),
  );
  server = null;
}

export default new Command("serve")
  .description("Start the Neaps API server")
  .option("-p, --port <port>", "port to listen on", "3000")
  .action(async (opts) => {
    const port = parseInt(opts.port, 10);
    const app = createApp({ prefix: "/" });

    await new Promise<void>((resolve) => {
      server = app.listen(port, () => {
        console.log(`Neaps API listening on http://localhost:${port}`);
        resolve();
      });
    });
  });
