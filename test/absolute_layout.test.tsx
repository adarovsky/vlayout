import { mount } from "enzyme";
import { Engine, Layout } from "../src";
import React from "react";
import { Subject } from "rxjs";
import { ElementSize } from "../src/resize_sensor";

let module = require("../src/resize_sensor");

const sizeChange = new Subject<ElementSize>();
module.resizeObserver = jest.fn(() => sizeChange);

let engine: Engine | null = null;

beforeEach(() => {
  engine = new Engine();
});

describe("absolute", () => {
  it("should autoresize to padded subview", async function() {
    const wrapper = mount(
      <Layout
        engine={engine!}
        content={`
     layout {
         layer {
             absolute {
                 center { x: 0.5 y: 0.5 }
                 roundRect {
                     padding { left: 10 right: 10 top: 10 bottom: 10 }
                     fixedSize { width: 30 height: 20 }
                 }
             }
         }
     }`}
      />
    );

    const node = wrapper.find(".vlayout_absolute");

    sizeChange.next({ width: 30, height: 20 });

    expect(node.getDOMNode()).toHaveProperty("style.min-width", "50px");
    expect(node.getDOMNode()).toHaveProperty("style.min-height", "40px");
  });

  it("should not autoresize to padded subview if size is set", async function() {
    const wrapper = mount(
      <Layout
        engine={engine!}
        content={`
     layout {
         layer {
             absolute {
                 id: "sample"
                 center { x: 0.5 y: 0.5 }
                 
                 fixedSize { width: 30 height: 20 }
                 
                 roundRect {
                     padding { left: 10 right: 10 top: 10 bottom: 10 }                     
                 }
             }
         }
     }`}
      />
    );

    const node = wrapper.find(".vlayout_absolute");

    sizeChange.next({ width: 30, height: 20 });

    expect(node.getDOMNode()).toHaveProperty("style.width", "30px");
    expect(node.getDOMNode()).toHaveProperty("style.height", "20px");
  });

  it("should give z-indexes to children", async function() {
    const wrapper = mount(
      <Layout
        engine={engine!}
        content={`
     layout {
         layer {
             roundRect {
                 id: "rect1"
                 center { x: 0.5 y: 0.5 }
                 
                 fixedSize { width: 30 height: 20 }                 
             }
             roundRect {
                 id: "rect2"
                 padding { left: 10 right: 10 top: 10 bottom: 10 }                     
             }
         }
     }`}
      />
    );

    const node1 = wrapper.find("#rect1");
    expect(node1.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="vlayout_roundRect"
        id="rect1"
        style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; width: 30px; height: 20px; box-sizing: border-box;"
      />
    `);

    const node2 = wrapper.find("#rect2");
    expect(node2.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="vlayout_roundRect"
        id="rect2"
        style="position: absolute; left: 10px; z-index: 2; right: 10px; top: 10px; bottom: 10px; box-sizing: border-box;"
      />
    `);
  });
});
