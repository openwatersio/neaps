import { Command } from "commander";
import { createApp } from "@neaps/api";

let abortController: AbortController | null = null;

export function stop() {
  abortController?.abort();
}

export default new Command("serve")
  .description("Start the Neaps API server")
  .option("-p, --port <port>", "port to listen on", "3000")
  .action(async (opts) => {
    const port = parseInt(opts.port, 10);
    const app = createApp({ prefix: "/" });

    await new Promise<void>((resolve) => {
      const server = app.listen(port, () => {
        console.log(`Neaps API listening on http://localhost:${port}`);
        resolve();
      });

      abortController = new AbortController();
      abortController.signal.addEventListener("abort", () => {
        server.close(() => {
          console.log("Neaps API server stopped");
        });
      });
    });
  });
