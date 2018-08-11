#!/bin/bash
set -e

{
    printf '/* tslint:disable */\n'
    printf '// WARNING: GENERATED CODE by generate-parse-table.sh\n'
    printf "import { NT, T } from './grammar';\n"
    printf "import { ParseTable } from './tablegen';\n"
    printf 'const table: ParseTable<NT, T> = '
    node novice/main.js tablegen
    printf ';\n'
    printf 'export default table;\n'
} >novice/assembler/lr1/table.ts
