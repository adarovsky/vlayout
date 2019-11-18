import {mount} from "enzyme";
import {Engine, Layout} from "../src";
import React from "react";
import {Subject} from "rxjs";

let engine = new Engine();

beforeEach(() => {
    engine = new Engine();
});

beforeAll(() => {
    // Create a spy on console (console.log in this case) and provide some mocked implementation
    // In mocking global objects it's usually better than simple `jest.fn()`
    // because you can `unmock` it in clean way doing `mockRestore`
    jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => {
    // Restore mock after all tests are done, so it won't affect other test suites
    // @ts-ignore
    console.error.mockRestore();
});
afterEach(() => {
    // Clear mock (all calls etc) after each test.
    // It's needed when you're using console somewhere in the tests so you have clean mock each time
    // @ts-ignore
    console.error.mockClear();
});

describe("types", () => {
    it("should throw if invalid value is sent to input", async function () {
        const subj = new Subject<any>();
        engine.registerInput('testInput', engine.stringType(), subj);
        const wrapper = mount(
            <Layout
                engine={engine}
                content={`
                 inputs {
                    testInput: String
                 }
                 layout {
                     layer {
                         label {
                             id: "label1"
                             center { x: 0.5 y: 0.5 }
                             
                             text: testInput                 
                         }
                     }
                 }`}
            />
        );

        const node = wrapper.find(".vlayout_label");
        subj.next(null);

        expect(console.error).toHaveBeenCalled();
        expect(node.getDOMNode()).toMatchSnapshot();

        subj.next('abcde');
        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it("should throw if invalid enum value is sent to input", async function () {
        const subj = new Subject<any>();
        engine.registerEnum('TestEnum', {'a': 1, 'b': 2});
        engine.registerInput('testInput', engine.type('TestEnum')!, subj);
        const wrapper = mount(
            <Layout
                engine={engine}
                content={`
                 inputs {
                    testInput: TestEnum
                 }
                 layout {
                     layer {
                         label {
                             id: "label1"
                             center { x: 0.5 y: 0.5 }
                             
                             text: testInput == .a ? 'a' : 'other'                 
                         }
                     }
                 }`}
            />
        );

        const node = wrapper.find(".vlayout_label");
        subj.next(null);
        expect(console.error).toHaveBeenCalledTimes(1);

        subj.next(10);
        expect(console.error).toHaveBeenCalledTimes(2);

        expect(node.getDOMNode()).toMatchSnapshot();

        subj.next(1);
        expect(console.error).toHaveBeenCalledTimes(2);
        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it("should allow null to number inputs", async function () {
        const subj = new Subject<any>();
        engine.registerInput('testInput', engine.numberType(), subj);
        const wrapper = mount(
            <Layout
                engine={engine}
                content={`
                 inputs {
                    testInput: Number
                 }
                 layout {
                     layer {
                         label {
                             id: "label1"
                             center { x: 0.5 y: 0.5 }
                             
                             text: testInput == nil ? "null" : String(testInput)                 
                         }
                     }
                 }`}
            />
        );

        const node = wrapper.find(".vlayout_label");
        subj.next(null);

        expect(console.error).toHaveBeenCalledTimes(0);
        expect(node.getDOMNode()).toMatchSnapshot();

        subj.next('abcde');
        expect(console.error).toHaveBeenCalledTimes(1);

        subj.next(10);
        expect(console.error).toHaveBeenCalledTimes(1);

        expect(node.getDOMNode()).toMatchSnapshot();
    });
});

