// Either just the name ('cc') or a prefix and a regno ['r', 3]
type RegIdentifier = string|[string, number];

interface MachineState {
    // Auto sign-extends and everything
    reg: (reg: RegIdentifier) => number;
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

type MachineStateUpdate = MachineStateRegUpdate|MachineStateMemUpdate;

export { RegIdentifier, MachineState, MachineStateUpdate };
