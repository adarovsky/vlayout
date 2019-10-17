import {mount} from "enzyme";
import {Engine, Layout, pauseObserving, resumeObserving} from "../src";
import React from "react";
import {timer} from "rxjs";
import {observers} from "../src/resize_sensor";

let engine: Engine | null = null;

beforeEach(() => {
    engine = new Engine();
});

describe("layout", () => {
    it("should remove all size observers on unmount", async function() {
        const wrapper = mount(
            <Layout
                engine={engine!}
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
        pauseObserving();
        resumeObserving();
        expect(observers).toHaveLength(2);

        await timer(0).toPromise();
        wrapper.unmount();

        expect(observers).toHaveLength(0);
        resumeObserving();
        expect(observers).toHaveLength(0);
    });
});
