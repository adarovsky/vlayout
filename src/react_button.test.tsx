import React from 'react';
import {Layout} from "./layout";
import {Engine} from "./engine";
import {asyncScheduler, scheduled, Subject} from "rxjs";
import {mount} from "enzyme";
import sinon from 'sinon';
import {ReactButton} from './react_button';

let engine: Engine|null = null;

function wait() {
    return scheduled([], asyncScheduler).toPromise();
}

describe('button', () =>
{
    beforeEach(() => {
        engine = new Engine();
    });

    it('cleans up on unmount', async () => {
        const subject = new Subject<number>();
        engine!.registerInput("test", engine!.numberType(), subject);
        engine!.registerButton("myButton", async () => {
        });
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
        spy.restore();
    });

    it('button cleans up on unmount if click is delayed', async () => {
        let done: (() => void) | null = null;
        engine!.registerButton("myButton", () => new Promise<void>(x => done = x));
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
        done!();

        // wait for async promise then completes
        await wait();
        // @ts-ignore
        expect(spy.callCount).toBe(callCount);
        spy.restore();
    });
});