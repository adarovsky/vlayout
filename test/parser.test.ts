import { Lexer, LexIdentifier, LexString } from '../src/lexer';


describe('parser', () => {
    it('should parse one-symbol string', () => {
        let parser = new Lexer('"-"');
        const token = parser.next();
        expect(token).not.toBeNull();
        expect(token instanceof LexString).toBeTruthy();
        expect(token!.content).toBe('-');
        expect(parser.current()).toBe(token);
    })

    it('should parse case _ => "-"', () => {
        let parser = new Lexer('case _ => "-" }');

        parser.next();
        expect(parser.current()).not.toBeNull();
        expect(parser.current() instanceof LexIdentifier).toBeTruthy();
        expect(parser.current()!.content).toBe('case');

        parser.next();
        expect(parser.current()).not.toBeNull();
        expect(parser.current()!.content).toBe('_');

        parser.next();
        expect(parser.current()).not.toBeNull();
        expect(parser.current()!.content).toBe('=>');

        parser.next();
        expect(parser.current()).not.toBeNull();
        expect(parser.current() instanceof LexString).toBeTruthy();
        expect(parser.current()!.content).toBe('-');

        parser.next();
        expect(parser.current()).not.toBeNull();
        expect(parser.current()!.content).toBe('}');

    })

});
