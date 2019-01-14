import { Instruction as IsaInstruction, Isa } from '../isa';
import { AsmContext, OpOperands, OpSpec, PseudoOpSpec } from '../opspec';
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
    public gen(isa: Isa, opSpec: PseudoOpSpec, asm: ParsedAssembly):
            MachineCodeSection[] {
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
                const [words, hasLabel] = this.inflateInstr(
                    isa, opSpec, instr, pc, null);

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
            const [words, _] = this.inflateInstr(
                isa, opSpec, instr, pc, symbtable);

            for (let k = 0; k < words.length; k++) {
                sections[victim.sectionIdx].words[victim.index + k] = words[k];
            }
        }

        // TODO: check for overlapping sections

        return sections;
    }

    private inflateInstr(isa: Isa,
                         opSpec: PseudoOpSpec,
                         instr: Instruction|PseudoOp,
                         pc: number,
                         symbtable: SymbTable|null): [number[], boolean] {
        if (instr.kind === 'pseudoop') {
            let match: OpSpec|null = null;

            for (const op of opSpec.ops) {
                if (this.opMatch(instr, op)) {
                    match = op;
                    break;
                }
            }

            if (!match) {
                // TODO: multiple operands
                const operand = (instr.operand ? instr.operand.kind : 'no') + ' operand';

                throw new Error(`unknown assembler directive .${instr.op} ` +
                                `with ${operand} on line ${instr.line}`);
            }

            if (!symbtable && instr.operand &&
                    instr.operand.kind === 'label') {
                // TODO: make sure this is true
                const estimator = match.size as ((isa: Isa) => number);
                return [new Array<number>(estimator(isa)), true];
            } else {
                const ctx: AsmContext = {isa, symbtable: symbtable as SymbTable};
                const operands: OpOperands = this.operandify(match, instr);
                return [match.asm(ctx, operands), false];
            }
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

                throw new Error(`unknown instruction ${instr.op} with ` +
                                `${operands} on line ${instr.line}`);
            }

            const skip = !symbtable &&
                         instr.operands.some(op => op.kind === 'label');
            const instrBin = skip ? 0 : this.genInstrBin(instr, match, pc,
                                                         symbtable as SymbTable,
                                                         isa);
            return [[instrBin], skip];
        }
    }

    private operandify(opSpec: OpSpec, pseudoOp: PseudoOp): OpOperands {
        const operands: OpOperands = {ints: {}, labels: {}, strings: {}};

        // TODO: >1 operands
        if (pseudoOp.operand) {
            const spec = opSpec.operands[0];

            switch (pseudoOp.operand.kind) {
                case 'string':
                    operands.strings[spec.name] = pseudoOp.operand.contents;
                    break;
                case 'int':
                    operands.ints[spec.name] = pseudoOp.operand.val;
                    break;
                case 'label':
                    operands.labels[spec.name] = pseudoOp.operand.label;
                    break;
            }
        }

        return operands;
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
                // max/min values.
                const maxUns = ~(-1 << numBits);
                const maxTwos = (1 << (numBits - 1)) - 1;
                const minTwos = (1 << (numBits - 1)) | (-1 << numBits);

                if (field.kind === 'reg' && operand.kind === 'reg') {
                    // TODO: support other prefixes etc

                    if (operand.num < 0) {
                        throw new Error(`negative register number ` +
                                        `${operand.num} on line ${instr.line}`);
                    }
                    if (operand.num > maxUns) {
                        throw new Error(`register number ${operand.num} ` +
                                        `requires too many bits (max is ` +
                                        `${maxUns}) on line ${instr.line}`);
                    }

                    bin |= operand.num << field.bits[1];
                } else if (field.kind === 'imm' && operand.kind === 'int') {
                    if (field.sext) {
                        if (operand.val < minTwos) {
                            throw new Error(`immediate value ${operand.val} ` +
                                            `is smaller than minimum ${minTwos} ` +
                                            `on line ${instr.line}`);
                        }
                        if (operand.val > maxTwos) {
                            throw new Error(`immediate value ${operand.val} ` +
                                            `is larger than maximum ${maxTwos} ` +
                                            `on line ${instr.line}`);
                        }
                    } else {
                        if (operand.val < 0) {
                            throw new Error(`negative immediate value ` +
                                            `${operand.val} in a ` +
                                            `non-sign-extended field on ` +
                                            `line ${instr.line}`);
                        }
                        if (operand.val > maxUns) {
                            throw new Error(`immediate value ${operand.val} ` +
                                            `is larger than maximum ${maxUns} ` +
                                            `on line ${instr.line}`);
                        }
                    }

                    const masked = operand.val & ~(-1 << numBits);
                    bin |= masked << field.bits[1];
                } else if (field.kind === 'imm' && operand.kind === 'label') {
                    if (!symbtable.hasOwnProperty(operand.label)) {
                        throw new Error(`unknown label \`${operand.label}' ` +
                                        `on line ${instr.line}`);
                    }

                    const actualPc = pc + isa.pc.increment;
                    // TODO: check if too big
                    // TODO: check if offset is negative but sext is false
                    const offset = symbtable[operand.label] - actualPc;

                    if (field.sext) {
                        if (offset < minTwos) {
                            throw new Error(`required pc offset ${offset} to ` +
                                            `label ${operand.label} is smaller ` +
                                            `than minimum ${minTwos} on line ` +
                                            `${instr.line}`);
                        }
                        if (offset > maxTwos) {
                            throw new Error(`required pc offset ${offset} to ` +
                                            `label ${operand.label} is larger ` +
                                            `than maximum ${maxTwos} on line ` +
                                            `${instr.line}`);
                        }
                    } else {
                        if (offset < 0) {
                            throw new Error(`required pc offset ${offset} to ` +
                                            `label ${operand.label} is negative ` +
                                            `but field is not sign extended ` +
                                            `on line ${instr.line}`);
                        }
                        if (offset > maxUns) {
                            throw new Error(`required pc offset ${offset} to ` +
                                            `label ${operand.label} is larger ` +
                                            `than maximum ${maxTwos} on line ` +
                                            `${instr.line}`);
                        }
                    }

                    // TODO: make this a helper function
                    const masked = offset & ~(-1 << numBits);
                    bin |= masked << field.bits[1];
                } else {
                    // TODO: non-garbage error message
                    throw new Error(`unknown operand ${operand.kind} ` +
                                    `on line ${instr.line}`);
                }
            }
        }

        return bin;
    }

    private opMatch(pseudoOp: PseudoOp, opSpec: OpSpec): boolean {
        return pseudoOp.op === opSpec.name && (
            !pseudoOp.operand && !opSpec.operands.length ||
            opSpec.operands.length === 1 && !!pseudoOp.operand &&
                pseudoOp.operand.kind === opSpec.operands[0].kind);
    }

    private instrMatch(instr: Instruction, isaInstr: IsaInstruction): boolean {
        if (instr.op !== isaInstr.op) {
            return false;
        }

        let ok = true;
        let o = 0;
        let f = 0;

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
