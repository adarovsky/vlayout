import {Inputs} from "./inputs";
import {Dictionary, EnumDefinition, ListDefinition, TypeDefinition, Types} from "./types";
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
} from "./builtin_functions";
import React from "react";
import {ViewListReference, ViewReference} from "./view_reference";
import {View} from "./view";
import _ from "lodash";
import {ReactViewProps} from "./react_views";
import {Button} from "./primitives";
import {Observable} from "rxjs";
import {ListClickHandler, ListModelItem} from "./list";

export class Engine {
    readonly inputs = new Inputs(this);
    readonly types = new Types(this);
    readonly functions: FunctionImplementationI[];
    private readonly referencedViews: Dictionary<ViewReference> = {};
    private readonly buttons: Dictionary<() => Promise<void>> = {};
    private readonly listButtons: Dictionary<(i: ListModelItem) => Promise<void>> = {};
    private readonly referencedListViews: Dictionary<ViewListReference> = {};
    readonly valueSnapshot: { inputs: Dictionary<any>; properties: Dictionary<any> } = {
        inputs: {},
        properties: {}
    };

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

        return this.inputs.input(keyPath, 0, 0);
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

    registerView(key: string, createComponent: (parent: View) => React.ReactElement<ReactViewProps>) {
        this.referencedViews[key] = new ViewReference(createComponent);
    }

    registerInput(name: string, type: TypeDefinition, sink: Observable<any>): void {
        this.inputs.registerInput(name, type, sink);
    }

    registerButton(key: string, onClick: () => Promise<void>) {
        this.buttons[key] = onClick;
    }

    registerEnum(name: string, values: Dictionary<any>): void {
        this.types.registerEnum(new EnumDefinition(this, name, values));
    }

    registerList(name: string, fields: Dictionary<any>): void {
        this.types.registerList(new ListDefinition(this, name, fields));
    }

    registerListButton(name: string, onClick: (item: ListModelItem) => Promise<void>) {
        this.listButtons[name] = onClick;
    }

    registerListView(name: string, createComponent: (parent: View, modelItem: Observable<ListModelItem>) => React.ReactElement<ReactViewProps>) {
        this.referencedListViews[name] = new ViewListReference(createComponent);
    }

    viewForKey(key: string): View|null {
        if (this.buttons[key])
            return new Button(this.buttons[key]);
        else if (this.referencedViews[key])
            return new ViewReference(this.referencedViews[key].createComponent);
        else
            return null;
    }

    listButtonForKey(key: string) : ListClickHandler|null {
        return this.listButtons[key] || null;
    }

    listViewForKey(key: string): ViewListReference|null {
        const view =  this.referencedListViews[key];
        if (view) {
            return new ViewListReference(view.createComponent);
        }

        return null;
    }

    logInputValue(name: string, value: any): void {
        this.valueSnapshot.inputs[name] = value;
    }
}