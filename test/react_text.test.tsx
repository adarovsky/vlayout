import React from "react";
import {Engine, Layout} from "../src";
import {of, Subject} from "rxjs";
import {mount} from "enzyme";
import sinon from "sinon";
import {ReactTextField} from "../src/react_text";

let engine: Engine | null = null;
describe("text", () => {
  beforeEach(() => {
    engine = new Engine();
  });

  it("cleans up on unmount", async () => {
    const subject = new Subject<number>();
    engine!.registerInput("test", engine!.numberType(), subject);
    engine!.registerTextField("myText", async () => {}, of(''));
    const spy = sinon.spy(ReactTextField.prototype, "setState");
    subject.next(2);
    const wrapper = mount(
      <Layout
        engine={engine!}
        content={`
     bindings {
        myText: textField
     }
     inputs {test: Number}
     layout {
         layer {
             myText {
                 center { x : 0.5 y : 0.5 }
                 text : "test"
                 cornerRadius: test > 1 ? 0.5 : 0.1
                 backgroundColor: #cccccc
             }
         }
     }`}
      />
    );
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

});
