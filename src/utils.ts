import { cloneDeep, last, toPath } from 'lodash';
import { Dictionary } from './types';

export function assignDeep(
    source1: Dictionary<any>,
    source2: Dictionary<any>
): Dictionary<any> {
    const result = cloneDeep(source1);
    for (let i in source2) {
        const path = toPath(i);
        let context = result;
        for (let key of path.slice(0, -1)) {
            if (context[key] === undefined) {
                context[key] = {};
            }
            context = context[key];
        }
        context[last(path)!] = source2[i];
    }
    return result;
}

export function isNotNull<T>(id: T): id is Exclude<T, null | undefined> {
    return id !== null && id !== undefined;
}
