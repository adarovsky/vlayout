import {mount} from "enzyme";
import {Engine, Layout} from "../src";
import React from "react";
import {of, Subject} from "rxjs";
import {ElementSize} from "../src/resize_sensor";

let module = require('../src/resize_sensor');

const sizeChange = new Subject<ElementSize>();
module.resizeObserver = jest.fn((e: Element) => {
    // console.log('getting size for', e.classList);
    if (e.classList.contains('vlayout_layer'))
        return of({width: 500, height: 300});
    return sizeChange;
});

let engine: Engine|null = null;

beforeEach(() => {
    engine = new Engine();
});

describe('stack', () => {

    it('should not autoresize to zero-sized subview', async function () {

        const wrapper = mount(<div style={{width: '500px', height: '300px'}}><Layout engine={engine!} content={`
layout {
    layer {
        z_order: 100
    
        stack {
            padding { left: 10 top: 10 right: 10 bottom: 10 }

            absolute {
                id: "abs1"
                absolute {
                    id: "abs2"
                    
                    padding {
                        left: 10
                        right: 10
                        top: 10
                        bottom: 10
                    }

                    // fan1
                    stack {
                        center {
                            x: 0.5
                            y: 0.5
                        }
                        size {
                            width:0.5
                            height: 0.5
                        }

                        roundRect {
                            backgroundColor: #ccddff
                        }
                    }
                }
            }
        }
    }
}
`}/></div>);

        sizeChange.next({width: 30, height: 20});

        const node = wrapper.find('#abs1').first();

        expect(node.getDOMNode()).toHaveProperty('style.min-width', '100%');
        expect(node.getDOMNode()).toHaveProperty('style.min-height', '100%');
    });

    it('should include id', async function () {

        const wrapper = mount(<Layout engine={engine!} content={`
layout {
    layer {    
        stack {
            id: "stack_id"

            label {
                text: "text"
            }
        }
    }
}
`}/>);

        const node = wrapper.find('#stack_id');
        expect(node.exists()).toBe(true);
    });
});

