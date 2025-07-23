// Custom HttpError subclass that extends from NodeJs' Error class which will be used throughout the application

export class HttpError extends Error {
    code: number
    constructor(message: string, errorCode: number) {
        super(message)
        this.code = errorCode
    }
}