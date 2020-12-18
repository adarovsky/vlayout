import { mount } from 'enzyme';
import { Engine, Layout, pauseObserving, resizeObserver, resumeObserving } from '../src';
import React from 'react';
import { BehaviorSubject, EMPTY, of, Subscription, timer } from 'rxjs';
import { observers } from '../src/resize_sensor';

let module = require("../src/resize_sensor");
// const sizeChange = new Subject<ElementSize>();

let engine: Engine = new Engine();

beforeEach(() => {
    engine = new Engine();
});

describe("layout", () => {
    it("should remove all size observers on unmount", async function() {
        const wrapper = mount(
            <Layout
                engine={engine}
                content={`
     layout {
         layer {
             stack {
                 center { x: 0.5 y: 0.5 }
                 label {
                     id: "image1"                     
                     text: "asd"                 
                 }
             }
         }
     }`}
            />
        );
        const node = wrapper.find(".vlayout_label_shadow");

        expect(observers).toHaveLength(4);
        expect(node.getDOMNode().childElementCount).toBe(3);
        pauseObserving();
        expect(node.getDOMNode().childElementCount).toBe(1);
        resumeObserving();
        expect(observers).toHaveLength(4);
        expect(node.getDOMNode().childElementCount).toBe(3);

        await timer(0).toPromise();
        wrapper.unmount();

        expect(observers).toHaveLength(0);
        resumeObserving();
        expect(observers).toHaveLength(0);
    });

    it("should not duplicate observers", async function() {
        const wrapper = mount(
            <Layout
                engine={engine}
                content={`
     layout {
         layer {
             stack {
                 center { x: 0.5 y: 0.5 }
                 label {
                     id: "image1"
                     
                     text: "asd"                 
                 }
             }
         }
     }`}
            />
        );

        const node = wrapper.find(".vlayout_label_shadow");
        expect(node.getDOMNode().childElementCount).toBe(3);

        const observer = resizeObserver(node.getDOMNode());
        const subscription = new Subscription();

        subscription.add(observer.subscribe(() => {}));
        expect(node.getDOMNode().childElementCount).toBe(3);

        subscription.add(observer.subscribe(() => {}));
        expect(node.getDOMNode().childElementCount).toBe(3);

        wrapper.unmount();
        subscription.unsubscribe();
        await timer(50).toPromise();

        expect(observers).toHaveLength(0);
    });

    it("should not duplicate observers when toggle alpha", async function() {
        engine.registerButton('button1', async () => {});
        engine.registerButton('button2', async () => {});
        const test1 = new BehaviorSubject(0);
        engine.registerInput('test1', engine.numberType(), test1);
        const wrapper = mount(
            <Layout
                engine={engine}
                content={`
     inputs {
         test1: Number
     }        
     layout {
         layer {
             vertical {
                 center { x: 0.5 y: 0.5 }
                 button1 {
                     id: "button1"
                     alpha: test1 == 0 ? 1 : 0
                     text: "asd1"                 
                 }
                 button2 {
                     id: "button1"
                     alpha: test1 == 1 ? 1 : 0
                     text: "asd2"                 
                 }
             }
         }
     }`}
            />
        );

        let node = wrapper.find(".vlayout_button");
        expect(node.getDOMNode().childElementCount).toBe(3);
        expect(node.text()).toBe('asd1');
        test1.next(1);
        wrapper.update();

        node = wrapper.find(".vlayout_button");
        expect(node.getDOMNode().childElementCount).toBe(3);
        expect(node.text()).toBe('asd2');
        wrapper.unmount();
        await timer(50).toPromise();

        expect(observers).toHaveLength(0);
    });

    it("should center view when paddings explicitly set to nil", async function() {
        const test1 = new BehaviorSubject(0);
        engine.registerInput('test', engine.numberType(), test1);
        const wrapper = mount(
            <Layout
                engine={engine}
                content={`
                inputs {
                    test: Number
                }        
                layout {
                    layer {
                        roundRect {
                            padding {
                                left: test % 2 == 0 ? 20 : nil
                                right: test % 2 == 0 ? 20 : nil
                                top: test % 2 == 0 ? 20 : nil
                                bottom: test % 2 == 0 ? 20 : nil
                            }
                            center {
                                x : test % 2 == 0 ? nil : 0.5
                                y : test % 2 == 0 ? nil : 0.5
                            }
                            fixedSize {
                                width: test % 2 == 0 ? nil : 120
                                height: test % 2 == 0 ? nil : 80
                            }
                            backgroundColor: #ffcccc
                        }
                    }
                }`}
            />
        );

        let node = wrapper.find(".vlayout_roundRect");
        wrapper.update();
        await timer(10).toPromise();
        expect(node.getDOMNode()).toMatchSnapshot();

        test1.next(1);
        await timer(10).toPromise();
        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it("should pass classname from top level component to real layout element", async function() {
        const wrapper = mount(
          <Layout
            className={'sample-class'}
            engine={engine}
            content={`
                layout {
                }`}
          />
        );

        let node = wrapper.find(".vlayout_layout");
        expect(node.hasClass('sample-class')).toBe(true);
    });

    it("top level layout should not have min width and height", async function() {
        module.resizeObserver = jest.fn((e: Element) => {
            if (e.classList.contains('vlayout_label'))
                return of({width: 500, height: 300});
            return EMPTY;
        });

        const wrapper = mount(
            <Layout
                className={'sample-class'}
                engine={engine}
                content={`
                layout {
                    layer {
                        label {
                            padding { left: 0 right: 0 top: 0 bottom: 0 }
                            text: "test"
                        }
                    }
                }`}
            />
        );
        wrapper.update();

        let node = wrapper.find(".vlayout_layout");

        expect(node.prop('style')?.minWidth).toBeUndefined();
        expect(node.prop('style')?.minHeight).toBeUndefined();
    });
});
