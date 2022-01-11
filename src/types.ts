import { Engine } from './engine';
import { Color } from './index';
import { includes, isEmpty } from 'lodash';
import { combineLatest, Observable, of } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { catchError, map, tap, timeout } from 'rxjs/operators';
import { Placement } from 'tippy.js';

export class TypeDefinition {
    readonly engine: Engine;
    readonly typeName: string;

    constructor(engine: Engine, typeName: string) {
        this.engine = engine;
        this.typeName = typeName;
    }

    isTypeCorrect(value: any): boolean {
        switch (this.typeName) {
            case 'String':
                return value === null || typeof value === 'string';
            case 'Number':
                return (
                    value === null ||
                    typeof value === 'number' ||
                    typeof value === 'bigint'
                );
            case 'Bool':
                return typeof value === 'boolean';
            case 'Font':
                return value instanceof FontContainer;
            case 'Color':
                return value instanceof ColorContainer;
            case 'Image':
                return value instanceof ImageContainer;
            default:
                return true;
        }
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

    isTypeCorrect(value: any): boolean {
        return includes(this.values, value);
    }

    valueFor(key: string): any {
        return this.values[key];
    }
}

export type SimpleListDefinitionItem = Dictionary<TypeDefinition>;
export type ListDefinitionItem =
    | SimpleListDefinitionItem
    | ComplexDefinitionItem;
export interface ComplexDefinitionItem
    extends Dictionary<ListDefinitionItem | TypeDefinition> {}

export class ListDefinition extends TypeDefinition {
    constructor(
        engine: Engine,
        typeName: string,
        readonly values: Dictionary<ListDefinitionItem>
    ) {
        super(engine, typeName);
    }
}

export class Set extends TypeDefinition {
    readonly original: TypeDefinition;

    constructor(original: TypeDefinition) {
        super(original.engine, original.typeName + '*');
        this.original = original;
    }
}

export class Types {
    readonly engine: Engine;
    private _types: Dictionary<TypeDefinition> = {};

    private _straightValues(...values: string[]) {
        let r: Dictionary<string> = {};
        values.forEach((v) => (r[v] = v));
        return r;
    }

    constructor(engine: Engine) {
        this.engine = engine;

        ['String', 'Number', 'Bool', 'Font', 'Color', 'Image'].forEach((t) => {
            this._types[t] = new TypeDefinition(engine, t);
        });
        ['String', 'Number'].forEach((t) => {
            const s = new Set(this._types[t]);
            this._types[s.typeName] = s;
        });

        this.registerEnum(
            new EnumDefinition(
                engine,
                'FontType',
                this._straightValues('bold', 'normal', 'italic')
            )
        );

        this.registerEnum(
            new EnumDefinition(
                engine,
                'TextAlignment',
                this._straightValues(
                    'left',
                    'right',
                    'center',
                    'top',
                    'bottom',
                    'middle'
                )
            )
        );

        this.registerEnum(
            new EnumDefinition(
                engine,
                'ImagePosition',
                this._straightValues(
                    'left',
                    'leftToText',
                    'right',
                    'rightToText',
                    'top',
                    'bottom'
                )
            )
        );

        this.registerEnum(
            new EnumDefinition(
                engine,
                'LayoutAlignment',
                this._straightValues(
                    'fill',
                    'center',
                    'baseline',
                    'top',
                    'bottom',
                    'leading',
                    'trailing'
                )
            )
        );

        this.registerEnum(
            new EnumDefinition(
                engine,
                'ContentPolicy',
                this._straightValues(
                    'fill',
                    'aspectFit',
                    'aspectFill',
                    'center'
                )
            )
        );

        this.registerEnum(
            new EnumDefinition(
                engine,
                'SizePolicy',
                this._straightValues('fixed', 'stretched')
            )
        );

        this.registerEnum(
            new EnumDefinition(
                engine,
                'GradientOrientation',
                this._straightValues(
                    'topToBottom',
                    'bottomToTop',
                    'leftToRight',
                    'rightToLeft'
                )
            )
        );

        this.registerEnum(
            new EnumDefinition(
                engine,
                'TextFieldType',
                this._straightValues(
                    'regular',
                    'go',
                    'numeric',
                    'search',
                    'phone',
                    'url'
                )
            )
        );

        this.registerEnum(
            new EnumDefinition(engine, 'TooltipPlacement', {
                auto: 'auto',
                left: 'left',
                right: 'right',
                top: 'top',
                bottom: 'bottom',
            } as Dictionary<Placement>)
        );
    }

    registerEnum(e: EnumDefinition): void {
        if (this._types[e.typeName]) {
            throw new Error(`type ${e.typeName} is already registered`);
        }
        const s = new Set(e);
        this._types[s.typeName] = s;
        this._types[e.typeName] = e;
    }

    type(named: string): TypeDefinition | null {
        return this._types[named] || null;
    }

    registerList(listDefinition: ListDefinition) {
        if (this._types[listDefinition.typeName]) {
            throw new Error(
                `type ${listDefinition.typeName} is already registered`
            );
        }
        this._types[listDefinition.typeName] = listDefinition;
    }
}

export class ColorContainer {
    constructor(
        public readonly red: number,
        public readonly green: number,
        public readonly blue: number,
        public readonly alpha: number | null = null
    ) {}

    static fromHex(color: string): ColorContainer {
        const match = color.match(
            /#?([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/
        );
        if (!match) {
            throw new Error(`invalid color specification: ${color}`);
        } else {
            const red = parseInt(match[1], 16);
            const green = parseInt(match[2], 16);
            const blue = parseInt(match[3], 16);

            return new ColorContainer(red, green, blue);
        }
    }

    toString(): string {
        if (this.alpha !== null) {
            return `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.alpha})`;
        } else {
            return `rgb(${this.red}, ${this.green}, ${this.blue})`;
        }
    }
}

export class ImageContainer {
    constructor(private readonly url: string, readonly engine: Engine) {}

    get src() {
        if (/^https?:.*/.test(this.url) || isEmpty(this.engine.prefix)) {
            return this.url;
        }

        const prefix = this.engine.prefix.endsWith('/')
            ? this.engine.prefix.substr(0, this.engine.prefix.length - 1)
            : this.engine.prefix;

        const url = this.url.startsWith('/') ? this.url.substr(1) : this.url;

        return prefix + '/' + url;
    }

    srcSet(): Observable<string | undefined> {
        const result = /(.*)\.(png|jpe?g)/.exec(this.src);
        if (result) {
            return combineLatest(
                ['2', '3'].map((scale) =>
                    scaledSource(result[1], result[2], scale)
                )
            ).pipe(
                map((items) => {
                    const result = items.filter((x) => !!x).join(', ');
                    return result || undefined;
                })
            );
        }
        return of(undefined);
    }
}

export class FontContainer {
    constructor(
        public readonly familyName: string | null,
        public readonly size: number | null,
        public readonly type: string | null
    ) {}
}

const cachedSources = new Map<string, string>();
function scaledSource(
    base: string,
    extension: string,
    scale: string
): Observable<string> {
    const src = `${base}@${scale}x.${extension}`;
    const cached = cachedSources.get(src);
    if (cached) {
        return of(cached);
    }

    return fromFetch(src, {
        method: 'HEAD',
        headers: {
            accept: 'image/*',
        },
    }).pipe(
        map((value) =>
            value.ok && value.headers.get('Content-Type')?.startsWith('image')
                ? `${src} ${scale}x`
                : ''
        ),
        tap((value) => cachedSources.set(src, value)),
        timeout(300),
        catchError((err) => of(''))
    );
}
