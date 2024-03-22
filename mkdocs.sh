#!/bin/bash

TAGNAME=world-docs
PORT=8002

case $1 in
    "make")
        docker build -t ${TAGNAME} -f docs/Dockerfile .
        ;;
    "new")
        docker run --rm -it -v $(pwd):/docs ${TAGNAME} new .
        ;;
    "build")
        docker run --rm -it -v $(pwd):/docs ${TAGNAME} build
        ;;
    "serve")
        docker run --rm -it -v $(pwd):/docs -p ${PORT}:8000 ${TAGNAME}
        ;;
    *)
        echo "Usage: $0 {make|new|build|serve}"
        exit 1
        ;;
esac
