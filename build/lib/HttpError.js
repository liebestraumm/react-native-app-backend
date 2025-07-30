"use strict";
// Custom HttpError subclass that extends from NodeJs' Error class which will be used throughout the application
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
class HttpError extends Error {
    constructor(message, errorCode) {
        super(message);
        this.code = errorCode;
    }
}
exports.HttpError = HttpError;
//# sourceMappingURL=HttpError.js.map