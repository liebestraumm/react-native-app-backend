"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const HttpError_1 = require("./lib/HttpError");
const httpCode_1 = __importDefault(require("./constants/httpCode"));
require("./db");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const formidable_1 = __importDefault(require("formidable"));
const path_1 = __importDefault(require("path"));
const env_1 = __importDefault(require("./env"));
const app = (0, express_1.default)();
app.use(express_1.default.static("src/public"));
app.use(express_1.default.json());
// Routes
app.use("/api/auth", authRoutes_1.default);
app.use("/api/product", productRoutes_1.default);
// Checks if the route exists. If not, it throws an error
app.use(() => {
    const error = new HttpError_1.HttpError("Could not find this route", httpCode_1.default.NOT_FOUND);
    throw error;
});
// Upload file functionality
app.post("/upload-file", async (req, res) => {
    const form = (0, formidable_1.default)({
        uploadDir: path_1.default.join(__dirname, "public"),
        filename(name, ext, part, form) {
            return Date.now() + "_" + part.originalFilename;
        },
    });
    await form.parse(req);
    res.send("ok");
});
// NodeJS internal middleware that triggers when a HttpError object is thrown
app.use((error, _, response, next) => {
    if (response.headersSent) {
        return next(error);
    }
    response.status(error.code || httpCode_1.default.INTERNAL_SERVER_ERROR);
    response.json({ message: error.message || "An unknown error occurred!" });
});
const startServer = async () => {
    try {
        app.listen(env_1.default.PORT ?? 8000, () => {
            console.log(`App running on port ${env_1.default.PORT ?? 8000}!`);
        });
    }
    catch (err) {
        console.error("Failed to connect to database. Server not started.", err);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=app.js.map