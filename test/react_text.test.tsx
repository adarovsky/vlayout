import React from "react";
import {Engine, Layout} from "../src";
import {asyncScheduler, BehaviorSubject, of, scheduled, Subject} from "rxjs";
import {mount} from "enzyme";
import sinon from "sinon";
import {ReactTextField} from "../src/react_text";

let engine: Engine | null = null;
function wait() {
  return scheduled([], asyncScheduler).toPromise();
}

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

    await wait();

    expect(spy.callCount).toBe(callCount);
    spy.restore();
  });

  it("should contain id if set", async function() {
    const text = new BehaviorSubject('');
    engine!.registerTextField("myText", async () => {}, text);

    const wrapper = mount(
        <Layout
            engine={engine!}
            content={`
     layout {
         layer {
             myText {
                 id: "text1"
                 center { x: 0.5 y: 0.5 }
             }
         }
     }`}
        />
    );

    const node = wrapper.find(".vlayout_textField");

    expect(node.getDOMNode()).toMatchSnapshot();
  });

  it("should change value", async function() {
    const text = new BehaviorSubject('');
    engine!.registerTextField("myText", async () => {}, text);

    const wrapper = mount(
        <Layout
            engine={engine!}
            content={`
     layout {
         layer {
             myText {
                 id: "text1"
                 center { x: 0.5 y: 0.5 }
             }
         }
     }`}
        />
    );

    const node = wrapper.find(".vlayout_textField");

    expect(node.getDOMNode()).toMatchSnapshot();
    text.next('new value');

    expect(node.getDOMNode()).toMatchSnapshot();
  });

  it("should send changes back", async function() {
    const text = new BehaviorSubject('');
    engine!.registerTextField("myText", async (s: string) => text.next(s), text);

    const wrapper = mount(
        <Layout
            engine={engine!}
            content={`
     layout {
         layer {
             myText {
                 id: "text1"
                 center { x: 0.5 y: 0.5 }
             }
         }
     }`}
        />
    );

    const node = wrapper.find(".vlayout_textField");
    const input = node.find('input');
    input.simulate('change', {target: {value: 'entered text'}});

    expect(text.value).toBe('entered text');
  });

});
