"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const formidable_1 = __importDefault(require("formidable"));
const fileParser = async (request, response, next) => {
    const form = (0, formidable_1.default)();
    try {
        const [fields, files] = await form.parse(request);
        if (!request.body)
            request.body = {};
        for (let key in fields) {
            request.body[key] = fields[key][0];
        }
        if (!request.files)
            request.files = {};
        for (let key in files) {
            const actualFiles = files[key];
            if (!actualFiles)
                break;
            if (actualFiles.length > 1) {
                request.files[key] = actualFiles;
            }
            else {
                request.files[key] = actualFiles[0];
            }
        }
        next();
    }
    catch (error) {
        console.log(error);
        return next(error);
    }
};
exports.default = fileParser;
//# sourceMappingURL=fileParser.js.map