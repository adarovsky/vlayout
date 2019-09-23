# VLayout syntax

```
bindings {
    name: view|button
    ...

    // example
    myView: view      // use engine.bindings.registerView("myView", x => <SampleView parentView={x} key={'123'} )
    myButton: button  // use engine.registerButton('myButton', async () => { console.log('clicked'); });
}

types {
    TypeName: enum(   // use engine.registerEnum("TypeName", {value1: 1, value2: 2}). You can use any unique scalar
        value1,       // for enum value.  {value1: "1", value2: "2"} would be also valid
        value2,
        ...
    )

    ...
}

inputs {
    simpleInput: Bool|Number|String|TypeName // for a list of builtin enums refer below
                                             // use engine.registerInput("simpleInput", engine.numberType(), rxjs.of(2))

    compoundInput {
        innerInput: Bool|Number|String|TypeName // use engine.registerInput("compoundInput.innerInput", engine.boolType(), rxjs.of(true))
    }

    ...

    // example
    counter: Number // use engine.registerInput("counter", engine.numberType(), rxjs.interval(1000))
}

properties {
    name: expression // where expression can refer inputs and another properties
    ...

    // example
    sampleProp: counter > 100
}

layout {
    layer {
        id: String
        z_order: Number
        alpha: Number (from 0 to 1)

        // subviews are bound to layer boundaries

        absolute { // allows to arrange subviews directly setting their bounds. See examples:
            someSubview {
                // properties common for all views in absolute container
                center {
                    x: expression -> Number (from 0 to 1, where 1 is a right boundary of absolute layout)
                    y: expression -> Number (from 0 to 1, where 1 is a bottom boundary of absolute layout)
                }
                size {
                    width: expression -> Number, (from 0 to 1, where 1 is a width of absolute layout)
                    height: expression -> Number, (from 0 to 1, where 1 is a height of absolute layout)
                }
                // or
                fixedSize {
                    width: expression -> Number, (width in pixels)
                    height: expression -> Number, (height in pixels)
                }

                padding {
                    top: expression -> Number (top offset in pixels)
                    bottom: expression -> Number (bottom offset in pixels)
                    left: expression -> Number (left offset in pixels)
                    right: expression -> Number (top offset in pixels)
                }
                // any of them can be set. The only requirement is to make view position defined and non-conflicting
                // if size is not set, it will be deduced from subviews intrinsic size, if it is available
            }
            ...

            // let take a look at some examples
            // we shall introduce all primitives here
            roundRect {
                center { x: 0.5 y: sampleProp ? 0.3 : 0.6 }
                fixedSize {
                    width: 100
                    height: 50
                }

                strokeColor: #00ff00
                strokeWidth: 4
                cornerRadius: sampleProp 0.5 : 10
                backgroundColor: #ffffcc
            }

            label {
                padding { top: 40 }
                center { x: 0.5 }

                text: String(counter) // referencing input here
                textColor: sampleProp ? Color(#00ff00, 0.5) : #000000 // using semi-transparent color
                font: Font(.bold, 18) .normal|.bold|.italic
                backgroundColor: #000000
                textAlignment: .left|.right|.center|.top|.middle|.bottom
            }

            image {
                padding { top: 40 left: 50 }
                image: Image("http://some_image.png")
                contentPolicy: .fill|.aspectFit|.aspectFill|.center
            }

            gradient {
                padding {
                    left: 0 right: 0 bottom: 0
                }
                size { height: 0.3 }

                startColor: Color(#000000, 0.3)
                endColor: Color(#000000, 0.0)
                orientation: .topToBottom|.bottomToTop|.leftToRight|.rightToLeft
            }

            progress {
                center {x : 0.5 y: 0.5 }
                fixedSize { width: 50 height: 50 }

                color: #11ff32
            }

            myButton {
                center {x : 0.5 y: 0.7 }
                fixedSize { width: 150 height: 50 }

                enabled: sampleProp
                text: @("Click me $1", String(counter))
                textColor: #00ff00
                image: Image("http://some_image.png")
                imagePadding: 10 // distance between image and text
                imagePosition: .left|.leftToText|.right|.rightToText|.top|.bottom

                font: Font(.nonrmal, 18)
            }
        }

        layer {
            id: "containers"
            z_order: 2

            horizontal {
                center {x : 0.5 y: 0.7 }
                size { width: 0.9 }
                fixedSize { height: 100 }
                alignment: .center // items will be centered vertically. Other values are
                                   // .fill|.center|.top|.bottom

                label {
                    text: "some text"
                }
                // will stretch to fill space
                roundRect {
                    sizePolicy: .stretched
                }

                label {
                    text: "another text"
                }
            }

            vertical {
                center { x : 0.5 y: 0.7 }
                size { width: 0.9 }
                fixedSize { height: 100 }
                alignment: .center // items will be centered vertically. Other values are
                                   // .fill|.center|.leading|.trailing

                label {
                    text: "some text"
                }
                // will stretch to fill space
                roundRect {
                    sizePolicy: .stretched
                }

                label {
                    text: "another text"
                }
            }

            stack {
                center { x : 0.5 y: 0.7 }
                size { width: 0.9 }

                roundRect {
                    backgroundColor: #cccccc
                }
                absolute {
                    label {
                        center { x : 0.5 y: 0.5 }
                        text: "abc"
                    }
                }
            }
        }
    }
```