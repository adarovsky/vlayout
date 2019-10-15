import {mount} from "enzyme";
import {Engine, Layout} from "../src";
import {Subject} from "rxjs";
import React from "react";

let engine: Engine|null = null;

beforeEach(() => {
    engine = new Engine();
});


it('function call should give result', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     functions {
         testFunction(x: Number, y: Number) => x + y
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(testFunction(1, 2))
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("3");
});

it('function call should update', async () => {
    const test1 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
     }

     functions {
         testFunction(x: Number, y: Number) => x + y
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(testFunction(1, test1))
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("");
    test1.next(2);
    expect(wrapper.find('.vlayout_label > span').text()).toBe("3");

});

it('function call should call other functions', async () => {
    const test1 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
     }

     functions {
         testFunction(x: Number, y: Number) => String(x + y)
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : testFunction(1, test1)
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("");
    test1.next(2);
    expect(wrapper.find('.vlayout_label > span').text()).toBe("3");

});

it('function calls should be independent', async () => {
    const test1 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
     }

     functions {
         testFunction(x: Number, y: Number) => String(x + y)
     }

     layout {
         layer {            
             label {
                 id: "label1"
                 center { x : 0.5 y : 0.5 }
                 text : testFunction(1, test1)
             }
             label {
                 id: "label2"
                 center { x : 0.5 y : 0.5 }
                 text : testFunction(10, test1)
             }
         }
     }`}/>);

    expect(wrapper.find('#label1 > span').text()).toBe("");
    expect(wrapper.find('#label1 > span').text()).toBe("");
    test1.next(2);
    expect(wrapper.find('#label1 > span').text()).toBe("3");
    expect(wrapper.find('#label2 > span').text()).toBe("12");

});

it('function call should work with variadic functions', async () => {
    const test1 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
     }

     functions {
         testFunction(prefix: String, y: Number) => @("$1-$2", prefix, String(y))
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : testFunction("prefix", test1)
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("");
    test1.next(2);
    expect(wrapper.find('.vlayout_label > span').text()).toBe("prefix-2");

});