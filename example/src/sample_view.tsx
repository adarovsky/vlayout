import {ReactView, ReactViewProps, ReactViewState} from "@adarovsky/vlayout";
import React from "react";
import _ from "lodash";
import {Observable} from "rxjs";
import {ListModelItem} from "../../src/list";

interface SampleProps extends ReactViewProps {
    color: string
    user: Observable<ListModelItem>;
}

interface User {
    id: string;
    name: string;
}

interface SampleState extends ReactViewState{
    user: User;
}

export class SampleView extends ReactView<SampleProps, SampleState> {

    constructor(props: SampleProps) {
        super(props);

        this.state = {...this.state, user: {id: "1", name: ''}};
    }


    componentDidMount(): void {
        super.componentDidMount();
        this.subscription.add(this.props.user.subscribe(u => this.setState({user: u as User})));
    }

    render() {
        return (<div style={_.extend(this.state.style, {backgroundColor: this.props.color})}>
            {this.state.user.name}
        </div>);
    }
}
