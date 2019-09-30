import {VLScannerFSM, VLScannerFSMDelegate, VLScannerFSMEvents, VLScannerFSMStates} from "./lexer_fsm";

export class LexToken {
    line: number;
    column: number;
    content: string;
    append(c: string): void {
        this.content += c;
    }

    constructor(line: number, column: number) {
        this.line = line;
        this.column = column;
        this.content = '';
    }
}

export class LexNumber extends LexToken {
}

export class LexIdentifier extends LexToken {
}

export class LexSymbol extends LexToken {
}

export class LexColor extends LexToken {
}

export class LexString extends LexToken {
}

export class Lexer implements VLScannerFSMDelegate {
    position: number;
    content: string;

    currentLine: number;
    currentColumn: number;

    nextLine: number;
    nextColumn: number;

    _building: LexToken|null = null;
    _currentLex: LexToken|null = null;
    _produced: boolean = false;
    _currentChar: string = '';
    _openingQuote: string = '';

    fsm: VLScannerFSM;

    constructor(content: string) {
        this.content = content;
        this.position = 0;
        this.currentLine = this.currentColumn = this.nextLine = this.nextColumn = 1;
        this.fsm = new VLScannerFSM(this);
    }
    read(): string {
        if (this.position >= this.content.length) return '';
        const c = this.content[this.position++];
        if (c === '\n') {
            this.nextLine++;
            this.nextColumn = 1;
        }
        else {
            this.nextColumn++;
        }
        return c;
    }
    pushBack() : void {
        if (--this.nextColumn <= 0) {
            this.nextColumn = 1;
            --this.nextLine;
        }
        this.position--;
    }

    atEnd() : boolean {
        return this.fsm.state === VLScannerFSMStates.End ||
               this.fsm.state === VLScannerFSMStates.Error;
    }

    current(): LexToken {
        return this._currentLex!;
    }

    next(): LexToken|null {
        this._produced = false;
        this._currentLex = null;
        do {
            this._currentChar = this.read();
            if (this._currentChar !=='') {
                this.fsm.processEvent(VLScannerFSMEvents.Symbol, null);
            }
            else
                this.fsm.processEvent(VLScannerFSMEvents.Eof, null);
            this.currentLine = this.nextLine;
            this.currentColumn = this.nextColumn;

        } while (!this._produced && !this.atEnd());

//    NSLog(@"lex: %ld:%ld: %@", _currentLex.line, _currentLex.column, _currentLex.content);
        return this._currentLex;
    }

    addColor(x: any): void {
        if (this._building) throw new Error(`expecting clean state, currently building ${this._building}`);
        this._building = new LexColor(this.currentLine, this.currentColumn)
    }

    addIdentifier(x: any): void {
        if (this._building) throw new Error(`expecting clean state, currently building ${this._building}`);
        this._building = new LexIdentifier(this.currentLine, this.currentColumn)
    }

    addNumber(x: any): void {
        if (this._building) throw new Error(`expecting clean state, currently building ${this._building}`);
        this._building = new LexNumber(this.currentLine, this.currentColumn)
    }

    addString(x: any): void {
        if (this._building) throw new Error(`expecting clean state, currently building ${this._building}`);
        this._building = new LexString(this.currentLine, this.currentColumn)
    }

    addSymbol(x: any): void {
        if (this._building) throw new Error(`expecting clean state, currently building ${this._building}`);
        this._building = new LexSymbol(this.currentLine, this.currentColumn)
    }

    appendSimpleEscape(x: any): void {
        switch (this._currentChar) {
            case 'n':
                this._building!.append('\n');
                break;
            case 'r':
                this._building!.append('\r');
                break;
            case 'a':
                this._building!.append('a');
                break;
            default:
                break;
        }
    }

    appendSymbol(x: any): void {
        this._building!.append(this._currentChar)
    }

    isAnd(x: any): boolean {
        return this._currentChar === '&';
    }

    isBackslash(x: any): boolean {
        return this._currentChar === '\\';
    }

    isCompoundSymbolStart(x: any): boolean {
        switch (this._currentChar) {
            case '>':
            case '<':
            case '=':
            case '!':
                return true;

            default:
                return false;
        }
    }

    isDigit(x: any): boolean {
        return /^\d$/.test(this._currentChar)
    }

    isDot(x: any): boolean {
        return this._currentChar === '.';
    }

    isEq(x: any): boolean {
        return this._currentChar === '=';
    }

    isHash(x: any): boolean {
        return this._currentChar === '#';
    }

    isLetter(x: any): boolean {
        return /^[a-zA-Z_@]$/.test(this._currentChar)
    }

    isMatchingQuote(x: any): boolean {
        return this._currentChar === this._openingQuote;
    }

    isMore(x: any): boolean {
        return this._currentChar === '>';
    }

    isNewline(x: any): boolean {
        return this._currentChar === '\n';
    }

    isOr(x: any): boolean {
        return this._currentChar === '|';
    }

    isQuote(x: any): boolean {
        return this._currentChar === '"' || this._currentChar === "'";
    }

    isSimpleEscape(x: any): boolean {
        switch (this._currentChar) {
            case 'n':
            case 'r':
            case 'a':
                return true;
            default:
                return false;
        }
    }

    isSlash(x: any): boolean {
        return this._currentChar === '/';
    }

    isSymbol(x: any): boolean {
        return /^[{}(),.:?+-=|*/%<>]$/.test(this._currentChar);
    }

    isValidColorChar(x: any): boolean {
        if (this._building!.content.length > 6) return false;

        return /^[0-9a-fA-F]$/.test(this._currentChar);
    }

    isWhitespace(x: any): boolean {
        return /^\s$/.test(this._currentChar);
    }

    produceToken(x: any): void {
        this._currentLex = this._building;
        this._building = null;
        this._produced = true;
    }

    reportUnexpectedEof(x: any): void {
        throw new Error(`${this.currentLine}:${this.currentColumn}: unexpected end of file`)
    }

    reportUnexpectedSymbol(x: any): void {
        if (this._building) {
            throw new Error(`${this.currentLine}:${this.currentColumn}: unexpected symbol ${this._currentChar} while reading ${this._building!.content}`);
        }
        throw new Error(`${this.currentLine}:${this.currentColumn}: unexpected symbol ${this._currentChar}`);
    }

    resetToken(x: any): void {
        this._currentLex = null;
        this._building = null;
        this._produced = false;
    }

    storeOpenQuote(x: any): void {
        this._openingQuote = this._currentChar;
    }
}