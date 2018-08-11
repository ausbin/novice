import { goal, grammar, NT, NTs, T, Ts } from './grammar';
import { Parser, ParseTree } from './parser';
import table from './table';
import { TableGenerator } from './tablegen';

function genTable(): object {
    const tablegen = new TableGenerator<NT, T>(goal, grammar, NTs, Ts);
    return tablegen.genTable();
}

export { NT, Parser, ParseTree, T, genTable, table };
