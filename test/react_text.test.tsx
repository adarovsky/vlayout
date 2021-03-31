import React from 'react';
import { Engine, Layout } from '../src';
import { asyncScheduler, BehaviorSubject, of, scheduled, Subject } from 'rxjs';
import { mount } from 'enzyme';
import sinon from 'sinon';
import { ReactTextField } from '../src/react_text';

let engine: Engine | null = null;
function wait() {
    return scheduled([], asyncScheduler).toPromise();
}

describe('text', () => {
    beforeEach(() => {
        engine = new Engine();
    });

    it('cleans up on unmount', async () => {
        const subject = new Subject<number>();
        engine!.registerInput('test', engine!.numberType(), subject);
        engine!.registerTextField('myText', async () => {}, of(''));
        const spy = sinon.spy(ReactTextField.prototype, 'setState');
        subject.next(2);
        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     bindings {
        myText: textField
     }
     inputs {test: Number}
     layout {
         layer {
             myText {
                 center { x : 0.5 y : 0.5 }
                 text : "test"
                 cornerRadius: test > 1 ? 0.5 : 0.1
                 backgroundColor: #cccccc
             }
         }
     }`}
            />
        );
        subject.next(3);

        const callCount = spy.callCount;

        wrapper.unmount();

        subject.next(0);

        await wait();

        expect(spy.callCount).toBe(callCount);
        spy.restore();
    });

    it('should contain id if set', async function () {
        const text = new BehaviorSubject('');
        engine!.registerTextField('myText', async () => {}, text);

        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     layout {
         layer {
             myText {
                 id: "text1"
                 center { x: 0.5 y: 0.5 }
             }
         }
     }`}
            />
        );

        const node = wrapper.find('.vlayout_textField');

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it('should change value', async function () {
        const text = new BehaviorSubject('');
        engine!.registerTextField('myText', async () => {}, text);

        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     layout {
         layer {
             myText {
                 id: "text1"
                 center { x: 0.5 y: 0.5 }
             }
         }
     }`}
            />
        );

        const node = wrapper.find('.vlayout_textField');

        expect(node.getDOMNode()).toMatchSnapshot();
        text.next('new value');

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it('should send changes back', async function () {
        const text = new BehaviorSubject('');
        engine!.registerTextField(
            'myText',
            async (s: string) => text.next(s),
            text
        );

        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     layout {
         layer {
             myText {
                 id: "text1"
                 center { x: 0.5 y: 0.5 }
             }
         }
     }`}
            />
        );

        const node = wrapper.find('.vlayout_textField');
        const input = node.find('input');
        input.simulate('change', { target: { value: 'entered text' } });

        expect(text.value).toBe('entered text');
    });

    it('should display placeholder', async function () {
        const text = new BehaviorSubject('');
        engine!.registerTextField(
            'myText',
            async (s: string) => text.next(s),
            text
        );

        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     layout {
         layer {
             myText {
                 id: "text1"
                 center { x: 0.5 y: 0.5 }
                 placeholder: "sample placeholder"
             }
         }
     }`}
            />
        );

        const node = wrapper.find('.vlayout_textField');
        const input = node.find('input');
        expect(node.getDOMNode()).toMatchInlineSnapshot(`
            <div
              class="vlayout_textField"
              id="text1"
              style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; box-sizing: border-box; pointer-events: auto;"
            >
              <input
                placeholder="sample placeholder"
                style="min-width: 0; width: 100%; box-sizing: border-box; padding: 0px 0px 0px 0px;"
                value=""
              />
              <div
                style="position: absolute; left: 0px; top: 0px; right: 0px; bottom: 0px; overflow: hidden; z-index: -1; visibility: hidden;"
              >
                <div
                  style="position: absolute; left: 0px; top: 0px; width: 10000000px; height: 10000000px;"
                />
              </div>
              <div
                style="position: absolute; left: 0px; top: 0px; right: 0px; bottom: 0px; overflow: hidden; z-index: -1; visibility: hidden;"
              >
                <div
                  style="position: absolute; left: 0px; top: 0px; width: 200%; height: 200%;"
                />
              </div>
            </div>
        `);
    });

    it('should set autofocus', async function () {
        const text = new BehaviorSubject('');
        engine!.registerTextField(
            'myText',
            async (s: string) => text.next(s),
            text
        );

        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     layout {
         layer {
             myText {
                 id: "text1"
                 center { x: 0.5 y: 0.5 }
                 autoFocus: true
             }
         }
     }`}
            />
        );

        const node = wrapper.find('.vlayout_textField');
        const input = node.find('input');
        expect(node.getDOMNode()).toMatchInlineSnapshot(`
            <div
              class="vlayout_textField"
              id="text1"
              style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; box-sizing: border-box; pointer-events: auto;"
            >
              <input
                autofocus=""
                placeholder=""
                style="min-width: 0; width: 100%; box-sizing: border-box; padding: 0px 0px 0px 0px;"
                value=""
              />
              <div
                style="position: absolute; left: 0px; top: 0px; right: 0px; bottom: 0px; overflow: hidden; z-index: -1; visibility: hidden;"
              >
                <div
                  style="position: absolute; left: 0px; top: 0px; width: 10000000px; height: 10000000px;"
                />
              </div>
              <div
                style="position: absolute; left: 0px; top: 0px; right: 0px; bottom: 0px; overflow: hidden; z-index: -1; visibility: hidden;"
              >
                <div
                  style="position: absolute; left: 0px; top: 0px; width: 200%; height: 200%;"
                />
              </div>
            </div>
        `);
    });

    function prepareTextField(type: string) {
        engine!.registerTextField('myText', async () => {}, of(''));
        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     layout {
         layer {
             myText {
                 id: "text1"
                 type: .${type}
                 center { x: 0.5 y: 0.5 }
             }
         }
     }`}
            />
        );
        return wrapper;
    }

    it('should set input mode to regular', async function () {
        const wrapper = prepareTextField('regular');

        const node = wrapper.find('.vlayout_textField');

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it('should set input mode to go', async function () {
        const wrapper = prepareTextField('go');

        const node = wrapper.find('.vlayout_textField');

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it('should set input mode to numeric', async function () {
        const wrapper = prepareTextField('numeric');

        const node = wrapper.find('.vlayout_textField');

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it('should set input mode to search', async function () {
        const wrapper = prepareTextField('search');

        const node = wrapper.find('.vlayout_textField');

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it('should set input mode to phone', async function () {
        const wrapper = prepareTextField('phone');

        const node = wrapper.find('.vlayout_textField');

        expect(node.getDOMNode()).toMatchSnapshot();
    });

    it('should set input mode to url', async function () {
        const wrapper = prepareTextField('url');

        const node = wrapper.find('.vlayout_textField');

        expect(node.getDOMNode()).toMatchSnapshot();
    });
});
