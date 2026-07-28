---
"@neaps/api": patch
---

Add `s-maxage` to the `Cache-Control` header so CDNs and edge caches (e.g. Vercel, Cloudflare) cache responses, not just browsers. Uses the same TTL as `max-age` (`NEAPS_API_MAX_AGE`, default 3600).
