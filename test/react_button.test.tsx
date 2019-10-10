import React from "react";
import { Engine, Layout } from "../src";
import { asyncScheduler, scheduled, Subject } from "rxjs";
import { mount } from "enzyme";
import sinon from "sinon";
import { ReactButton } from "../src/react_button";

let engine: Engine | null = null;

function wait() {
  return scheduled([], asyncScheduler).toPromise();
}

describe("button", () => {
  beforeEach(() => {
    engine = new Engine();
  });

  it("cleans up on unmount", async () => {
    const subject = new Subject<number>();
    engine!.registerInput("test", engine!.numberType(), subject);
    engine!.registerButton("myButton", async () => {});
    const spy = sinon.spy(ReactButton.prototype, "setState");
    subject.next(2);
    const wrapper = mount(
      <Layout
        engine={engine!}
        content={`
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

  it("button cleans up on unmount if click is delayed", async () => {
    let done: (() => void) | null = null;
    engine!.registerButton(
      "myButton",
      () => new Promise<void>(x => (done = x))
    );
    const spy = sinon.spy(ReactButton.prototype, "setState");
    const wrapper = mount(
      <Layout
        engine={engine!}
        content={`
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
     }`}
      />
    );

    wrapper.find(".vlayout_button").simulate("click");
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

  it("button image fits inside", async () => {
    engine!.registerButton("myButton", async () => {});
    const wrapper = mount(
      <Layout
        engine={engine!}
        content={`
            bindings {
                myButton: button
            }
            
            layout {
                layer {            
                    myButton {
                        center { x: 0.5 y: 0.5 }
                        fixedSize { height: 50 }
                        imagePadding: 20
                        image: Image("/logo512.png")
                        text: "sample"
                        strokeColor: #ccddee
                        strokeWidth: 3
                        contentPadding {
                            left: 10
                            right: 10
                            top: 15
                            bottom: 10
                        }
                    }         
                }
             }`}
      />
    );

    const node = wrapper.find(".vlayout_button");
    expect(node.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="vlayout_button"
        style="pointer-events: auto; position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; height: 50px; border-color: rgb(204, 221, 238); border-width: 3px; border-style: solid; box-sizing: border-box; display: flex; cursor: pointer; padding: 15px 10px 10px 10px; align-items: center; text-decoration: none; flex-direction: row; justify-content: center;"
      >
        <img
          alt="sample"
          src="/logo512.png"
          style="margin-right: 20px; max-height: 100%; max-width: 100%; object-fit: scale-down;"
        />
        <span>
          sample
          <br />
        </span>
      </div>
    `);
  });
});
