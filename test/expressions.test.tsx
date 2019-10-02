import {mount, shallow} from "enzyme";
import {Engine, Layout} from "../src";
import {Subject} from "rxjs";
import React from "react";
import {ReactLabel} from "../src/react_primitives";

let engine: Engine|null = null;

beforeEach(() => {
    engine = new Engine();
});


it('expression 1 + 2 should give 3', async () => {
    const test1 = new Subject<number>();
    const test2 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    engine!.registerInput('test2', engine!.numberType(), test2);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
        test2: Number
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(test1 + test2)
             }
         }
     }`}/>);


    expect(wrapper.find('.vlayout_label > span').text()).toBe("");

    test1.next(1);
    test2.next(2);
    
    expect(wrapper.find('.vlayout_label > span').text()).toBe("3");
});

it('expression 1 + 2 * 3 should give 7', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(1 + 2 * 3)
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("7");
});

it('expression 10 - 6 / 3 should give 8', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(10 - 6 / 3)
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("8");
});

it('expression (10 - 6) % 3 should give 1', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String((10 - 6) % 3)
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("1");
});

it('expression 2 < 3 should give true', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : 2 < 3 ? "true" : "false"
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("true");
});

it('expression 2 > 3 should give false', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : 2 > 3 ? "true" : "false"
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("false");
});

it('expression 2 <= 2 should give true', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : 2 <= 2 ? "true" : "false"
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("true");
});

it('expression 2 >= 3 should give false',  () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : 2 >= 3 ? "true" : "false"
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("false");
});

it('expression "abc" + "def" should give "abcdef"', async () => {
    const test1 = new Subject<string>();
    const test2 = new Subject<string>();
    engine!.registerInput('test1', engine!.stringType(), test1);
    engine!.registerInput('test2', engine!.stringType(), test2);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: String
        test2: String
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : test1 + test2
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("");

    test1.next("abc");
    test2.next("def");

    expect(wrapper.find('.vlayout_label > span').text()).toBe("abcdef");
});

it('expression "abc" - "def" should fail', async () => {
    const test1 = new Subject<string>();
    const test2 = new Subject<string>();
    engine!.registerInput('test1', engine!.stringType(), test1);
    engine!.registerInput('test2', engine!.stringType(), test2);
    const wrapper = () => shallow(<Layout engine={engine!} content={`
     inputs {
        test1: String
        test2: String
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : test1 - test2
             }
         }
     }`}/>);

    expect(wrapper).toThrowError(/Only numbers are supported/);
});

it('expression 5 - 3 should give 2', async () => {
    const test1 = new Subject<number>();
    const test2 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    engine!.registerInput('test2', engine!.numberType(), test2);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
        test2: Number
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : String(test1 - test2)
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("");

    test1.next(5);
    test2.next(3);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("2");
});

it('conditional expression should work', async () => {
    const test1 = new Subject<number>();
    const test2 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    engine!.registerInput('test2', engine!.numberType(), test2);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
        test2: Number
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : test1 == test2 ? "equal" : "not equal"
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("");

    test1.next(5);
    test2.next(3);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("not equal");

    test1.next(5);
    test2.next(5);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("equal");
});

it('not equal expression should work', async () => {
    const test1 = new Subject<number>();
    const test2 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    engine!.registerInput('test2', engine!.numberType(), test2);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
        test2: Number
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : test1 != test2 ? "not equal" : "equal"
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("");

    test1.next(5);
    test2.next(3);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("not equal");

    test1.next(5);
    test2.next(5);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("equal");
});

it('boolean and expression should work', async () => {
    const test1 = new Subject<boolean>();
    const test2 = new Subject<boolean>();
    engine!.registerInput('test1', engine!.boolType(), test1);
    engine!.registerInput('test2', engine!.boolType(), test2);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Bool
        test2: Bool
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : test1 && test2 ? "true" : "false"
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("");

    test1.next(true);
    test2.next(false);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("false");

    test1.next(true);
    test2.next(true);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("true");
});

it('boolean or expression should work', async () => {
    const test1 = new Subject<boolean>();
    const test2 = new Subject<boolean>();
    engine!.registerInput('test1', engine!.boolType(), test1);
    engine!.registerInput('test2', engine!.boolType(), test2);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Bool
        test2: Bool
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : test1 || test2 ? "true" : "false"
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("");

    test1.next(true);
    test2.next(false);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("true");

    test1.next(true);
    test2.next(true);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("true");

    test1.next(false);
    test2.next(false);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("false");
});

it('compare against set should work', async () => {
    engine!.registerEnum('TestEnum', {'key1': 1, 'key2': 2, 'key3': 3});
    const test1 = new Subject<number>();
    engine!.registerInput('test1', engine!.type('TestEnum')!, test1);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: TestEnum
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : test1 == .key1|.key2  ? "true" : "false"
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("");

    test1.next(1);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("true");

    test1.next(2);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("true");

    test1.next(3);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("false");
});

it('compare not equal against set should work', async () => {
    engine!.registerEnum('TestEnum', {'key1': 1, 'key2': 2, 'key3': 3});
    const test1 = new Subject<number>();
    engine!.registerInput('test1', engine!.type('TestEnum')!, test1);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: TestEnum
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : test1 != .key1|.key2  ? "true" : "false"
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("");

    test1.next(1);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("false");

    test1.next(2);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("false");

    test1.next(3);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("true");
});

it('should raise error if enum value is not found', async () => {
    engine!.registerEnum('TestEnum', {'key1': 1, 'key2': 2, 'key3': 3});
    const test1 = new Subject<number>();
    engine!.registerInput('test1', engine!.type('TestEnum')!, test1);
    const wrapper = () => shallow(<Layout engine={engine!} content={`
     inputs {
        test1: TestEnum
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : test1 != .key4  ? "true" : "false"
             }
         }
     }`}/>);

    expect(wrapper).toThrowError(/does not have value/);
});

it('should raise error if matching number against enum', async () => {
    const test1 = new Subject<number>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    const wrapper = () => shallow(<Layout engine={engine!} content={`
     inputs {
        test1: Number
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : test1 != .key4  ? "true" : "false"
             }
         }
     }`}/>);

    expect(wrapper).toThrowError(/cannot get enum type from context/);
});

it('should find loose function', async () => {
    const wrapper = mount(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 font: Font(.bold, 18)
             }
         }
     }`}/>);

    const state = wrapper.find(ReactLabel).state();
    expect(state).toHaveProperty('style.fontWeight', 'bold');
    expect(state).toHaveProperty('style.fontSize', '18px');
});

it('should fail on unknown function', async () => {
    const wrapper = () => shallow(<Layout engine={engine!} content={`
     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 font: Font(.bold, 18, "nonexistent")
             }
         }
     }`}/>);


    expect(wrapper).toThrowError(/cannot find function/);
});

it('compare with nil should work', async () => {
    const test1 = new Subject<number|null>();
    engine!.registerInput('test1', engine!.numberType(), test1);
    const wrapper = mount(<Layout engine={engine!} content={`
     inputs {
        test1: Number
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : test1 == nil ? "nil" : "not nil"
             }
         }
     }`}/>);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("");

    test1.next(5);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("not nil");

    test1.next(null);

    expect(wrapper.find('.vlayout_label > span').text()).toBe("nil");
});

it('nil should not cast to string', async () => {
    const test1 = new Subject<string>();
    engine!.registerInput('test1', engine!.stringType(), test1);
    const wrapper = () => shallow(<Layout engine={engine!} content={`
     inputs {
        test1: String
     }

     layout {
         layer {            
             label {
                 center { x : 0.5 y : 0.5 }
                 text : test1 == nil ? "nil" : "not nil"
             }
         }
     }`}/>);

    expect(wrapper).toThrowError(/cannot cast nil to String/);
});

