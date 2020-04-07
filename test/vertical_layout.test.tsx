import {mount} from "enzyme";
import {Engine, Layout} from "../src";
import React from "react";


let engine = new Engine();

beforeEach(() => {
    engine = new Engine();
});

describe('vertical layout', () => {

    it('should include id', async function () {

        const wrapper = mount(<Layout engine={engine!} content={`
layout {
    layer {    
        vertical {
            id: "vertical_id"

            label {
                text: "text"
            }
        }
    }
}
`}/>);

        const node = wrapper.find('#vertical_id');
        expect(node.exists()).toBe(true);
    });
});

