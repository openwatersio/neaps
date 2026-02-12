import { constituents, defineConstituent } from "./definition.js";
import { DefineConstituentOptions } from "./types.js";
import data from "./data.json" with { type: "json" };

// Define constituents from data file
for (const entry of data) {
  defineConstituent(entry as DefineConstituentOptions);
}

export default constituents;
