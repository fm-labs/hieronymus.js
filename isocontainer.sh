#!/bin/bash

docker build -f isocontainer.Dockerfile -t fmlabs/isocontainer .
docker run --rm -p 8080:80 \
  -e MC_API_URL=http://host.docker.internal:3080 -e MC_API_KEY=supersecretkeysupersecretkeysupersecretkey \
  --add-host=host.docker.internal:host-gateway \
  fmlabs/isocontainer