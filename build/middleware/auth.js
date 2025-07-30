"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidPassResetToken = exports.isAuth = void 0;
const HttpError_1 = require("../lib/HttpError");
const httpCode_1 = __importDefault(require("../constants/httpCode"));
const jsonwebtoken_1 = __importStar(require("jsonwebtoken"));
const models_1 = require("../models");
require("dotenv/config");
const isAuth = async (request, response, next) => {
    try {
        const authToken = request.headers.authorization;
        if (!authToken)
            throw new HttpError_1.HttpError("Unauthorized request", httpCode_1.default.FORBIDDEN);
        const token = authToken.split("Bearer ")[1];
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET ?? "");
        const user = await models_1.User.findByPk(payload.id, {
            include: [{ model: models_1.Asset, as: 'avatar' }]
        });
        if (!user)
            throw new HttpError_1.HttpError("Unauthorized request", httpCode_1.default.FORBIDDEN);
        request.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            verified: user.verified,
            avatar: user.avatar?.url ?? ""
        };
        next();
    }
    catch (error) {
        let authError;
        if (error instanceof jsonwebtoken_1.TokenExpiredError) {
            authError = new HttpError_1.HttpError("Session expired", httpCode_1.default.UNAUTHORIZED);
        }
        else if (error instanceof jsonwebtoken_1.JsonWebTokenError) {
            authError = new HttpError_1.HttpError("Unauthorized access", httpCode_1.default.UNAUTHORIZED);
        }
        return next(authError ? authError : error);
    }
};
exports.isAuth = isAuth;
const isValidPassResetToken = async (req, res, next) => {
    // Read token and id
    const { id, token } = req.body;
    try {
        // Find token inside database with owner id.
        const resetPassToken = await models_1.PasswordResetToken.findOne({
            where: { user_id: id },
        });
        // If there is no token send error.
        if (!resetPassToken)
            throw new HttpError_1.HttpError("Unauthorized request, invalid token", httpCode_1.default.FORBIDDEN);
        // Else compare token with encrypted value.
        const matched = await resetPassToken.compareToken(token);
        // If not matched send error.
        if (!matched)
            throw new HttpError_1.HttpError("Unauthorized request, token doesn't match", httpCode_1.default.FORBIDDEN);
        next();
    }
    catch (error) {
        console.log(error);
        return next(error);
    }
};
exports.isValidPassResetToken = isValidPassResetToken;
//# sourceMappingURL=auth.js.map