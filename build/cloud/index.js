"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudApi = void 0;
const cloudinary_1 = require("cloudinary");
const env_1 = __importDefault(require("../env"));
const CLOUD_NAME = env_1.default.CLOUD_NAME;
const CLOUD_KEY = env_1.default.CLOUD_KEY;
const CLOUD_SECRET = env_1.default.CLOUD_SECRET;
cloudinary_1.v2.config({
    cloud_name: CLOUD_NAME,
    api_key: CLOUD_KEY,
    api_secret: CLOUD_SECRET,
    secure: true,
});
const cloudUploader = cloudinary_1.v2.uploader;
exports.cloudApi = cloudinary_1.v2.api;
exports.default = cloudUploader;
//# sourceMappingURL=index.js.map