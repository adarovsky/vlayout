import React from 'react';
import ReactDOM from 'react-dom';
import {Layout} from "./layout";
import {Engine} from "./engine";
import {Subject} from "rxjs";
import {render, mount} from "enzyme";
import sinon from 'sinon';
import { ReactButton } from './react_button';
import {Simulate} from "react-dom/test-utils";
import waiting = Simulate.waiting;



let engine: Engine|null = null;

beforeEach(() => {
    engine = new Engine();
});

it('button cleans up on unmount', async () => {
    const subject = new Subject<number>();
    engine!.registerInput("test", engine!.numberType(), subject);
    engine!.registerButton("myButton", async () => {});
    const spy = sinon.spy(ReactButton.prototype, 'setState');
    subject.next(2);
    const wrapper = mount(<Layout engine={engine!} content={`
     bindings {
        myButton: button
     }
     inputs {test: Number}
     layout {
         layer {
             myButton {
                 center { x : 0.5 y : 0.5 }
                 text : "test"
                 cornerRadius: test > 1 ? 0.5 : 0.1
                 backgroundColor: #cccccc
             }
         }
     }`}/>);
    subject.next(3);

    const callCount = spy.callCount;

    wrapper.unmount();

    subject.next(0);

    const t = new Subject<void>();
    setTimeout(() => t.complete(), 1);
    await t;

    expect(spy.callCount).toBe(callCount);

});

it('button cleans up on unmount if click is delayed', async () => {
    const promise = new Subject<void>();
    engine!.registerButton("myButton", () => promise.toPromise());
    const spy = sinon.spy(ReactButton.prototype, 'setState');
    const wrapper = mount(<Layout engine={engine!} content={`
     bindings {
        myButton: button
     }

     layout {
         layer {            
             myButton {
                 center { x : 0.5 y : 0.5 }
                 text : "test"
             }
         }
     }`}/>);

    wrapper.find('.vlayout_button').simulate('click');
    // @ts-ignore
    const callCount = spy.callCount;

    wrapper.unmount();
    promise.complete();

    const t = new Subject<void>();
    setTimeout(() => t.complete(), 1);
    await t;
    // @ts-ignore
    expect(spy.callCount).toBe(callCount);
});
