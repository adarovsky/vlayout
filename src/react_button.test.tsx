import React from 'react';
import ReactDOM from 'react-dom';
import {Layout} from "./layout";
import {Engine} from "./engine";
import {Subject} from "rxjs";
import { act } from "react-dom/test-utils";

let engine: Engine|null = null;
let container: Element|null = null;

beforeEach(() => {
    container = document.createElement("div");
    engine = new Engine();
    document.body.appendChild(container);
});

it('button cleans up on unmount', () => {
    const subject = new Subject<number>();
    engine!.registerInput("test", engine!.numberType(), subject);
    engine!.registerButton("myButton", async () => {});
    subject.next(2);
    ReactDOM.render(<Layout engine={engine!} content={`
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
     }`}/>, container!);
    subject.next(3);
    ReactDOM.unmountComponentAtNode(container!);
    subject.next(0);
});

it('button cleans up on unmount if click is delayed', () => {
    const promise = new Subject<void>();
    engine!.registerButton("myButton", () => promise.toPromise());
    ReactDOM.render(<Layout engine={engine!} content={`
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
     }`}/>, container!);

    const button = document.querySelector(".vlayout_button")!;

    act(() => {
        button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    ReactDOM.unmountComponentAtNode(container!);
    promise.complete();
});

afterEach(() => {
    // подчищаем после завершения
    container!.remove();
    container = null;
});
