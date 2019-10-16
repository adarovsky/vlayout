import {AbsoluteLayout, LinearLayoutAxis, View} from "./view";
import {Layout} from "./layout";
import {LexIdentifier} from "./lexer";
import {Variable} from "./expression";

export class ListItemPrototype extends AbsoluteLayout {
    name: string;
    constructor(name: LexIdentifier) {
        super();
        this.name = name.content;
        this.line = name.line;
        this.column = name.column;
    }
}

export class List extends View {
    model: Variable|null = null;
    prototypes: ListItemPrototype[] = [];

    constructor(readonly axis: LinearLayoutAxis) {
        super();
    }

    link(layout: Layout): void {
        super.link(layout);
    }
}