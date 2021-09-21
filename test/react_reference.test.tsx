import { mount, shallow } from 'enzyme';
import { Engine, Layout, LayoutComponent } from '../src';
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

describe('view reference', () => {
    it('should be interactive by default', async function () {
        engine!.registerView('testView', (parent) => (
            <LayoutComponent parentView={parent} key={'testView'}>
                <div />
            </LayoutComponent>
        ));

        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     layout {
         layer {
             testView {
                 id: "label1"
                 center { x: 0.5 y: 0.5 }
             }
         }
     }`}
            />
        );

        const node = wrapper.find('.vlayout_');

        expect(node.getDOMNode()).toMatchInlineSnapshot(`
            <div
              class="vlayout_"
              style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; pointer-events: auto;"
            >
              <div />
            </div>
        `);
    });

    it('should be interactive if set to true', async function () {
        engine!.registerView('testView', (parent) => (
            <LayoutComponent parentView={parent} key={'testView'}>
                <div />
            </LayoutComponent>
        ));

        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     layout {
         layer {
             testView {
                 id: "label1"
                 interactive: true
                 center { x: 0.5 y: 0.5 }
             }
         }
     }`}
            />
        );

        const node = wrapper.find('.vlayout_');

        expect(node.getDOMNode()).toMatchInlineSnapshot(`
            <div
              class="vlayout_"
              style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; pointer-events: auto;"
            >
              <div />
            </div>
        `);
    });

    it('should be non-interactive if set to false', async function () {
        engine!.registerView('testView', (parent) => (
            <LayoutComponent parentView={parent} key={'testView'}>
                <div />
            </LayoutComponent>
        ));

        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     layout {
         layer {
             testView {
                 id: "label1"
                 interactive: false
                 center { x: 0.5 y: 0.5 }
             }
         }
     }`}
            />
        );

        const node = wrapper.find('.vlayout_');

        expect(node.getDOMNode()).toMatchInlineSnapshot(`
            <div
              class="vlayout_"
              style="position: absolute; left: 50%; transform: translateX(-50%) translateY(-50%); z-index: 1; top: 50%; pointer-events: none;"
            >
              <div />
            </div>
        `);
    });
});
