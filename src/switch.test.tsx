import sinon from "sinon";
import {ReactButton} from "./react_button";
import {mount} from "enzyme";
import {Layout} from "./layout";
import {asyncScheduler, scheduled, Subject} from "rxjs";
import React from "react";
import {Engine} from "./engine";
import {ReactLabel} from "./react_primitives";

let engine: Engine|null = null;

beforeEach(() => {
    engine = new Engine();
});


it('switch expression should deliver value when source changes', async () => {
    const test1 = new Subject<number>();
    const test2 = new Subject<boolean>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    engine!.registerInput('test2', engine!.boolType(), test2);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
        test2: Bool
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : switch(test1, test2) {
                     case 1, true => "1, true"
                     case 2, false => "2, false"
                     case _ => "another"
                 }
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("");

    test1.next(1);
    test2.next(true);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("1, true");

    test1.next(2);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("another");

    test2.next(false);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("2, false");

    test1.next(3);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("another");
});