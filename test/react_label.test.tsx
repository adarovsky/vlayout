import { mount, shallow } from 'enzyme';
import { Engine, Layout } from '../src';
import React from 'react';
import { Subject } from 'rxjs';
import { ElementSize } from '../src/resize_sensor';

let module = require('../src/resize_sensor');

const sizeChange = new Subject<ElementSize>();
module.resizeObserver = jest.fn(() => sizeChange);

let engine: Engine | null = null;

beforeEach(() => {
    engine = new Engine();
});

describe('label', () => {
    it('should contain id if set', async function () {
        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     layout {
         layer {
             label {
                 id: "label1"
                 center { x: 0.5 y: 0.5 }
                 
                 text: "test label"                 
             }
         }
     }`}
            />
        );

        const node = wrapper.find('.vlayout_label');

        expect(node.getDOMNode()).toMatchInlineSnapshot(`
            <div
              class="vlayout_label"
              id="label1"
              style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; text-align: start; overflow: hidden; text-overflow: ellipsis;"
            >
              <span>
                test label
                <br />
              </span>
              <div
                class="vlayout_label_shadow"
                style="position: absolute; white-space: pre; opacity: 0; pointer-events: none; transform: translateX(-50%) translateY(-50%); z-index: 1; text-align: start; overflow: hidden; text-overflow: ellipsis;"
              >
                <span>
                  test label
                  <br />
                </span>
              </div>
            </div>
        `);
    });

    it('should contain class if set', async function () {
        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     layout {
         layer {
             label {
                 class: "custom_class"
                 center { x: 0.5 y: 0.5 }
                 
                 text: "test label"                 
             }
         }
     }`}
            />
        );

        const node = wrapper.find('.vlayout_label');

        expect(node.getDOMNode()).toMatchInlineSnapshot(`
            <div
              class="vlayout_label custom_class"
              style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; text-align: start; overflow: hidden; text-overflow: ellipsis;"
            >
              <span>
                test label
                <br />
              </span>
              <div
                class="vlayout_label_shadow"
                style="position: absolute; white-space: pre; opacity: 0; pointer-events: none; transform: translateX(-50%) translateY(-50%); z-index: 1; text-align: start; overflow: hidden; text-overflow: ellipsis;"
              >
                <span>
                  test label
                  <br />
                </span>
              </div>
            </div>
        `);
    });

    it('should have wrapping shadow if width is set', async function () {
        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     layout {
         layer {
             label {
                 center { x: 0.5 y: 0.5 }
                 fixedSize { width: 100 }
                 
                 text: "test label"                 
             }
         }
     }`}
            />
        );

        const node = wrapper.find('.vlayout_label');

        expect(node.getDOMNode()).toMatchInlineSnapshot(`
            <div
              class="vlayout_label"
              style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; max-width: 100px; min-width: 100px; width: 100px; text-align: start; overflow: hidden; text-overflow: ellipsis;"
            >
              <span>
                test label
                <br />
              </span>
              <div
                class="vlayout_label_shadow"
                style="position: absolute; opacity: 0; pointer-events: none; transform: translateX(-50%) translateY(-50%); z-index: 1; max-width: 100px; min-width: 100px; width: 100%; text-align: start; overflow: hidden; text-overflow: ellipsis;"
              >
                <span>
                  test label
                  <br />
                </span>
              </div>
            </div>
        `);
    });

    it('concatenated strings whould work', async function () {
        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     layout {
         layer {
             label {
                 id: "label1"
                 center { x: 0.5 y: 0.5 }
                 
                 text: "test" + " label"                 
             }
         }
     }`}
            />
        );

        const node = wrapper.find('.vlayout_label');

        expect(node.getDOMNode()).toMatchInlineSnapshot(`
            <div
              class="vlayout_label"
              id="label1"
              style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; text-align: start; overflow: hidden; text-overflow: ellipsis;"
            >
              <span>
                test label
                <br />
              </span>
              <div
                class="vlayout_label_shadow"
                style="position: absolute; white-space: pre; opacity: 0; pointer-events: none; transform: translateX(-50%) translateY(-50%); z-index: 1; text-align: start; overflow: hidden; text-overflow: ellipsis;"
              >
                <span>
                  test label
                  <br />
                </span>
              </div>
            </div>
        `);
    });

    it('localized string should work', async function () {
        const source = new Subject<string>();
        engine!.registerInput('source', engine!.stringType(), source);
        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     inputs {
         source: String
     }
     layout {
         layer {
             label {
                 id: "label1"
                 center { x: 0.5 y: 0.5 }
                 
                 text: @("test label $1", source)                 
             }
         }
     }`}
            />
        );

        const node = wrapper.find('.vlayout_label');

        expect(node.getDOMNode()).toMatchInlineSnapshot(`
            <div
              class="vlayout_label"
              id="label1"
              style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; text-align: start; overflow: hidden; text-overflow: ellipsis;"
            >
              <div
                class="vlayout_placeholder"
                style="min-width: 0px;"
              />
              <div
                class="vlayout_label_shadow"
                style="position: absolute; white-space: pre; opacity: 0; pointer-events: none; transform: translateX(-50%) translateY(-50%); z-index: 1; text-align: start; overflow: hidden; text-overflow: ellipsis;"
              >
                <span>
                  placeholder
                  <br />
                </span>
              </div>
            </div>
        `);

        source.next('string 1');
        expect(node.getDOMNode()).toMatchInlineSnapshot(`
            <div
              class="vlayout_label"
              id="label1"
              style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; text-align: start; overflow: hidden; text-overflow: ellipsis;"
            >
              <span>
                test label string 1
                <br />
              </span>
              <div
                class="vlayout_label_shadow"
                style="position: absolute; white-space: pre; opacity: 0; pointer-events: none; transform: translateX(-50%) translateY(-50%); z-index: 1; text-align: start; overflow: hidden; text-overflow: ellipsis;"
              >
                <span>
                  test label string 1
                  <br />
                </span>
              </div>
            </div>
        `);

        source.next('string 2');
        expect(node.getDOMNode()).toMatchInlineSnapshot(`
            <div
              class="vlayout_label"
              id="label1"
              style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; text-align: start; overflow: hidden; text-overflow: ellipsis;"
            >
              <span>
                test label string 2
                <br />
              </span>
              <div
                class="vlayout_label_shadow"
                style="position: absolute; white-space: pre; opacity: 0; pointer-events: none; transform: translateX(-50%) translateY(-50%); z-index: 1; text-align: start; overflow: hidden; text-overflow: ellipsis;"
              >
                <span>
                  test label string 2
                  <br />
                </span>
              </div>
            </div>
        `);
    });

    it('should not accept label of wrong type', async function () {
        const wrapper = () =>
            shallow(
                <Layout
                    engine={engine!}
                    content={`
     layout {
         layer {
             label {
                 id: "label1"
                 center { x: 0.5 y: 0.5 }
                 
                 text: 123                 
             }
         }
     }`}
                />
            );

        expect(wrapper).toThrowError(/cannot cast String to Number/);
    });
});
