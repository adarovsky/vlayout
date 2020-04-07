import {mount} from "enzyme";
import {Engine, Layout} from "../src";
import React from "react";


let engine = new Engine();

beforeEach(() => {
    engine = new Engine();
});

describe('horizontal layout', () => {

    it('should include id', async function () {

        const wrapper = mount(<Layout engine={engine!} content={`
layout {
    layer {    
        horizontal {
            id: "horizontal_id"

            label {
                text: "text"
            }
        }
    }
}
`}/>);

        const node = wrapper.find('#horizontal_id');
        expect(node.exists()).toBe(true);
    });
});

