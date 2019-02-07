// Either just the name ('cc') or a prefix and a regno ['r', 3]
type RegIdentifier = string|[string, number];

interface MachineState {
    // Address of current instruction. NOT incremented!
    pc: number;
    // Auto sign-extends and everything
    reg(reg: RegIdentifier): number;
    // memory accesses
    load(addr: number): number;
}

interface MachineStateRegUpdate {
    kind: 'reg';
    reg: RegIdentifier;
    val: number;
}

interface MachineStateMemUpdate {
    kind: 'mem';
    addr: number;
    val: number;
}

interface MachineStatePcUpdate {
    kind: 'pc';
    where: number;
}

interface MachineStateHaltUpdate {
    kind: 'halt';
}

type MachineStateUpdate = MachineStateRegUpdate|
                          MachineStateMemUpdate|
                          MachineStatePcUpdate|
                          MachineStateHaltUpdate;

export { RegIdentifier, MachineState, MachineStateUpdate };
