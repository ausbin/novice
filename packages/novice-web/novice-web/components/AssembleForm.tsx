import * as React from 'react';

export interface AssembleFormProps {
    initialAssemblyCode: string;
    handleAssembleRequest: (assemblyCode: string) => void;
    handleStepRequest: () => void;
    handleUnstepRequest: () => void;
    handleContinueRequest: () => void;
}

export interface AssembleFormState {
    assemblyCode: string;
}

export class AssembleForm extends React.Component<AssembleFormProps, AssembleFormState> {

    constructor(props: AssembleFormProps) {
        super(props);

        this.state = {
            assemblyCode: this.props.initialAssemblyCode,
        };

        this.handleAssemblyCodeChange = this.handleAssemblyCodeChange.bind(this);
        this.handleAssembleButtonClick = this.handleAssembleButtonClick.bind(this);
    }

    public render() {
        return (
            <div className='assemble-form'>
                <textarea spellCheck='false' value={this.state.assemblyCode} onChange={this.handleAssemblyCodeChange} />
                <div className='buttons'>
                    <button onClick={this.handleAssembleButtonClick}>Assemble</button>
                    <button onClick={this.props.handleStepRequest}>Step</button>
                    <button onClick={this.props.handleUnstepRequest}>Unstep</button>
                    <button onClick={this.props.handleContinueRequest}>Continue</button>
                </div>
            </div>
        );
    }

    private handleAssemblyCodeChange(e: React.FormEvent<HTMLTextAreaElement>) {
        this.setState({assemblyCode: e.currentTarget.value});
    }

    private handleAssembleButtonClick(e: React.FormEvent<HTMLButtonElement>) {
        this.props.handleAssembleRequest(this.state.assemblyCode);
    }
}
