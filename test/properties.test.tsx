import { mount, shallow } from 'enzyme';
import { Engine, Layout } from '../src';
import { BehaviorSubject, ReplaySubject, Subject, timer } from 'rxjs';
import React from 'react';
import { ReactLabel } from '../src/react_primitives';
import { ElementSize } from '../src/resize_sensor';

let engine: Engine | null = null;

beforeEach(() => {
    engine = new Engine();
});

let module = require('../src/resize_sensor');

const sizeChange = new BehaviorSubject<ElementSize>({width: 1280, height: 720});
module.resizeObserver = jest.fn(() => sizeChange);

describe('properties', () => {
    it('property should access viewport', async () => {
        const wrapper = mount(
            <Layout
                engine={engine!}
                content={`
     properties {
        screenPadding: 100
        bottomHeight: 100
        test: (viewport.width-2*screenPadding)/(viewport.height-bottomHeight) 
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(test)
             }
         }
     }`}
            />
        );

        sizeChange.next({width: 1280, height: 720});

        expect(wrapper.find('.vlayout_label > span').text()).toBe('640');
    });
});
