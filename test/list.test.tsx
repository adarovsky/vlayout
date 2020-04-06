import {mount, shallow} from "enzyme";
import {Engine, Layout} from "../src";
import React from "react";
import {BehaviorSubject, of, ReplaySubject, Subject} from "rxjs";
import {List} from "../src/list";
import sinon from "sinon";
import {SampleListView} from "./sample_list_view";
import {ElementSize} from "../src/resize_sensor";

let module = require("../src/resize_sensor");

let engine = new Engine();
const sizeChange = new Subject<ElementSize>();
let sandbox = sinon.createSandbox();

beforeEach(() => {
    engine = new Engine();
    sandbox = sinon.createSandbox();
    sandbox.stub(module, 'resizeObserver').returns(sizeChange);
});

afterEach(() => {
    sandbox.restore();
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
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });
        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = mount(
            <Layout
                engine={engine}
                content={getContent('verticalList')}
            />
        );

        const node = wrapper.find(".vlayout_verticalList");

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it("should initialize and render absolute list", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });
        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = mount(
            <Layout
                engine={engine}
                content={getContent('absoluteList')}
            />
        );

        const node = wrapper.find(".vlayout_absoluteList");

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it("model description should support multiple properties", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType(),
                prop2: engine.boolType(),
            },
            newUser: {}
        });
        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex", prop2: false}},
                {user: {id: 2, name: "Anton", prop2: true}},
                {user: {id: 3, name: "Denis", prop2: false}},
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = mount(
            <Layout
                engine={engine}
                content={`
                      types {
                          MyItems: list (
                              user {
                                  name: String
                                  prop2: Bool
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
                                          text: name + (prop2 ? " - good" : " - bad")
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

    it("should initialize and render horizontal list", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });
        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = mount(
            <Layout
                engine={engine}
                content={getContent('horizontalList')}
            />
        );

        const node = wrapper.find(".vlayout_horizontalList");

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it("should reuse items on updates", async function () {
        // @ts-ignore
        const spy = sinon.spy(List.prototype, "createNewReusableItem");
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });

        let items = [
            {user: {id: 1, name: "Alex"}}
        ];
        const subj = new BehaviorSubject(items);

        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            subj
        );

        const wrapper = mount(
            <Layout
                engine={engine}
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
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });

        const n = new BehaviorSubject('Anton');
        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: n}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = mount(
            <Layout
                engine={engine}
                content={getContent('verticalList')}
            />
        );

        const node = wrapper.find(".vlayout_verticalList");

        expect(node.getDOMNode()).toMatchSnapshot();

        n.next('Michael');

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it("should allow setting fixed width or height for items", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });

        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = mount(
            <Layout
                engine={engine}
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

    it("should allow nested absolutes and stacks", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });

        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = mount(
            <Layout
                engine={engine}
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
                  absolute {
                      stack {
                          label {
                              text: name
                          }
                      }
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
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });

        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        engine.registerListButton('itemTapped', async item => console.log('item', item, 'tapped'));

        const wrapper = mount(
            <Layout
                engine={engine}
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

    it("should support tappable items inside hierarchy", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });

        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        engine.registerListButton('itemTapped', async item => console.log('item', item, 'tapped'));

        const wrapper = mount(
            <Layout
                engine={engine}
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
  
              user {
                  fixedSize { height: 44 }
                  label {
                      text: name
                  }
                  absolute {
                      itemTapped {
                      }
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

        const node = wrapper.find(".vlayout_button");

        expect(node).toHaveLength(3);
    });

    it("should support external views", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });

        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        engine.registerListView('myView', (x, item) => <SampleListView parentView={x} key={'123'} color={'#aa99cc'} user={item}/>);

        const wrapper = mount(
            <Layout
                engine={engine}
                content={`
  bindings {
      myView: listView
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
  
              user {
                  fixedSize { height: 44 }
                  myView {                      
                  }
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

    it("should support filtering", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });

        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: "Denis"}},
                {newUser: {id: "new"}}
            ])
        );

        engine.registerListView('myView', (x, item) => <SampleListView parentView={x} key={'123'} color={'#aa99cc'} user={item}/>);

        const wrapper = mount(
            <Layout
                engine={engine}
                content={`
  bindings {
      myView: listView
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
  
              user {
                  filter: name != "Denis"
                  fixedSize { height: 44 }
                  myView {                      
                  }
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

    it("should support dynamic filtering", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });

        const s = new ReplaySubject<string>(1);
        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: s}},
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = mount(
            <Layout
                engine={engine}
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
                  filter: name != "Denis"
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

        s.next("Michael");
        expect(node.getDOMNode()).toMatchSnapshot();

        s.next("Denis");
        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it("should support collection count", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });

        const s = new ReplaySubject<string>(1);
        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: s}},
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = mount(
            <Layout
                engine={engine}
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
          label {
              text: String(items.count)
          }
      }
  }`}
            />
        );

        expect(wrapper.find('.vlayout_label > span').text()).toBe("4");
    });


    it("should support text field in items", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });
        const spy = sandbox.spy();
        engine.registerListTextField('itemText', spy );

        const s = new BehaviorSubject<string>('Michael');
        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {user: {id: 1, name: "Alex"}},
                {user: {id: 2, name: "Anton"}},
                {user: {id: 3, name: s}},
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = mount(
            <Layout
                engine={engine}
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
                  itemText {
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
        s.next('Sergey');

        expect(node.getDOMNode()).toMatchSnapshot();

        expect(spy.callCount).toBe(0);
        const third = node.find('.vlayout_textField').at(2);
        const input = third.find('input');
        input.simulate('change', {target: {value: 'entered text'}});

        expect(spy.callCount).toBe(1);
    });

    it("should check for model inconsistencies", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.numberType()
            },
            newUser: {}
        });
        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = () => shallow(
            <Layout
                engine={engine}
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
  }`}
            />
        );

        expect(wrapper).toThrowError(/String and Number do not match/);
    });

    it("should check for missing model", async function () {
        const wrapper = () => shallow(
            <Layout
                engine={engine}
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
    
  layout {
      layer {
      }
  }`}
            />
        );

        expect(wrapper).toThrowError(/list MyItems is not registered/);
    });

    it("should check for wrong model type", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.numberType()
            },
            newUser: {}
        });
        const wrapper = () => shallow(
            <Layout
                engine={engine}
                content={`
  types {
      MyItems: enum(first, second)
  }
    
  layout {
      layer {
      }
  }`}
            />
        );

        expect(wrapper).toThrowError(/MyItems is not a enum definition/);
    });

    it("should check for wrong engine model type", async function () {
        engine.registerEnum("MyItems", {
            key1: 1, key2: 2
        });
        const wrapper = () => shallow(
            <Layout
                engine={engine}
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
    
  layout {
      layer {
      }
  }`}
            />
        );

        expect(wrapper).toThrowError(/MyItems is not a list definition/);
    });

    it("should check for missing type in engine model", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });
        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = () => shallow(
            <Layout
                engine={engine}
                content={`
  types {
      MyItems: list (
          user {
              name: String
              extraField: Number
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
  }`}
            />
        );

        expect(wrapper).toThrowError(/extraField is missing in engine/);
    });

    it("should check for missing type in definition", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType(),
                extraField: engine.stringType()
            },
            newUser: {}
        });
        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = shallow(
            <Layout
                engine={engine}
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
  }`}
            />
        );
    });

    it("should allow missing prototype in definition", async function () {
        engine.registerList("MyItems", {
            user: {
                name: engine.stringType()
            },
            newUser: {}
        });
        engine.registerInput(
            "items",
            engine.type("MyItems")!,
            of([
                {newUser: {id: "new"}}
            ])
        );

        const wrapper = shallow(
            <Layout
                engine={engine}
                content={`
  types {
      MyItems: list (
          user {
              name: String
          }
      )
  }

  inputs {
      items: MyItems
  }

  layout {
  }`}
            />
        );
    });
});
