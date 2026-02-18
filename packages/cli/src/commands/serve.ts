import { Command } from "commander";
import { createApp } from "@neaps/api";

export const serve = new Command("serve")
  .description("Start the Neaps API server")
  .option("-p, --port <port>", "port to listen on", "3000")
  .action((opts) => {
    const port = parseInt(opts.port, 10);
    const app = createApp();

    app.listen(port, () => {
      console.log(`Neaps API listening on http://localhost:${port}`);
    });
  });
