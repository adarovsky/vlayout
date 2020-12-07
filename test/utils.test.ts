import { assignDeep } from '../src/utils';

describe('utils', () => {
    it('assignDeep should disassemble complex property', function() {
        const x1 = { test: 'abc' };
        const x2 = { 'a.b.c': 12 };
        const x3 = assignDeep(x1, x2);
        expect(x3).toEqual({ test: 'abc', a: { b: { c: 12 } } });
        expect(x1).toEqual({ test: 'abc' });
    });

    it('assignDeep should merge overlapped properties', function() {
        const x1 = { test: 'abc', a: { original: 'vvv' } };
        const x2 = { 'a.b.c': 12 };
        const x3 = assignDeep(x1, x2);
        expect(x3).toEqual({
            test: 'abc',
            a: { original: 'vvv', b: { c: 12 } },
        });
        expect(x1).toEqual({ test: 'abc', a: { original: 'vvv' } });
    });

    it('assignDeep should merge overlapped properties 2', function() {
        const x1 = { test: 'abc', a: { original: 'vvv' } };
        const x2 = { 'a.b.c': 12, 'a.b.d': 100, 'a.another.c.d.e.f': 120 };
        const x3 = assignDeep(x1, x2);
        expect(x3).toEqual({
            test: 'abc',
            a: {
                original: 'vvv',
                b: { c: 12, d: 100 },
                another: { c: { d: { e: { f: 120 } } } },
            },
        });
        expect(x1).toEqual({ test: 'abc', a: { original: 'vvv' } });
    });
});
