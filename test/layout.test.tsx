import {mount} from "enzyme";
import {Engine, Layout, pauseObserving, resizeObserver, resumeObserving} from "../src";
import React from "react";
import {BehaviorSubject, Subscription, timer} from "rxjs";
import {observers} from "../src/resize_sensor";

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

        expect(observers).toHaveLength(2);
        expect(node.getDOMNode().childElementCount).toBe(3);
        pauseObserving();
        expect(node.getDOMNode().childElementCount).toBe(1);
        resumeObserving();
        expect(observers).toHaveLength(2);
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

        expect(observers).toHaveLength(2);

        const node = wrapper.find(".vlayout_label_shadow");
        expect(node.getDOMNode().childElementCount).toBe(3);

        const observer = resizeObserver(node.getDOMNode());
        const subscription = new Subscription();

        subscription.add(observer.subscribe(() => {}));
        expect(observers).toHaveLength(2);
        expect(node.getDOMNode().childElementCount).toBe(3);

        subscription.add(observer.subscribe(() => {}));
        expect(observers).toHaveLength(2);
        expect(node.getDOMNode().childElementCount).toBe(3);

        wrapper.unmount();
        subscription.unsubscribe();
        await timer(0).toPromise();

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

        expect(observers).toHaveLength(2);

        let node = wrapper.find(".vlayout_button");
        expect(node.getDOMNode().childElementCount).toBe(3);
        expect(node.text()).toBe('asd1');
        test1.next(1);
        wrapper.update();

        node = wrapper.find(".vlayout_button");
        expect(node.getDOMNode().childElementCount).toBe(3);
        expect(observers).toHaveLength(2);
        expect(node.text()).toBe('asd2');
        await timer(0).toPromise();
        wrapper.unmount();

        expect(observers).toHaveLength(0);
    });

});
