import { mount, shallow } from 'enzyme';
import { Engine, Layout } from '../src';
import React from 'react';
import { Subject } from 'rxjs';
import { ImageContainer } from '../src/types';

let engine = new Engine();

beforeEach(() => {
    engine = new Engine({ debug: true });
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
        subj.next(123);

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

    it("should warn about missing value", async function () {
        jest.useFakeTimers();
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

        expect(() => jest.advanceTimersByTime(2000)).toThrow(/inconsistency for input testInput: no value came in/);
    });

    it("should accept nil values in functions", async function () {
        const subj = new Subject<any>();
        engine.registerInput('testInput', engine.numberType(), subj);
        const wrapper = shallow(
            <Layout
                engine={engine}
                content={`
                 inputs {
                    testInput: Number
                 }
                 functions {
                    testFunction(index:Number) => testInput <= 1 ? nil : index % 2 == 0 ? 10 : nil
                 }
                 layout {
                     layer {
                         label {
                             id: "label1"
                             center { x: 0.5 y: 0.5 }
                             
                             text: String(testInput)                 
                         }
                     }
                 }`}
            />
        );

        expect(() => wrapper).not.toThrow()
    });

    it('Image should support prefix for relative urls', async function () {
        engine = new Engine({ debug: true, prefix: '/prefix' });
        const i = new ImageContainer('/some/path.png', engine);
        expect(i.src).toBe('/prefix/some/path.png');
    });

    it('Image should include slash if missing for relative path', async function () {
        engine = new Engine({ debug: true, prefix: '/prefix' });
        const i = new ImageContainer('some/path.png', engine);
        expect(i.src).toBe('/prefix/some/path.png');
    });

    it('Image should include single slash if missing for relative path', async function () {
        engine = new Engine({ debug: true, prefix: '/' });
        const i = new ImageContainer('some/path.png', engine);
        expect(i.src).toBe('/some/path.png');
    });

    it('Image should not duplicate slashes if prefix ends with slash', async function () {
        engine = new Engine({ debug: true, prefix: '/prefix/' });
        const i = new ImageContainer('some/path.png', engine);
        expect(i.src).toBe('/prefix/some/path.png');
    });

    it('Image should not duplicate slashes if prefix ends with slash and url starts with slash', async function () {
        engine = new Engine({ debug: true, prefix: '/prefix/' });
        const i = new ImageContainer('/some/path.png', engine);
        expect(i.src).toBe('/prefix/some/path.png');
    });

    it('Image should not insert slash for relative path without slash', async function () {
        const i = new ImageContainer('some/path.png', engine);
        expect(i.src).toBe('some/path.png');
    });

    it('Image should keep full url as is', async function () {
        engine = new Engine({ debug: true, prefix: '/prefix' });
        const i = new ImageContainer('http://server/some/path.png', engine);
        expect(i.src).toBe('http://server/some/path.png');
    });
});

