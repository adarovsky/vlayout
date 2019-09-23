import {Inputs} from "./inputs";
import {Dictionary, EnumDefinition, TypeDefinition, Types} from "./types";
import {EnumValue, Expression} from "./expression";
import {
    ColorAlpha,
    FontFamily,
    FontSized,
    FontTyped,
    FunctionImplementationI,
    Image,
    LocalizedNumber,
    LocalizedString,
    ShortLocalizedNumber
} from "./functions";
import React from "react";
import {ViewReference} from "./view_reference";
import {View} from "./view";
import _ from "lodash";
import {ReactView, ReactViewState} from "./react_views";
import {Button} from "./primitives";

export class Engine {
    readonly inputs = new Inputs(this);
    readonly types = new Types(this);
    readonly functions: FunctionImplementationI[];
    private readonly views: Dictionary<View> = {};

    constructor() {
        this.functions = [
            new LocalizedNumber(this),
            new ShortLocalizedNumber(this),
            new Image(this),
            new FontFamily(this),
            new FontTyped(this),
            new FontSized(this),
            new ColorAlpha(this)
        ]
    }

    type(name: string): TypeDefinition|null {
        return this.types.type(name);
    }

    boolType(): TypeDefinition {
        return this.type('Bool')!;
    }

    numberType(): TypeDefinition {
        return this.type('Number')!;
    }

    colorType(): TypeDefinition {
        return this.type('Color')!;
    }

    stringType(): TypeDefinition {
        return this.type('String')!;
    }

    fontType(): TypeDefinition {
        return this.type('Font')!;
    }

    imageType(): TypeDefinition {
        return this.type('Image')!;
    }

    variableForKeyPath(keyPath: string): Expression|null {
        const kp = keyPath.split('.');
        if (kp.length === 2) {
            const enumType = this.type(kp[0]);
            if (enumType instanceof EnumDefinition) {
                const v = new EnumValue(kp[1], 0, 0);
                v.linkEnum(enumType);
                return v;
            }
        }

        return this.inputs.input(keyPath);
    }

    functionFor(name: string, parameters: TypeDefinition[]): FunctionImplementationI {
        if (name === '@') {
            for (let p of parameters) {
                if (p !== this.stringType()) {
                    throw new Error(`localized string receives only strings`);
                }
            }

            return new LocalizedString(this);
        }
        else {
            for (let f of this.functions) {
                if (f.name === name && _.isEqual(f.parameterTypes, parameters)) {
                    return f;
                }
            }

            throw new Error(`function ${name}(${parameters.map(p => p.toString()).join(', ')}) not found`);
        }
    }

    functionsLoose(name: string, parametersCount: number): FunctionImplementationI[] {
        return this.functions.filter(f => f.name === name && f.parameterTypes.length === parametersCount);
    }

    registerView(key: string, createComponent: <P extends ReactViewState>(parent: ViewReference) => React.ReactElement<ReactView<P>, React.JSXElementConstructor<P>>) {
        this.views[key] = new ViewReference(createComponent);
    }

    registerButton(key: string, onClick: () => Promise<void>) {
        this.views[key] = new Button(onClick);
    }

    viewForKey(key: string): View {
        return this.views[key];
    }
}