#!/bin/bash

case $1 in
    "make")
        docker build -t world-mkdocs-material -f docs/Dockerfile .
        ;;
    "new")
        docker run --rm -it -v $(pwd):/docs world-mkdocs-material new .
        ;;
    "build")
        docker run --rm -it -v $(pwd):/docs world-mkdocs-material build
        ;;
    "serve")
        docker run --rm -it -v $(pwd):/docs -p 8002:8000 world-mkdocs-material
        ;;
    *)
        echo "Usage: $0 {make|new|build|serve}"
        exit 1
        ;;
esac

