# @neaps/api

## 0.4.0

### Minor Changes

- [#229](https://github.com/openwatersio/neaps/pull/229) [`42f9e92`](https://github.com/openwatersio/neaps/commit/42f9e92222aa09d5c5e0621e77690a931409f8b4) Thanks [@bkeepers](https://github.com/bkeepers)! - Add configurable route prefix support to `createApp()`.

  Routes are now defined without a prefix (e.g. `/extremes`, `/stations`) and mounted at a configurable `prefix` option (defaults to `/tides` for backward compatibility). Also adds a root `/` endpoint returning API info, and the OpenAPI spec now includes a `servers` field reflecting the configured prefix.

- [#227](https://github.com/openwatersio/neaps/pull/227) [`b3efa7c`](https://github.com/openwatersio/neaps/commit/b3efa7cf2460f5f21e490b42f81782878f65d7ed) Thanks [@bkeepers](https://github.com/bkeepers)! - Add support for subordinate station predictions in the API.

  `GET /tides/timeline` and `GET /tides/waterlevel` now return predictions for subordinate stations instead of a 400 error.

### Patch Changes

- Updated dependencies [[`b3efa7c`](https://github.com/openwatersio/neaps/commit/b3efa7cf2460f5f21e490b42f81782878f65d7ed)]:
  - neaps@0.6.0

## 0.3.3

### Patch Changes

- [#215](https://github.com/openwatersio/neaps/pull/215) [`df11392`](https://github.com/openwatersio/neaps/commit/df11392748559d477f0dc70ca910147fcc3414f3) Thanks [@bkeepers](https://github.com/bkeepers)! - Default to station's chart datum (usually LAT or MLLW)

- Updated dependencies [[`df11392`](https://github.com/openwatersio/neaps/commit/df11392748559d477f0dc70ca910147fcc3414f3)]:
  - neaps@0.5.1

## 0.3.2

### Patch Changes

- Updated dependencies [[`9f3fdf6`](https://github.com/openwatersio/neaps/commit/9f3fdf6785492a97dae717a6257c5358fc661e07)]:
  - neaps@0.5.0

## 0.3.1

### Patch Changes

- Updated dependencies [[`355f696`](https://github.com/openwatersio/neaps/commit/355f6960af6fc6cd9a5c3d592b5303bb0e4485e9)]:
  - neaps@0.4.0

## 0.3.0

### Minor Changes

- [#199](https://github.com/openwatersio/neaps/pull/199) [`8f2aee6`](https://github.com/openwatersio/neaps/commit/8f2aee600947e7b7c09466d310d03c5b9491b516) Thanks [@bkeepers](https://github.com/bkeepers)! - /tides/stations without coordinates will now return all stations

- [`29a4cb0`](https://github.com/openwatersio/neaps/commit/29a4cb01fd31aefe7d42f1b0f24fea9bc6d6d0d4) Thanks [@bkeepers](https://github.com/bkeepers)! - Added `query` parameter to /tides/stations endpoint to search stations

- [#199](https://github.com/openwatersio/neaps/pull/199) [`8f2aee6`](https://github.com/openwatersio/neaps/commit/8f2aee600947e7b7c09466d310d03c5b9491b516) Thanks [@bkeepers](https://github.com/bkeepers)! - Added caching, compression, and CORS

### Patch Changes

- Updated dependencies [[`c885cce`](https://github.com/openwatersio/neaps/commit/c885cceb9f1632bc2bdb087fccde3f43928c2c5e)]:
  - neaps@0.3.1
