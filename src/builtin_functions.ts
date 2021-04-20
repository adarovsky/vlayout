import { Engine } from './engine';
import {
    ColorContainer,
    FontContainer,
    ImageContainer,
    TypeDefinition,
} from './types';
import { combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface FunctionImplementationI {
    returnType: TypeDefinition;
    name: string;
    parameterTypes: TypeDefinition[];

    sink(parameters: Observable<any>[]): Observable<any>;
}

export class FunctionImplementation {
    constructor(public readonly engine: Engine) {}
}

export class LocalizedNumber
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'String';
        this.parameterTypes = [engine.numberType()];
        this.returnType = engine.stringType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return parameters[0].pipe(map((x) => `${x}`));
    }
}

export class ShortLocalizedNumber
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'ShortString';
        this.parameterTypes = [engine.numberType()];
        this.returnType = engine.stringType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return parameters[0].pipe(
            map((x) => {
                if (x > 1000000) {
                    return `${Math.round(x / 100000) / 10} M`;
                } else if (x > 1000) {
                    return `${Math.round(x / 100) / 10} K`;
                }
                return `${x}`;
            })
        );
    }
}

export class LocalizedString
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'String';
        this.parameterTypes = [engine.stringType()];
        this.returnType = engine.stringType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters as Observable<string>[]).pipe(
            map((params) => {
                let key = params[0];
                for (let i = params.length - 1; i >= 1; --i) {
                    key = key.replace(`$${i}`, params[i]);
                }

                return key;
            })
        );
    }
}

export class Image
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'Image';
        this.parameterTypes = [engine.stringType()];
        this.returnType = engine.imageType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return parameters[0].pipe(map((x) => new ImageContainer(x)));
    }
}

export class FontFamily
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'Font';
        this.parameterTypes = [engine.stringType(), engine.numberType()];
        this.returnType = engine.fontType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters as Observable<any>[]).pipe(
            map((params) => new FontContainer(params[0], params[1], null))
        );
    }
}

export class FontTyped
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'Font';
        this.parameterTypes = [engine.type('FontType')!, engine.numberType()];
        this.returnType = engine.fontType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters as Observable<any>[]).pipe(
            map((params) => new FontContainer(null, params[1], params[0]))
        );
    }
}

export class FontSized
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'Font';
        this.parameterTypes = [engine.numberType()];
        this.returnType = engine.fontType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return parameters[0].pipe(
            map((params) => new FontContainer(null, params, null))
        );
    }
}

export class ColorAlpha
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'Color';
        this.parameterTypes = [engine.colorType(), engine.numberType()];
        this.returnType = engine.colorType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters as Observable<any>[]).pipe(
            map((params) => {
                const original = params[0] as ColorContainer;
                const alpha = params[1] as number;
                return new ColorContainer(
                    original.red,
                    original.green,
                    original.blue,
                    Math.max(0, Math.min(alpha, 1))
                );
            })
        );
    }
}

export class Min
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'Min';
        this.parameterTypes = [engine.numberType(), engine.numberType()];
        this.returnType = engine.numberType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters as Observable<number>[]).pipe(
            map((params) =>
                params.reduce((previousValue, currentValue) =>
                    Math.min(previousValue, currentValue)
                )
            )
        );
    }
}

export class Max
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'Max';
        this.parameterTypes = [engine.numberType(), engine.numberType()];
        this.returnType = engine.numberType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters as Observable<number>[]).pipe(
            map((params) =>
                params.reduce((previousValue, currentValue) =>
                    Math.max(previousValue, currentValue)
                )
            )
        );
    }
}

export class Round
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'Round';
        this.parameterTypes = [engine.numberType()];
        this.returnType = engine.numberType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters as Observable<number>[]).pipe(
            map((params) =>
                Math.round(params[0])
            )
        );
    }
}

export class Floor
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'Floor';
        this.parameterTypes = [engine.numberType()];
        this.returnType = engine.numberType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters as Observable<number>[]).pipe(
            map((params) =>
                Math.floor(params[0])
            )
        );
    }
}

export class Ceil
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'Ceil';
        this.parameterTypes = [engine.numberType()];
        this.returnType = engine.numberType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters as Observable<number>[]).pipe(
            map((params) =>
                Math.ceil(params[0])
            )
        );
    }
}

export class StringPrefix
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'Prefix';
        this.parameterTypes = [engine.stringType(), engine.numberType()];
        this.returnType = engine.stringType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters).pipe(
            map((params) => {
                const s = params[0] as string;
                const l = params[1] as number;
                if (l >= s.length) {
                    return s;
                }
                return s.substr(0, l);
            })
        );
    }
}

export class StringSuffix
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'Suffix';
        this.parameterTypes = [engine.stringType(), engine.numberType()];
        this.returnType = engine.stringType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters).pipe(
            map((params) => {
                const s = params[0] as string;
                const l = params[1] as number;
                if (l >= s.length) {
                    return s;
                }
                return s.slice(-l);
            })
        );
    }
}

export class SubString
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'SubString';
        this.parameterTypes = [
            engine.stringType(),
            engine.numberType(),
            engine.numberType(),
        ];
        this.returnType = engine.stringType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters).pipe(
            map((params) => {
                const s = params[0] as string;
                const start = params[1] as number;
                const length = params[2] as number;
                return s.substr(start, length);
            })
        );
    }
}

export class ToUpper
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'ToUpper';
        this.parameterTypes = [engine.stringType()];
        this.returnType = engine.stringType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters).pipe(
            map((params) => {
                const s = params[0] as string;
                return s.toLocaleUpperCase();
            })
        );
    }
}

export class ToLower
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'ToLower';
        this.parameterTypes = [engine.stringType()];
        this.returnType = engine.stringType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters).pipe(
            map((params) => {
                const s = params[0] as string;
                return s.toLocaleLowerCase();
            })
        );
    }
}

export class ToCapitalCase
    extends FunctionImplementation
    implements FunctionImplementationI {
    name: string;
    parameterTypes: TypeDefinition[];
    returnType: TypeDefinition;

    constructor(engine: Engine) {
        super(engine);

        this.name = 'ToCapital';
        this.parameterTypes = [engine.stringType()];
        this.returnType = engine.stringType();
    }

    sink(parameters: Observable<any>[]): Observable<any> {
        return combineLatest(parameters).pipe(
            map((params) => {
                const s = params[0] as string;
                return s.length > 1
                    ? s[0].toLocaleUpperCase() + s.slice(1)
                    : s.toLocaleUpperCase();
            })
        );
    }
}
