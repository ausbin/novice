#!/bin/bash

html=index-proto.html

htmlgen() {
    local name=$1
    local env=env.$name

    {
        while IFS='=' read -r -a fields; do
            printf 's|\\<%s\\>|%s|g\n' "${fields[0]}" "${fields[1]}"
        done <"$env"
    } | sed -f - "$html"
}

htmlgen prod >index.html
htmlgen dev >index-dev.html
