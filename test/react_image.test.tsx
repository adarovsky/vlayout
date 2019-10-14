import {mount} from "enzyme";
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

describe("image", () => {
  it("should contain id if set", async function() {
    const wrapper = mount(
      <Layout
        engine={engine!}
        content={`
     layout {
         layer {
             image {
                 id: "image1"
                 center { x: 0.5 y: 0.5 }
                 
                 image: Image("/test.png")                 
             }
         }
     }`}
      />
    );

    const node = wrapper.find(".vlayout_image");

    expect(node.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="vlayout_image"
        id="image1"
        style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%;"
      >
        <img
          alt=""
          src="/test.png"
          style="width: 100%; height: 100%; object-fit: fill;"
        />
      </div>
    `);
  });

  it("should switch scale mode", async function() {
    const input = new Subject<number>();
    engine!.registerInput("counter", engine!.numberType(), input);
    const wrapper = mount(
      <Layout
        engine={engine!}
        content={`
     inputs {
         counter: Number
     }
     layout {
         layer {
             image {
                 id: "image1"
                 center { x: 0.5 y: 0.5 }                 
                 image: Image("/test.png")      
                 contentPolicy: switch(counter) {
                     case 1 => .aspectFit
                     case 2 => .aspectFill
                     case 3 => .center
                     case _ => .fill
                 }       
             }
         }
     }`}
      />
    );

    const node = wrapper.find(".vlayout_image");
    input.next(1);
    expect(node.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="vlayout_image"
        id="image1"
        style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%;"
      >
        <img
          alt=""
          src="/test.png"
          style="width: 100%; height: 100%; object-fit: scale-down;"
        />
      </div>
    `);
    input.next(2);
    expect(node.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="vlayout_image"
        id="image1"
        style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%;"
      >
        <img
          alt=""
          src="/test.png"
          style="width: 100%; height: 100%; object-fit: cover;"
        />
      </div>
    `);
    input.next(3);
    expect(node.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="vlayout_image"
        id="image1"
        style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%;"
      >
        <img
          alt=""
          src="/test.png"
          style="width: 100%; height: 100%; object-fit: none;"
        />
      </div>
    `);
    input.next(4);
    expect(node.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="vlayout_image"
        id="image1"
        style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%;"
      >
        <img
          alt=""
          src="/test.png"
          style="width: 100%; height: 100%; object-fit: fill;"
        />
      </div>
    `);
  });
});
