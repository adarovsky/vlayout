
export enum VLScannerFSMStates {
    And = 'And',
    AvoidTriple = 'AvoidTriple',
    Color = 'Color',
    Comment = 'Comment',
    CompoundEq = 'CompoundEq',
    End = 'End',
    Error = 'Error',
    Float = 'Float',
    Identifier = 'Identifier',
    MayBeComment = 'MayBeComment',
    Number = 'Number',
    Or = 'Or',
    String = 'String',
    StringEscape = 'StringEscape',
    UnicodeEscape = 'UnicodeEscape',
    Whitespace = 'Whitespace',
}

export enum VLScannerFSMEvents {
    Init = 0,
    Eof = 1,
    Symbol = 2,
}

export interface VLScannerFSMDelegate {
    // inputs
    isAnd(x: any): boolean;
    isBackslash(x: any): boolean;
    isCompoundSymbolStart(x: any): boolean;
    isDigit(x: any): boolean;
    isDot(x: any): boolean;
    isEq(x: any): boolean;
    isHash(x: any): boolean;
    isLetter(x: any): boolean;
    isMatchingQuote(x: any): boolean;
    isMore(x: any): boolean;
    isNewline(x: any): boolean;
    isOr(x: any): boolean;
    isQuote(x: any): boolean;
    isSimpleEscape(x: any): boolean;
    isSlash(x: any): boolean;
    isSymbol(x: any): boolean;
    isValidColorChar(x: any): boolean;
    isWhitespace(x: any): boolean;

    // outputs
    addColor(x: any): void;
    addIdentifier(x: any): void;
    addNumber(x: any): void;
    addString(x: any): void;
    addSymbol(x: any): void;
    appendSimpleEscape(x: any): void;
    appendSymbol(x: any): void;
    produceToken(x: any): void;
    pushBack(x: any): void;
    reportUnexpectedEof(x: any): void;
    reportUnexpectedSymbol(x: any): void;
    resetToken(x: any): void;
    storeOpenQuote(x: any): void;
}

export class VLScannerFSM {
    _events: Array<[VLScannerFSMEvents, any]>;
    state: VLScannerFSMStates;
    delegate: VLScannerFSMDelegate;

    constructor(delegate: VLScannerFSMDelegate) {
        this.state = VLScannerFSMStates.Whitespace;
        this._events = [];
        this.delegate = delegate;
    }
    eventName(event: VLScannerFSMEvents): string {
        switch (event) {
            case VLScannerFSMEvents.Init:
                return '<Initialization event>';
            case VLScannerFSMEvents.Eof:
                return 'Eof';
            case VLScannerFSMEvents.Symbol:
                return 'Symbol';
        }
        return "Unknown (" + event + ")";
    }

    stateName(state: VLScannerFSMStates) {
        switch (state) {
            case VLScannerFSMStates.And:
                return 'And';
            case VLScannerFSMStates.AvoidTriple:
                return 'AvoidTriple';
            case VLScannerFSMStates.Color:
                return 'Color';
            case VLScannerFSMStates.Comment:
                return 'Comment';
            case VLScannerFSMStates.CompoundEq:
                return 'CompoundEq';
            case VLScannerFSMStates.End:
                return 'End';
            case VLScannerFSMStates.Error:
                return 'Error';
            case VLScannerFSMStates.Float:
                return 'Float';
            case VLScannerFSMStates.Identifier:
                return 'Identifier';
            case VLScannerFSMStates.MayBeComment:
                return 'MayBeComment';
            case VLScannerFSMStates.Number:
                return 'Number';
            case VLScannerFSMStates.Or:
                return 'Or';
            case VLScannerFSMStates.String:
                return 'String';
            case VLScannerFSMStates.StringEscape:
                return 'StringEscape';
            case VLScannerFSMStates.UnicodeEscape:
                return 'UnicodeEscape';
            case VLScannerFSMStates.Whitespace:
                return 'Whitespace';
        }
        return "Unknown (" + state + ")";
    }

    processEvent(event: VLScannerFSMEvents, params: any) {
        const empty = this._events.length === 0;

        this._events.push([event, params]);
        if (empty) {
            this._processQueue();
        }
    }

    isIn (): boolean {
        const self = this;
        const args = Array.prototype.slice.call(arguments);
        for(let i = 0; i < args.length; ++i) {
            if (args[i] === self.state)
                return true;
        }
        return false;
    }


    _processQueue(): void {
        const self = this;

        while (self._events.length > 0) {
            const [event, params] = self._events[0];
            self._processEvent(event, params);
            self._events.shift();
        }
    }

    _processEvent(event: VLScannerFSMEvents, params: any): void {

//    assert(_.includes(_.values(VLScannerFSMEvents), event), 'Unknown event ' + event + ' passed');

        if (event === VLScannerFSMEvents.Init) {
            this.state = VLScannerFSMStates.Whitespace;
            return;
        }

        switch (this.state) {
        case VLScannerFSMStates.And:
            // compound and
            if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isAnd(params))) {
                this.state = VLScannerFSMStates.AvoidTriple;
                this.delegate.appendSymbol(params);
                this.delegate.produceToken(params);
            }
            // single
            else if ((event === VLScannerFSMEvents.Symbol) && !(this.delegate.isAnd(params))) {
                this.state = VLScannerFSMStates.Whitespace;
                this.delegate.produceToken(params);
                this.delegate.pushBack(params);
            }
            // end
            else if (event === VLScannerFSMEvents.Eof) {
                this.state = VLScannerFSMStates.End;
                this.delegate.produceToken(params);
            }
            break;
        case VLScannerFSMStates.AvoidTriple:
            // done
            if ((event === VLScannerFSMEvents.Symbol) && !(this.delegate.isAnd(params)) && !(this.delegate.isOr(params))) {
                this.state = VLScannerFSMStates.Whitespace;
                this.delegate.pushBack(params);
            }
            // wrong
            else if (event === VLScannerFSMEvents.Symbol) {
                this.state = VLScannerFSMStates.Error;
                this.delegate.reportUnexpectedSymbol(params);
                this.delegate.resetToken(params);
            }
            // eof
            else if (event === VLScannerFSMEvents.Eof) {
                this.state = VLScannerFSMStates.End;
            }
            break;
        case VLScannerFSMStates.Color:
            // valid
            if ((event === VLScannerFSMEvents.Symbol) && (!(this.delegate.isLetter(params)) && !(this.delegate.isDigit(params)))) {
                this.state = VLScannerFSMStates.Whitespace;
                this.delegate.produceToken(params);
                this.delegate.pushBack(params);
            }
            // c
            else if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isValidColorChar(params))) {
                this.delegate.appendSymbol(params);
            }
            // wrong color
            else if (event === VLScannerFSMEvents.Symbol) {
                this.state = VLScannerFSMStates.Error;
                this.delegate.reportUnexpectedSymbol(params);
                this.delegate.resetToken(params);
            }
            // end
            else if (event === VLScannerFSMEvents.Eof) {
                this.state = VLScannerFSMStates.Error;
                this.delegate.reportUnexpectedEof(params);
                this.delegate.resetToken(params);
            }
            break;
        case VLScannerFSMStates.Comment:
            // done
            if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isNewline(params))) {
                this.state = VLScannerFSMStates.Whitespace;
            }
            // end
            else if (event === VLScannerFSMEvents.Eof) {
                this.state = VLScannerFSMStates.End;
            }
            break;
        case VLScannerFSMStates.CompoundEq:
            // done
            if ((event === VLScannerFSMEvents.Symbol) && ((this.delegate.isEq(params)) || (this.delegate.isMore(params)))) {
                this.state = VLScannerFSMStates.Whitespace;
                this.delegate.appendSymbol(params);
                this.delegate.produceToken(params);
            }
            // single
            else if (event === VLScannerFSMEvents.Symbol) {
                this.state = VLScannerFSMStates.Whitespace;
                this.delegate.produceToken(params);
                this.delegate.pushBack(params);
            }
            break;
        case VLScannerFSMStates.End:
            break;
        case VLScannerFSMStates.Error:
            break;
        case VLScannerFSMStates.Float:
            // digit
            if ((this.delegate.isDigit(params))) {
                this.delegate.appendSymbol(params);
            }
            // done
            else if ((event === VLScannerFSMEvents.Symbol) && ((this.delegate.isWhitespace(params)) || (this.delegate.isSymbol(params)) || (this.delegate.isQuote(params)))) {
                this.state = VLScannerFSMStates.Whitespace;
                this.delegate.produceToken(params);
                this.delegate.pushBack(params);
            }
            // error
            else if (event === VLScannerFSMEvents.Symbol) {
                this.state = VLScannerFSMStates.Error;
                this.delegate.reportUnexpectedSymbol(params);
                this.delegate.resetToken(params);
            }
            // eof
            else if (event === VLScannerFSMEvents.Eof) {
                this.state = VLScannerFSMStates.End;
                this.delegate.produceToken(params);
            }
            break;
        case VLScannerFSMStates.Identifier:
            // fill
            if ((event === VLScannerFSMEvents.Symbol) && ((this.delegate.isLetter(params)) || (this.delegate.isDigit(params)))) {
                this.delegate.appendSymbol(params);
            }
            // finished
            else if (event === VLScannerFSMEvents.Symbol) {
                this.state = VLScannerFSMStates.Whitespace;
                this.delegate.produceToken(params);
                this.delegate.pushBack(params);
            }
            // eof
            else if (event === VLScannerFSMEvents.Eof) {
                this.state = VLScannerFSMStates.End;
                this.delegate.produceToken(params);
            }
            break;
        case VLScannerFSMStates.MayBeComment:
            // comment
            if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isSlash(params))) {
                this.state = VLScannerFSMStates.Comment;
                this.delegate.resetToken(params);
            }
            // div
            else if (event === VLScannerFSMEvents.Symbol) {
                this.state = VLScannerFSMStates.Whitespace;
                this.delegate.produceToken(params);
                this.delegate.pushBack(params);
            }
            break;
        case VLScannerFSMStates.Number:
            // digit
            if ((this.delegate.isDigit(params))) {
                this.delegate.appendSymbol(params);
            }
            // dot
            else if ((this.delegate.isDot(params))) {
                this.state = VLScannerFSMStates.Float;
                this.delegate.appendSymbol(params);
            }
            // done
            else if ((this.delegate.isWhitespace(params)) || (this.delegate.isQuote(params)) || (this.delegate.isSymbol(params))) {
                this.state = VLScannerFSMStates.Whitespace;
                this.delegate.produceToken(params);
                this.delegate.pushBack(params);
            }
            // unexpected
            else if (event === VLScannerFSMEvents.Symbol) {
                this.state = VLScannerFSMStates.Error;
                this.delegate.resetToken(params);
            }
            break;
        case VLScannerFSMStates.Or:
            // single
            if ((event === VLScannerFSMEvents.Symbol) && !(this.delegate.isOr(params))) {
                this.state = VLScannerFSMStates.Whitespace;
                this.delegate.produceToken(params);
                this.delegate.pushBack(params);
            }
            // compound
            else if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isOr(params))) {
                this.state = VLScannerFSMStates.AvoidTriple;
                this.delegate.appendSymbol(params);
                this.delegate.produceToken(params);
            }
            // eof
            else if (event === VLScannerFSMEvents.Eof) {
                this.state = VLScannerFSMStates.End;
                this.delegate.produceToken(params);
            }
            break;
        case VLScannerFSMStates.String:
            // escape
            if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isBackslash(params))) {
                this.state = VLScannerFSMStates.StringEscape;
            }
            // Symbol
            else if ((event === VLScannerFSMEvents.Symbol) && (!(this.delegate.isQuote(params)) || !(this.delegate.isMatchingQuote(params)))) {
                this.delegate.appendSymbol(params);
            }
            // end
            else if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isQuote(params)) && (this.delegate.isMatchingQuote(params))) {
                this.state = VLScannerFSMStates.Whitespace;
                this.delegate.produceToken(params);
            }
            // eof
            else if (event === VLScannerFSMEvents.Eof) {
                this.state = VLScannerFSMStates.Error;
                this.delegate.reportUnexpectedEof(params);
                this.delegate.resetToken(params);
            }
            break;
        case VLScannerFSMStates.StringEscape:
            // simple
            if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isSimpleEscape(params))) {
                this.state = VLScannerFSMStates.String;
                this.delegate.appendSimpleEscape(params);
            }
            // eof
            else if (event === VLScannerFSMEvents.Eof) {
                this.state = VLScannerFSMStates.Error;
                this.delegate.reportUnexpectedEof(params);
                this.delegate.resetToken(params);
            }
            // quote
            else if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isQuote(params))) {
                this.state = VLScannerFSMStates.String;
                this.delegate.appendSymbol(params);
            }
            break;
        case VLScannerFSMStates.UnicodeEscape:
            break;
        case VLScannerFSMStates.Whitespace:
            // comment
            if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isSlash(params))) {
                this.state = VLScannerFSMStates.MayBeComment;
                this.delegate.addSymbol(params);
                this.delegate.appendSymbol(params);
            }
            // skip
            else if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isWhitespace(params))) {
            }
            // color
            else if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isHash(params))) {
                this.state = VLScannerFSMStates.Color;
                this.delegate.addColor(params);
            }
            // ident
            else if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isLetter(params))) {
                this.state = VLScannerFSMStates.Identifier;
                this.delegate.addIdentifier(params);
                this.delegate.appendSymbol(params);
            }
            // quote
            else if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isQuote(params))) {
                this.state = VLScannerFSMStates.String;
                this.delegate.storeOpenQuote(params);
                this.delegate.addString(params);
            }
            // number
            else if ((this.delegate.isDigit(params))) {
                this.state = VLScannerFSMStates.Number;
                this.delegate.addNumber(params);
                this.delegate.appendSymbol(params);
            }
            // eq
            else if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isCompoundSymbolStart(params))) {
                this.state = VLScannerFSMStates.CompoundEq;
                this.delegate.addSymbol(params);
                this.delegate.appendSymbol(params);
            }
            // and
            else if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isAnd(params))) {
                this.state = VLScannerFSMStates.And;
                this.delegate.addSymbol(params);
                this.delegate.appendSymbol(params);
            }
            // or
            else if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isOr(params))) {
                this.state = VLScannerFSMStates.Or;
                this.delegate.addSymbol(params);
                this.delegate.appendSymbol(params);
            }
            // symbol
            else if ((event === VLScannerFSMEvents.Symbol) && (this.delegate.isSymbol(params))) {
                this.state = VLScannerFSMStates.Whitespace;
                this.delegate.addSymbol(params);
                this.delegate.appendSymbol(params);
                this.delegate.produceToken(params);
            }
            // unexpected
            else if (event === VLScannerFSMEvents.Symbol) {
                this.state = VLScannerFSMStates.Error;
                this.delegate.reportUnexpectedSymbol(params);
                this.delegate.resetToken(params);
            }
            // eof
            else if (event === VLScannerFSMEvents.Eof) {
                this.state = VLScannerFSMStates.End;
            }
            break;
        }

    }
}

// var fsm = new VLScannerFSM({
//     isAnd : function(x) {
//         console.log('stub for isAnd, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isBackslash : function(x) {
//         console.log('stub for isBackslash, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isCompoundSymbolStart : function(x) {
//         console.log('stub for isCompoundSymbolStart, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isDigit : function(x) {
//         console.log('stub for isDigit, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isDot : function(x) {
//         console.log('stub for isDot, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isEq : function(x) {
//         console.log('stub for isEq, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isHash : function(x) {
//         console.log('stub for isHash, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isLetter : function(x) {
//         console.log('stub for isLetter, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isMatchingQuote : function(x) {
//         console.log('stub for isMatchingQuote, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isMore : function(x) {
//         console.log('stub for isMore, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isNewline : function(x) {
//         console.log('stub for isNewline, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isOr : function(x) {
//         console.log('stub for isOr, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isQuote : function(x) {
//         console.log('stub for isQuote, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isSimpleEscape : function(x) {
//         console.log('stub for isSimpleEscape, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isSlash : function(x) {
//         console.log('stub for isSlash, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isSymbol : function(x) {
//         console.log('stub for isSymbol, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isValidColorChar : function(x) {
//         console.log('stub for isValidColorChar, params: ' + JSON.stringify(x));
//         return false;
//     },
//     isWhitespace : function(x) {
//         console.log('stub for isWhitespace, params: ' + JSON.stringify(x));
//         return false;
//     },

//     addColor: function(x) {
//         console.log('stub for addColor, params: ' + JSON.stringify(x));
//         return;
//     },
//     addIdentifier: function(x) {
//         console.log('stub for addIdentifier, params: ' + JSON.stringify(x));
//         return;
//     },
//     addNumber: function(x) {
//         console.log('stub for addNumber, params: ' + JSON.stringify(x));
//         return;
//     },
//     addString: function(x) {
//         console.log('stub for addString, params: ' + JSON.stringify(x));
//         return;
//     },
//     addSymbol: function(x) {
//         console.log('stub for addSymbol, params: ' + JSON.stringify(x));
//         return;
//     },
//     appendSimpleEscape: function(x) {
//         console.log('stub for appendSimpleEscape, params: ' + JSON.stringify(x));
//         return;
//     },
//     appendSymbol: function(x) {
//         console.log('stub for appendSymbol, params: ' + JSON.stringify(x));
//         return;
//     },
//     produceToken: function(x) {
//         console.log('stub for produceToken, params: ' + JSON.stringify(x));
//         return;
//     },
//     pushBack: function(x) {
//         console.log('stub for pushBack, params: ' + JSON.stringify(x));
//         return;
//     },
//     reportUnexpectedEof: function(x) {
//         console.log('stub for reportUnexpectedEof, params: ' + JSON.stringify(x));
//         return;
//     },
//     reportUnexpectedSymbol: function(x) {
//         console.log('stub for reportUnexpectedSymbol, params: ' + JSON.stringify(x));
//         return;
//     },
//     resetToken: function(x) {
//         console.log('stub for resetToken, params: ' + JSON.stringify(x));
//         return;
//     },
//     storeOpenQuote: function(x) {
//         console.log('stub for storeOpenQuote, params: ' + JSON.stringify(x));
//         return;
//     },
// });
