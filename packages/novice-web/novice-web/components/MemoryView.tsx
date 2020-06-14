import { fmtHex } from 'novice';
import * as React from 'react';
import { VariableSizeGrid } from 'react-window';

export interface MemoryViewProps {
    // pc arrow, address, hex word, word in base 10, disassembled instruction
    colWidths: [number, number, number, number, number];
    rowHeight: number;
    rows: number;
    // machine state
    pc: number;
    memSpace: number;
    memWord: number;
    load: (addr: number) => number;
    disassemble: (addr: number) => string|null;
}

export class MemoryView extends React.Component<MemoryViewProps, {}> {
    private grid: React.RefObject<VariableSizeGrid>;

    constructor(props: MemoryViewProps) {
        super(props);

        this.grid = React.createRef();
    }

    public componentDidUpdate(prevProps: MemoryViewProps) {
        if (prevProps.pc !== this.props.pc) {
            this.grid.current!.scrollTo({scrollLeft: 0, scrollTop: this.calcMemoryViewScrollTop()});
        }
    }

    public render() {
        const colVal: ((addr: number) => string)[] = [
            addr => (this.props.pc === addr) ? '►' : '',
            addr => this.fmtAddr(addr),
            addr => this.fmtWord(this.props.load(addr)),
            addr => this.props.load(addr).toString(10),
            addr => this.props.disassemble(addr) || '',
        ];

        const colClassNames = [
            ['memory-view-pc-cell'],
            [],
            [],
            [],
            [],
        ];

        const cell = (props: { columnIndex: number,
                               rowIndex: number,
                               style: React.CSSProperties }) => (
            <div className={['memory-view-cell', ...colClassNames[props.columnIndex]].join(' ')}
                 style={props.style}>
                {colVal[props.columnIndex](props.rowIndex)}
            </div>
        );

        return (
            <VariableSizeGrid ref={this.grid}
                              className='memory-view'
                              columnCount={this.props.colWidths.length}
                              columnWidth={i => this.props.colWidths[i]}
                              rowCount={Math.pow(2, this.props.memSpace)}
                              rowHeight={i => this.props.rowHeight}
                              width={this.props.colWidths.reduce((acc, cur) => acc + cur) + 32}
                              height={this.props.rows * this.props.rowHeight}
                              initialScrollTop={this.calcMemoryViewScrollTop()}>
                {cell}
            </VariableSizeGrid>
        );
    }

    private calcMemoryViewScrollTop(): number {
        // Add one (at the end there) because I think it looks better
        const topRowIndex = Math.max(0, this.props.pc - Math.floor(this.props.rows / 2) + 1);
        return topRowIndex * this.props.rowHeight;
    }

    private fmtAddr(addr: number): string {
        return fmtHex(addr, this.props.memSpace);
    }

    private fmtWord(word: number): string {
        return fmtHex(word, this.props.memWord);
    }
}
