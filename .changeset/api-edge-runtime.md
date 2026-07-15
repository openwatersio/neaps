---
"@neaps/api": minor
---

Make the API runnable on edge runtimes (e.g. Cloudflare Workers).

- Replace the runtime `express-openapi-validator` with lightweight request
  validation/coercion in `validate.ts`. The validator relies on Ajv codegen
  (`new Function`), which edge runtimes disallow. It's now a dev dependency
  mounted in the test suite, so requests and responses are still validated
  against the OpenAPI spec — keeping the runtime validators in alignment with it.
- Add a `compress` option to `createApp` (default `true`). The `compression()`
  middleware corrupts responses through the `node:http` bridge on Workers, which
  compress at the edge anyway — pass `createApp({ compress: false })` there.
- Declare `@neaps/tide-database` as a direct dependency so it's externalized
  from the build instead of bundled. Shrinks the published `dist` from ~30 MB to
  ~20 KB and avoids the station database being bundled twice by downstream
  bundlers.
