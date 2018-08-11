import { goal, grammar, NT, NTs, T, Ts } from './grammar';
import table from './table';
import { TableGenerator } from './tablegen';

function genTable(): object {
    const tablegen = new TableGenerator<NT, T>(goal, grammar, NTs, Ts);
    return tablegen.genTable();
}

export { genTable, table };
