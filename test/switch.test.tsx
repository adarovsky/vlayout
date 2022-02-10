import { mount, shallow } from 'enzyme';
import { Engine, Layout } from '../src';
import { Subject } from 'rxjs';
import React from 'react';

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

    expect(wrapper.find('.vlayout_label').containsMatchingElement(<div className={'vlayout_placeholder'}/>)).toBeTruthy();

    test1.next(1);
    test2.next(true);
    wrapper.update();

    expect(wrapper.find('.vlayout_label > span').text()).toBe("1, true");

    test1.next(2);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("another");

    test2.next(false);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("2, false");

    test1.next(3);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("another");
});

it('switch should not crash', async () => {
    const test1 = new Subject<number>();
    const test2 = new Subject<boolean>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    engine!.registerInput('test2', engine!.boolType(), test2);
    const wrapper = () => shallow(<Layout engine={engine!} content={`
     inputs {
        test1: Number
        test2: Bool
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : switch(userCount) {
                       case (2, _) => 0
                       case (3, _) => 0
                       case (4, _) => 0
                       case (5, _) => 0
                    }
             }
         }
     }`}/>);

    expect(wrapper).toThrowError(/Extra matcher/);
});

it('switch should compile', async () => {
    const test1 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
     }

     layout {
         layer {            
             label {
                text: switch(test1){
                        case 1 => "BACKGROUND"
                        case 2 => "LOGO"
                        case 3 => "GREEN SCREEN"
                        case 4 => "TICKER"
                        case _ => "-"
                    }
            }
         }
     }`}/>);

    test1.next(2);
    wrapper.update();

    expect(wrapper.find('.vlayout_label > span').text()).toBe("LOGO");
});
