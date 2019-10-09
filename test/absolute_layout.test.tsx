import {mount} from "enzyme";
import {Engine, Layout} from "../src";
import React from "react";
import {Subject} from "rxjs";
import {ElementSize} from "../src/resize_sensor";

let module = require('../src/resize_sensor');

const sizeChange = new Subject<ElementSize>();
module.resizeObserver = jest.fn(() => sizeChange);

let engine: Engine|null = null;

beforeEach(() => {
    engine = new Engine();
});

describe('absolute', () => {

    it('should autoresize to padded subview', async function () {

        const wrapper = mount(<Layout engine={engine!} content={`
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
     }`}/>);

        const node = wrapper.find('.vlayout_absolute');

        sizeChange.next({width: 30, height: 20});

        expect(node.getDOMNode()).toHaveProperty('style.min-width', '50px');
        expect(node.getDOMNode()).toHaveProperty('style.min-height', '40px');
    });

    it('should not autoresize to padded subview if size is set', async function () {

        const wrapper = mount(<Layout engine={engine!} content={`
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
     }`}/>);

        const node = wrapper.find('.vlayout_absolute');

        sizeChange.next({width: 30, height: 20});

        expect(node.getDOMNode()).toHaveProperty('style.width', '30px');
        expect(node.getDOMNode()).toHaveProperty('style.height', '20px');
    });

    it('should give z-indexes to children', async function () {

        const wrapper = mount(<Layout engine={engine!} content={`
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
     }`}/>);

        const node1 = wrapper.find('#rect1');
        expect(node1.getDOMNode()).toHaveProperty('style.zIndex', '1');

        const node2 = wrapper.find('#rect2');
        expect(node2.getDOMNode()).toHaveProperty('style.zIndex', '2');

    });
});

