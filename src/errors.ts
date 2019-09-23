export class LinkError extends Error {
    constructor(line: number, column: number, message: string) {
        super(`${line}:${column}: ${message}`);
    }
}