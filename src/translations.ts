import { Dictionary } from './types';

export default class Translations {
    constructor(readonly content: Readonly<Dictionary<string>>) {
    }

    getValue(key: string): string {
        return this.content[key] ?? key;
    }
}
