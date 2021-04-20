import { Inputs } from './inputs';
import {
    Dictionary,
    EnumDefinition,
    ListDefinition,
    ListDefinitionItem,
    TypeDefinition,
    Types,
} from './types';
import { EnumValue, Expression } from './expression';
import {
    Ceil,
    ColorAlpha,
    Floor,
    FontFamily,
    FontSized,
    FontTyped,
    FunctionImplementationI,
    Image,
    LocalizedNumber,
    LocalizedString,
    Max,
    Min,
    Round,
    ShortLocalizedNumber,
    StringPrefix,
    StringSuffix,
    SubString,
    ToCapitalCase,
    ToLower,
    ToUpper,
} from './builtin_functions';
import React from 'react';
import { ViewListReference, ViewReference } from './view_reference';
import { View } from './view';
import { ReactViewProps } from './react_views';
import { Button, TextField } from './primitives';
import { Observable } from 'rxjs';
import {
    ListClickHandler,
    ListEnterHandler,
    ListModelItem,
    ListTextChangeHandler,
} from './list';
import { isEqual } from 'lodash';
import invariant from 'ts-invariant';

export class Engine {
    readonly inputs = new Inputs(this);
    readonly types = new Types(this);
    readonly functions: FunctionImplementationI[];
    private readonly referencedViews: Dictionary<ViewReference> = {};
    private readonly buttons: Dictionary<() => Promise<void>> = {};
    private readonly textFields: Dictionary<{
        onChange: (s: string) => void;
        onEnter: () => void;
    }> = {};
    private readonly listButtons: Dictionary<ListClickHandler> = {};
    private readonly listTextFields: Dictionary<{
        onChange: ListTextChangeHandler;
        onEnter: ListEnterHandler;
    }> = {};
    private readonly referencedListViews: Dictionary<ViewListReference> = {};
    readonly valueSnapshot: {
        inputs: Dictionary<any>;
        properties: Dictionary<any>;
    } = {
        inputs: {},
        properties: {},
    };

    constructor(readonly debug = false, readonly verboseIds: string[] = []) {
        this.functions = [
            new LocalizedNumber(this),
            new ShortLocalizedNumber(this),
            new Image(this),
            new FontFamily(this),
            new FontTyped(this),
            new FontSized(this),
            new ColorAlpha(this),
            new StringPrefix(this),
            new StringSuffix(this),
            new SubString(this),
            new ToUpper(this),
            new ToLower(this),
            new ToCapitalCase(this),
            new Round(this),
            new Floor(this),
            new Ceil(this),
        ];
    }

    type(name: string): TypeDefinition | null {
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

    variableForKeyPath(keyPath: string): Expression | null {
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

    functionFor(
        name: string,
        parameters: TypeDefinition[]
    ): FunctionImplementationI {
        if (name === '@') {
            for (let p of parameters) {
                if (p !== this.stringType()) {
                    throw new Error(`localized string receives only strings`);
                }
            }

            return new LocalizedString(this);
        } else if (name === 'Min') {
            for (let p of parameters) {
                if (p !== this.numberType()) {
                    throw new Error(`Min accepts only numbers`);
                }
            }
            if (parameters.length == 0) {
                throw new Error(`Not enough arguments to Min`);
            }

            return new Min(this);
        } else if (name === 'Max') {
            for (let p of parameters) {
                if (p !== this.numberType()) {
                    throw new Error(`Max accepts only numbers`);
                }
            }

            if (parameters.length == 0) {
                throw new Error(`Not enough arguments to Max`);
            }

            return new Max(this);
        } else {
            for (let f of this.functions) {
                if (f.name === name && isEqual(f.parameterTypes, parameters)) {
                    return f;
                }
            }

            throw new Error(
                `function ${name}(${parameters
                    .map((p) => p.toString())
                    .join(', ')}) not found`
            );
        }
    }

    functionsLoose(
        name: string,
        parametersCount: number
    ): FunctionImplementationI[] {
        return this.functions.filter(
            (f) =>
                f.name === name && f.parameterTypes.length === parametersCount
        );
    }

    registerView(
        key: string,
        createComponent: (parent: View) => React.ReactElement<ReactViewProps>
    ) {
        invariant(
            typeof createComponent === 'function',
            `createComponent for ${key} is empty`
        );
        this.referencedViews[key] = new ViewReference(createComponent);
    }

    registerInput(
        name: string,
        type: TypeDefinition,
        sink: Observable<any>
    ): void {
        invariant(sink, `input sink for ${name} is empty`);
        this.inputs.registerInput(name, type, sink);
    }

    registerButton(key: string, onClick: () => Promise<void>) {
        this.buttons[key] = onClick;
    }

    registerTextField(
        key: string,
        onChange: (s: string) => void,
        sink: Observable<string>,
        onEnter: () => void = () => {}
    ) {
        this.textFields[key] = { onChange, onEnter };
        this.inputs.registerInput(key, this.stringType(), sink);
    }

    registerEnum(name: string, values: Dictionary<any>): void {
        this.types.registerEnum(new EnumDefinition(this, name, values));
    }

    registerStandardEnum<EnumType>(
        name: string,
        e: StandardEnum<EnumType>
    ): void {
        this.types.registerEnum(
            new EnumDefinition(this, name, materializeEnum(e))
        );
    }

    registerList(name: string, fields: Dictionary<ListDefinitionItem>): void {
        this.types.registerList(new ListDefinition(this, name, fields));
    }

    registerListButton(
        name: string,
        onClick: (item: ListModelItem) => Promise<void>
    ) {
        this.listButtons[name] = onClick;
    }

    registerListTextField(
        name: string,
        onChange: ListTextChangeHandler,
        onEnter: ListEnterHandler = () => {}
    ) {
        this.listTextFields[name] = { onChange, onEnter };
    }

    registerListView(
        name: string,
        createComponent: (
            parent: View,
            modelItem: Observable<ListModelItem>
        ) => React.ReactElement<ReactViewProps>
    ) {
        this.referencedListViews[name] = new ViewListReference(createComponent);
    }

    viewForKey(key: string): View | null {
        if (this.buttons[key]) return new Button(this.buttons[key]);
        else if (this.textFields[key])
            return new TextField(
                key,
                this.textFields[key].onChange,
                this.textFields[key].onEnter
            );
        else if (this.referencedViews[key])
            return new ViewReference(this.referencedViews[key].createComponent);
        else return null;
    }

    listButtonForKey(key: string): ListClickHandler | null {
        return this.listButtons[key] || null;
    }

    listTextFieldForKey(
        key: string
    ): { onChange: ListTextChangeHandler; onEnter: ListEnterHandler } | null {
        return this.listTextFields[key] || null;
    }

    listViewForKey(key: string): ViewListReference | null {
        const view = this.referencedListViews[key];
        if (view) {
            return new ViewListReference(view.createComponent);
        }

        return null;
    }

    logInputValue(name: string, value: any): void {
        this.valueSnapshot.inputs[name] = value;
    }

    beginUpdates() {
        this.inputs.beginUpdates();
    }

    endUpdates() {
        this.inputs.endUpdates();
    }
}

export type StandardEnum<T> = {
    [id: string]: T | string;
    [nu: number]: string;
};

function camelize(str: string) {
    return str
        .replace(/(?:^\w|[A-Z]|\b\w|-|\s+)/g, function (match, index) {
            if (+match === 0) return ''; // or if (/\s+/.test(match)) for white spaces
            return index === 0 ? match.toLowerCase() : match.toUpperCase();
        })
        .replace('-', '');
}

function materializeEnum<EnumType>(e: StandardEnum<EnumType>) {
    return Object.keys(e)
        .filter((x) => isNaN(+x))
        .reduce((prev, cur) => ({ ...prev, [camelize(cur)]: e[cur] }), {});
}
