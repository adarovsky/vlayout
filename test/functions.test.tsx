import { mount, shallow } from 'enzyme';
import { Engine, Layout } from '../src';
import { Subject, timer } from 'rxjs';
import React from 'react';
import { ReactLabel } from '../src/react_primitives';

let engine: Engine | null = null;

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

    expect(wrapper.find('.vlayout_label > span').text()).toBe('3');
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

    expect(wrapper.find('.vlayout_label').containsMatchingElement(<div
        className={'vlayout_placeholder'}/>)).toBeTruthy();
    test1.next(2);
    wrapper.update();
    expect(wrapper.find('.vlayout_label > span').text()).toBe('3');

});

it('function call should return bool', async () => {
    const test1 = new Subject<number>();
    const test2 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    engine!.registerInput('test2', engine!.numberType(), test2);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
        test2: Number
     }

     functions {
         testFunction(x: Number) => test1 > x && test2 != x ? 1 : 0
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text: String(testFunction(1))
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label').containsMatchingElement(<div
        className={'vlayout_placeholder'}/>)).toBeTruthy();
    test1.next(2);
    test2.next(2);
    wrapper.update();
    expect(wrapper.find('.vlayout_label > span').text()).toBe('1');
});

it('function call should access properties', async () => {
    const test1 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
     }
     
     properties {
        prop1: test1 + 10
     }

     functions {
         testFunction(x: Number) => x + prop1
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(testFunction(1))
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label').containsMatchingElement(<div
        className={'vlayout_placeholder'}/>)).toBeTruthy();
    test1.next(2);
    wrapper.update();
    expect(wrapper.find('.vlayout_label > span').text()).toBe('13');
});

it('function call should be accessible from properties', async () => {
    const test1 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
     }
     
     properties {
        prop1: testFunction(test1)
     }

     functions {
         testFunction(x: Number) => x + 1
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(prop1)
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label').containsMatchingElement(<div
        className={'vlayout_placeholder'}/>)).toBeTruthy();
    test1.next(2);
    wrapper.update();
    expect(wrapper.find('.vlayout_label > span').text()).toBe('3');
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

    expect(wrapper.find('.vlayout_label').containsMatchingElement(<div
        className={'vlayout_placeholder'}/>)).toBeTruthy();
    test1.next(2);
    wrapper.update();
    expect(wrapper.find('.vlayout_label > span').text()).toBe('3');

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

    expect(wrapper.find('#label1').containsMatchingElement(<div className={'vlayout_placeholder'}/>)).toBeTruthy();
    expect(wrapper.find('#label2').containsMatchingElement(<div className={'vlayout_placeholder'}/>)).toBeTruthy();
    test1.next(2);
    wrapper.update();
    expect(wrapper.find('#label1 > span').text()).toBe('3');
    expect(wrapper.find('#label2 > span').text()).toBe('12');

});

it('function calls should be independent 1', async () => {
    const test1 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
     }
     
     functions {
         fanCenterY(index: Number) => test1 == 4 ? (index == 3|4 ? 0.5+0.25 : 0.25) : 0.5
     }

     layout {
         layer {            
             label {
                 id: "label1"
                 center { x : 0.5 y : fanCenterY(1) }
                 text : "label1"
             }
             label {
                 id: "label2"
                 center { x : 0.5 y : fanCenterY(2) }
                 text : "label2"
             }
             label {
                 id: "label3"
                 center { x : 0.5 y : fanCenterY(3) }
                 text : "label3"
             }
             label {
                 id: "label4"
                 center { x : 0.5 y : fanCenterY(4) }
                 text : "label4"
             }
         }
     }`}/>);

    test1.next(4);
    wrapper.update();

    await timer(10).toPromise();

    expect(wrapper.find(ReactLabel).at(0).state().style.top).toBe('25%');
    expect(wrapper.find(ReactLabel).at(1).state().style.top).toBe('25%');
    expect(wrapper.find(ReactLabel).at(2).state().style.top).toBe('75%');
    expect(wrapper.find(ReactLabel).at(3).state().style.top).toBe('75%');
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

    expect(wrapper.find('.vlayout_label').containsMatchingElement(<div
        className={'vlayout_placeholder'}/>)).toBeTruthy();
    test1.next(2);
    wrapper.update();
    expect(wrapper.find('.vlayout_label > span').text()).toBe('prefix-2');

});

it('function call should fail to cast to wrong type', async () => {
    const wrapper = () => shallow(<Layout engine={engine!} content={`
     functions {
         testFunction(x: Number, y: Number) => x + y
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : testFunction(1, 2)
             }
         }
     }`}/>);

    expect(wrapper).toThrowError(/cannot cast String to Number/);
});

it('builtin function Min should work', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(Min(1, 2))
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe('1');
});

it('builtin function Min should accept any number of arguments', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(Min(1, 2, 4, 3))
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe('1');
});

it('builtin function Max should work', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(Max(1, 2))
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe('2');
});

it('builtin function Max should accept any number of arguments', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(Max(1, 2, 4, 3))
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe('4');
});

it('builtin function Max should fail without arguments', async () => {
    const wrapper = () => shallow(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(Max())
             }
         }
     }`}/>);

    expect(wrapper).toThrowError(/cannot find function/);
});

it('builtin function Min should fail without arguments', async () => {
    const wrapper = () => shallow(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(Min())
             }
         }
     }`}/>);

    expect(wrapper).toThrowError(/cannot find function/);
});

it('builtin function Prefix should work', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : Prefix("abcdef", 3)
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe('abc');
});

it('builtin function Suffix should work', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : Suffix("abcdef", 3)
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe('def');
});

it('builtin function SubString should work', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : SubString("abcdef", 1, 3)
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe('bcd');
});

it('builtin function ToUpper should work', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : ToUpper("abcdef")
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe('ABCDEF');
});

it('builtin function ToLower should work', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : ToLower("ABCDEF")
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe('abcdef');
});

it('builtin function ToCapital should work', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : ToCapital("abcdef")
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe('Abcdef');
});

it('builtin function ToCapital should keep trailing string case', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : ToCapital("abCdEf")
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe('AbCdEf');
});
