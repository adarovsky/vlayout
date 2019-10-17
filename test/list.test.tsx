import {mount} from "enzyme";
import {Engine, Layout} from "../src";
import React from "react";
import {of, Subject} from "rxjs";
import {ElementSize} from "../src/resize_sensor";

let module = require("../src/resize_sensor");

const sizeChange = new Subject<ElementSize>();
module.resizeObserver = jest.fn(() => sizeChange);

let engine: Engine | null = null;

beforeEach(() => {
  engine = new Engine();
});

describe("lists", () => {
  it("should initialize and render vertical list", async function() {
    engine!.registerList("MyItems", {
      user: {
        name: engine!.stringType()
      },
      newUser: {}
    });
    engine!.registerInput(
      "items",
      engine!.type("MyItems")!,
      of([
        { user: { id: 1, name: "Alex" } },
        { user: { id: 2, name: "Anton" } },
        { user: { id: 3, name: "Denis" } },
        { newUser: { id: "new" } }
      ])
    );
    const wrapper = mount(
      <Layout
        engine={engine!}
        content={`
          types {
              MyItems: list (
                  user {
                      name: String
                  },
                  newUser {
                      // no fields required
                  }
              )
          }
          
          inputs {
              items: MyItems
          }
          
          layout {
              layer {
                  verticalList {
                      padding { left: 10 right: 10 top: 10 bottom: 10 }
                      model: items
          
                      user {
                          label {
                              text: name
                          }
                      }
                      newUser {
                          label {
                              text: "add new"
                          }
                      }
                  }
              }
          }
          `}
      />
    );

    console.log(wrapper.debug());
    const node = wrapper.find(".vlayout_verticalList");

    expect(node.getDOMNode()).toMatchInlineSnapshot(`
      <div
        class="vlayout_verticalList"
        style="position: absolute; left: 10px; z-index: 1; right: 10px; top: 10px; bottom: 10px;"
      >
        <div
          class="vlayout_absolute"
          style="pointer-events: none; position: relative;"
        >
          <div
            class="vlayout_label"
            style="position: absolute; z-index: 1;"
          >
            <span>
              Alex
              <br />
            </span>
            <div
              class="vlayout_label_shadow"
              style="position: absolute; white-space: pre; opacity: 0; z-index: 1;"
            >
              <span>
                Alex
                <br />
              </span>
            </div>
          </div>
        </div>
        <div
          class="vlayout_absolute"
          style="pointer-events: none; position: relative;"
        >
          <div
            class="vlayout_label"
            style="position: absolute; z-index: 1;"
          >
            <span>
              Anton
              <br />
            </span>
            <div
              class="vlayout_label_shadow"
              style="position: absolute; white-space: pre; opacity: 0; z-index: 1;"
            >
              <span>
                Anton
                <br />
              </span>
            </div>
          </div>
        </div>
        <div
          class="vlayout_absolute"
          style="pointer-events: none; position: relative;"
        >
          <div
            class="vlayout_label"
            style="position: absolute; z-index: 1;"
          >
            <span>
              Denis
              <br />
            </span>
            <div
              class="vlayout_label_shadow"
              style="position: absolute; white-space: pre; opacity: 0; z-index: 1;"
            >
              <span>
                Denis
                <br />
              </span>
            </div>
          </div>
        </div>
        <div
          class="vlayout_absolute"
          style="pointer-events: none; position: relative;"
        >
          <div
            class="vlayout_label"
            style="position: absolute; z-index: 1;"
          >
            <span>
              add new
              <br />
            </span>
            <div
              class="vlayout_label_shadow"
              style="position: absolute; white-space: pre; opacity: 0; z-index: 1;"
            >
              <span>
                add new
                <br />
              </span>
            </div>
          </div>
        </div>
      </div>
    `);
  });
});
