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

[[ $# -ne 1 || ! -f env.$1 ]] && {
    env_choices=$(printf '|%s' env.*)
    env_choices=${env_choices:1}
    env_choices=${env_choices//env./}

    printf 'usage: %s <%s>\n' "$0" "$env_choices" >&2
    exit 1
}

html_dest=dist/index.html

htmlgen "$1" >$html_dest
printf 'wrote html to %s\n' "$html_dest" >&2

cp -v style.css dist/
