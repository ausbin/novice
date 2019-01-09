import { Instruction as IsaInstruction, Isa } from '../isa';
import { Instruction, ParsedAssembly, PseudoOp, Section } from '../parsers';
import { MachineCodeGenerator, MachineCodeSection } from './codegen';

interface ReassembleVictim {
    // Index in words array in MachineCodeSection
    index: number;
    sectionIdx: number;
    instrIdx: number;
}

type SymbTable = {[s: string]: number};

class BaseMachineCodeGenerator implements MachineCodeGenerator {
    public gen(isa: Isa, asm: ParsedAssembly): MachineCodeSection[] {
        const sections: MachineCodeSection[] = [];
        const symbtable: SymbTable = {};
        const reassemble: ReassembleVictim[] = [];

        for (let i = 0; i < asm.sections.length; i++) {
            const asmSection = asm.sections[i];
            sections.push({startAddr: asmSection.startAddr, words: []});

            for (let j = 0; j < asmSection.instructions.length; j++) {
                const pc = sections[i].startAddr + sections[i].words.length;

                // TODO: super inefficient. sort the list of labels first.
                // Add to symbol table if needed
                for (const label of Object.keys(asm.labels)) {
                    const [sectionIdx, instrIdx] = asm.labels[label];
                    if (sectionIdx === i && instrIdx === j) {
                        symbtable[label] = pc;
                    }
                }

                const instr = asmSection.instructions[j];
                const [words, hasLabel] = this.inflateInstr(isa, instr, pc, null);

                // If this instruction uses a label, we'll need to
                // reassmble it
                if (hasLabel) {
                    reassemble.push({index: sections[i].words.length,
                                     sectionIdx: i,
                                     instrIdx: j});
                }

                sections[i].words = sections[i].words.concat(words);
            }
        }

        for (const victim of reassemble) {
            const section = asm.sections[victim.sectionIdx];
            const instr = section.instructions[victim.instrIdx];
            const pc = sections[victim.sectionIdx].startAddr + victim.index;
            const [words, _] = this.inflateInstr(isa, instr, pc, symbtable);

            for (let k = 0; k < words.length; k++) {
                sections[victim.sectionIdx].words[victim.index + k] = words[k];
            }
        }

        // TODO: check for overlapping sections

        return sections;
    }

    private inflateInstr(isa: Isa,
                         instr: Instruction|PseudoOp,
                         pc: number,
                         symbtable: SymbTable|null): [number[], boolean] {
        // TODO: actually implement pseudoops
        if (instr.kind === 'pseudoop') {
            return [[0, 0, 0, 0], false];
        } else {
            let match: IsaInstruction|null = null;

            // TODO: Figure out a more efficient way than this. just a
            //       hashmap right?
            for (const isaInstr of isa.instructions) {
                if (this.instrMatch(instr, isaInstr)) {
                    match = isaInstr;
                    break;
                }
            }

            if (!match) {
                // TODO: include reg prefixes
                const operands = (instr.operands.length > 0) ?
                    'operands' + instr.operands.map(operand => operand.kind)
                                               .join(', ')
                    : 'no operands';

                // TODO: line numbers
                throw new Error(`unknown instruction ${instr.op} with ` +
                                operands);
            }

            const skip = !symbtable &&
                         instr.operands.some(op => op.kind === 'label');
            const instrBin = skip ? 0 : this.genInstrBin(instr, match, pc,
                                                      symbtable as SymbTable,
                                                      isa);
            return [[instrBin], skip];
        }
    }

    private genInstrBin(instr: Instruction, isaInstr: IsaInstruction,
                        pc: number, symbtable: SymbTable, isa: Isa): number {
        let bin = 0;
        let o = 0;

        for (const field of isaInstr.fields) {
            if (field.kind === 'const') {
                const numBits = field.bits[0] - field.bits[1] + 1;
                const masked = field.val & ~(-1 << numBits);
                bin |= masked << field.bits[1];
            } else {
                const operand = instr.operands[o++];
                const numBits = field.bits[0] - field.bits[1] + 1;

                if (field.kind === 'reg' && operand.kind === 'reg') {
                    // TODO: check for reg too big
                    // TODO: support other prefixes etc
                    bin |= operand.num << field.bits[1];
                } else if (field.kind === 'imm' && operand.kind === 'int') {
                    // TODO: check if too big
                    const masked = operand.val & ~(-1 << numBits);
                    bin |= masked << field.bits[1];
                } else if (field.kind === 'imm' && operand.kind === 'label') {
                    const actualPc = pc + isa.pc.increment;
                    // TODO: check if too big
                    // TODO: check if nonexistent labels
                    // TODO: check if offset is negative but sext is false
                    const offset = symbtable[operand.label] - actualPc;
                    // TODO: make this a helper function
                    const masked = offset & ~(-1 << numBits);
                    bin |= masked << field.bits[1];
                } else {
                    // TODO: non-garbage error message
                    // TODO: line numbers
                    throw new Error(`unknown operand ${operand.kind}`);
                }
            }
        }

        return bin;
    }

    private instrMatch(instr: Instruction, isaInstr: IsaInstruction): boolean {
        if (instr.op !== isaInstr.op) {
            return false;
        }

        let ok = true;
        let o = 0;
        let f = 0;

        // while (ok && o < instr.operands.length && f < isaInstr.fields.length) {
        while (ok && f < isaInstr.fields.length) {
            const field = isaInstr.fields[f];

            if (field.kind === 'const') {
                f++;
            } else if (ok = o < instr.operands.length) {
                const operand = instr.operands[o];

                // TODO: check reg prefixes
                ok = operand.kind === 'reg' && field.kind === 'reg' ||
                     operand.kind === 'int' && field.kind === 'imm' ||
                     operand.kind === 'label' && field.kind === 'imm'
                                              && field.label;
                f++;
                o++;
            }
        }

        ok = ok && o === instr.operands.length && f === isaInstr.fields.length;
        return ok;
    }
}

export { BaseMachineCodeGenerator };
