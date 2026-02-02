#!/usr/bin/env node

import { createApp } from "@neaps/api";

const port = process.env.PORT || 3000;
const app = createApp();

app.listen(port, () => {
  console.log(`Neaps API listening on http://localhost:${port}`);
});
