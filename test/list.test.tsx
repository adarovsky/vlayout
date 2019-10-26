import {mount} from "enzyme";
import {Engine, Layout} from "../src";
import React from "react";
import {BehaviorSubject, of, Subject} from "rxjs";
import {ElementSize} from "../src/resize_sensor";
import {List} from "../src/list";
import sinon from "sinon";

let module = require("../src/resize_sensor");

const sizeChange = new Subject<ElementSize>();
module.resizeObserver = jest.fn(() => sizeChange);

let engine: Engine | null = null;

beforeEach(() => {
    engine = new Engine();
});

function getContent(type: string) {
    return `
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
          ${type} {
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
  }`;
}

describe("lists", () => {
    it("should initialize and render vertical list", async function () {
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
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = mount(
            <Layout
                engine={engine!}
                content={getContent('verticalList')}
            />
        );

        const node = wrapper.find(".vlayout_verticalList");

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it("should initialize and render horizontal list", async function () {
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
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = mount(
            <Layout
                engine={engine!}
                content={getContent('horizontalList')}
            />
        );

        const node = wrapper.find(".vlayout_horizontalList");

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it("should reuse items on updates", async function () {
        // @ts-ignore
        const spy = sinon.spy(List.prototype, "createNewReusableItem");
        engine!.registerList("MyItems", {
            user: {
                name: engine!.stringType()
            },
            newUser: {}
        });

        let items = [
            {user: {id: 1, name: "Alex"}}
        ];
        const subj = new BehaviorSubject(items);

        engine!.registerInput(
            "items",
            engine!.type("MyItems")!,
            subj
        );

        const wrapper = mount(
            <Layout
                engine={engine!}
                content={getContent('verticalList')}
            />
        );

        const node = wrapper.find(".vlayout_verticalList");

        expect(spy.callCount).toBe(1);
        expect(node.getDOMNode()).toMatchSnapshot();

        items = items.concat([{user: {id: 2, name: "Anton"}}]);
        subj.next(items);

        expect(spy.callCount).toBe(2);
        expect(node.getDOMNode()).toMatchSnapshot();

        spy.restore();
    });

    it("should fetch values which are observables", async function () {
        engine!.registerList("MyItems", {
            user: {
                name: engine!.stringType()
            },
            newUser: {}
        });

        const n = new BehaviorSubject('Anton');
        engine!.registerInput(
            "items",
            engine!.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: n}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = mount(
            <Layout
                engine={engine!}
                content={getContent('verticalList')}
            />
        );

        const node = wrapper.find(".vlayout_verticalList");

        expect(node.getDOMNode()).toMatchSnapshot();

        n.next('Michael');

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it("should allow setting fixed width or height for items", async function () {
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
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
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
                  fixedSize { height: 44 }
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
  }`}
            />
        );

        const node = wrapper.find(".vlayout_verticalList");

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it("should support tappable items", async function () {
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
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        engine!.registerListButton('itemTapped', async item => console.log('item', item, 'tapped'));

        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
  bindings {
      itemTapped: listButton
  }
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
              itemTapped: itemTapped
  
              user {
                  fixedSize { height: 44 }
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
  }`}
            />
        );

        const node = wrapper.find(".vlayout_verticalList");

        expect(node.getDOMNode()).toMatchSnapshot();
    });
});
