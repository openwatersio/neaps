# @neaps/cli

## 0.2.0

### Minor Changes

- [#303](https://github.com/openwatersio/neaps/pull/303) [`4bf8c60`](https://github.com/openwatersio/neaps/commit/4bf8c60df48fe24433833f1cf7a105e9f63e4b0e) Thanks [@bkeepers](https://github.com/bkeepers)! - Update @neaps/tide-database to 0.9. Station prediction data now lives in an
  off-heap pack file read per station instead of being parsed into the JS heap
  at import, dropping baseline heap usage from ~118 MB to ~36 MB.

### Patch Changes

- Updated dependencies [[`4c57263`](https://github.com/openwatersio/neaps/commit/4c5726334a5a564f80c92d89292cf236eeae3dd5), [`de44633`](https://github.com/openwatersio/neaps/commit/de44633e5d20c11c462bee154aa91ebb0730688b), [`36a0b23`](https://github.com/openwatersio/neaps/commit/36a0b23a3f9b69fa52efc59cc62b877b0f90c7db), [`4bf8c60`](https://github.com/openwatersio/neaps/commit/4bf8c60df48fe24433833f1cf7a105e9f63e4b0e)]:
  - @neaps/api@0.7.0
  - neaps@0.8.0

## 0.1.3

### Patch Changes

- Updated dependencies [[`886392d`](https://github.com/openwatersio/neaps/commit/886392d790744b967710e9693aeca77e9371ebc6)]:
  - @neaps/api@0.6.0

## 0.1.2

### Patch Changes

- Updated dependencies [[`cd1341b`](https://github.com/openwatersio/neaps/commit/cd1341bc44e63398273dab4d2960c1437a15e518)]:
  - neaps@0.7.0
  - @neaps/api@0.5.1

## 0.1.1

### Patch Changes

- Updated dependencies [[`1af0c22`](https://github.com/openwatersio/neaps/commit/1af0c22bb2181915d879821c17ed909731d2f1d2)]:
  - @neaps/api@0.5.0
  - neaps@0.6.1

## 0.1.0

### Minor Changes

- [#218](https://github.com/openwatersio/neaps/pull/218) [`fe7ddbf`](https://github.com/openwatersio/neaps/commit/fe7ddbf85c2086fbfb0537a297ba840a50e29d9a) Thanks [@bkeepers](https://github.com/bkeepers)! - Created initial `neaps` CLI
