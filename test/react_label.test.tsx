import {mount, shallow} from "enzyme";
import {Engine, Layout} from "../src";
import React from "react";
import {Subject} from "rxjs";
import {ElementSize} from "../src/resize_sensor";

let module = require("../src/resize_sensor");

const sizeChange = new Subject<ElementSize>();
module.resizeObserver = jest.fn(() => sizeChange);

let engine: Engine | null = null;

beforeEach(() => {
  engine = new Engine();
});

describe("label", () => {
  it("should contain id if set", async function() {
    const wrapper = mount(
      <Layout
        engine={engine!}
        content={`
     layout {
         layer {
             label {
                 id: "label1"
                 center { x: 0.5 y: 0.5 }
                 
                 text: "test label"                 
             }
         }
     }`}
      />
    );

    const node = wrapper.find(".vlayout_label");

    expect(node.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="vlayout_label"
        id="label1"
        style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%;"
      >
        <span>
          test label
          <br />
        </span>
        <div
          class="vlayout_label_shadow"
          style="position: absolute; white-space: pre; opacity: 0; transform: translateX(-50%) translateY(-50%); z-index: 1;"
        >
          <span>
            test label
            <br />
          </span>
        </div>
      </div>
    `);
  });

  it("should not accept label of wrong type", async function() {
    const wrapper = () => shallow(
        <Layout
            engine={engine!}
            content={`
     layout {
         layer {
             label {
                 id: "label1"
                 center { x: 0.5 y: 0.5 }
                 
                 text: 123                 
             }
         }
     }`}
        />
    );

    expect(wrapper).toThrowError(/cannot cast String to Number/);
  });

});
