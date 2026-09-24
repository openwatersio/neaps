#!/usr/bin/env node

import { createApp } from "@slackwater/api";

const port = process.env.PORT || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`Slackwater API listening on http://localhost:${port}`);
});
