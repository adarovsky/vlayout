import {Engine} from "./engine";

export class TypeDefinition {
    readonly  engine: Engine;
    readonly typeName: string;

    constructor(engine: Engine, typeName: string) {
        this.engine = engine;
        this.typeName = typeName;
    }

    toString(): string {
        return this.typeName;
    }
}

export interface Dictionary<T> {
    [Key: string]: T;
}

export class EnumDefinition extends TypeDefinition {
    private readonly values: Dictionary<any> = {};
    constructor(engine: Engine, typeName: string, values: Dictionary<any>) {
        super(engine, typeName);
        this.values = values;
    }
    valueFor(key: string): any {
        return this.values[key];
    }
}

export type SimpleListDefinitionItem = Dictionary<TypeDefinition>;
export type ListDefinitionItem = SimpleListDefinitionItem|Dictionary<any>;

export class ListDefinition extends TypeDefinition {
    constructor(engine: Engine, typeName: string, private readonly values:ListDefinitionItem []) {
        super(engine, typeName);
    }
}

export class Set extends TypeDefinition {
    readonly original: TypeDefinition;

    constructor(original: TypeDefinition) {
        super(original.engine, original.typeName + "*");
        this.original = original;
    }
}

export class Types {
    readonly engine: Engine;
    private _types: Dictionary<TypeDefinition> = {};

    private _straightValues(...values: string[]) {
        let r: Dictionary<string> = {};
        values.forEach(v => r[v] = v);
        return r;
    }

    constructor(engine: Engine) {
        this.engine = engine;

        ['String', 'Number', 'Bool', 'Font', 'Color', 'Image'].forEach( t => {
            this._types[t] = new TypeDefinition(engine, t);
        });
        ['String', 'Number'].forEach( t => {
            const s = new Set(this._types[t]);
            this._types[s.typeName] = s;
        });

        this.registerEnum(new EnumDefinition(engine, 'FontType', this._straightValues(
            'bold',
            'normal',
            'italic'
        )));

        this.registerEnum(new EnumDefinition(engine, 'TextAlignment', this._straightValues(
            'left',
            'right',
            'center',
            'top',
            'bottom',
            'middle'
        )));

        this.registerEnum(new EnumDefinition(engine, 'ImagePosition', this._straightValues(
            'left',
            'leftToText',
            'right',
            'rightToText',
            'top',
            'bottom'
        )));

        this.registerEnum(new EnumDefinition(engine, 'LayoutAlignment', this._straightValues(
            'fill',
            'center',
            'baseline',
            'top',
            'bottom',
            'leading',
            'trailing'
        )));

        this.registerEnum(new EnumDefinition(engine, 'ContentPolicy', this._straightValues(
            'fill',
            'aspectFit',
            'aspectFill',
            'center'
        )));

        this.registerEnum(new EnumDefinition(engine, 'SizePolicy', this._straightValues(
            'fixed',
            'stretched'
        )));

        this.registerEnum(new EnumDefinition(engine, 'GradientOrientation', this._straightValues(
            'topToBottom',
            'bottomToTop',
            'leftToRight',
            'rightToLeft'
        )));
    }

    registerEnum(e: EnumDefinition): void {
        if (this._types[e.typeName]) {
            throw new Error(`type ${e.typeName} is already registered`);
        }
        const s = new Set(e);
        this._types[s.typeName] = s;
        this._types[e.typeName] = e;
    }

    type(named: string): TypeDefinition|null {
        return this._types[named] || null;
    }

    registerList(listDefinition: ListDefinition) {
        if (this._types[listDefinition.typeName]) {
            throw new Error(`type ${listDefinition.typeName} is already registered`);
        }
        this._types[listDefinition.typeName] = listDefinition;
    }
}

export class ColorContainer {
    constructor(public readonly red: number,
                public readonly green: number,
                public readonly blue: number,
                public readonly alpha: number|null = null) {
    }

    static fromHex(color: string): ColorContainer {
        const match = color.match(/#?([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/);
        if (!match) {
            throw new Error(`invalid color specification: ${color}`);
        }
        else {
            const red = parseInt(match[1], 16);
            const green = parseInt(match[2], 16);
            const blue = parseInt(match[3], 16);

            return new ColorContainer(red, green, blue);
        }
    }

    toString(): string {
        if (this.alpha !== null) {
            return `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.alpha})`;
        }
        else {
            return `rgb(${this.red}, ${this.green}, ${this.blue})`;
        }
    }
}

export class ImageContainer {
    constructor(public readonly src: string) {

    }
}

export class FontContainer {
    constructor(public readonly familyName: string|null, public readonly size: number|null, public readonly type: string|null) {
    }
}