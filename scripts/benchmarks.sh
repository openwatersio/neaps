#!/bin/bash

set -e

for file in benchmarks/*.ts; do
  echo "=========== $file ==========="
  node "$file"
done
