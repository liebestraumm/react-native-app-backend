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
exports.newProductSchema = exports.resetPassSchema = exports.verifyTokenSchema = exports.newUserSchema = void 0;
const yup = __importStar(require("yup"));
const categories_1 = __importDefault(require("./categories"));
const date_fns_1 = require("date-fns");
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#\$%\^&\*])[a-zA-Z\d!@#\$%\^&\*]+$/;
// UUID validation regex pattern
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// Function to validate UUID format
const isValidUUID = (value) => {
    if (!value)
        return false;
    return uuidRegex.test(value);
};
yup.addMethod(yup.string, "email", function validateEmail(message) {
    return this.matches(emailRegex, {
        message,
        name: "email",
        excludeEmptyString: true,
    });
});
const password = {
    password: yup
        .string()
        .required("Password is missing")
        .min(8, "Password should be at least 8 chars long!")
        .matches(passwordRegex, "Password is too simple."),
};
exports.newUserSchema = yup.object({
    name: yup.string().required("Name is missing"),
    email: yup.string().email("Invalid email!").required("Email is missing"),
    ...password,
});
const tokenAndId = {
    id: yup.string().test({
        name: "valid-id",
        message: "Invalid user id",
        test: (value) => {
            return isValidUUID(value);
        },
    }),
    token: yup.string().required("Token is missing"),
};
exports.verifyTokenSchema = yup.object({
    ...tokenAndId,
});
exports.resetPassSchema = yup.object({
    ...tokenAndId,
    ...password,
});
exports.newProductSchema = yup.object({
    name: yup.string().required("Name is missing!"),
    description: yup.string().required("Description is missing!"),
    category: yup
        .string()
        .oneOf(categories_1.default, "Invalid category!")
        .required("Category is missing!"),
    price: yup
        .string()
        .transform((value) => {
        if (isNaN(+value))
            return "";
        return +value;
    })
        .required("Price is missing!"),
    purchasingDate: yup
        .string()
        .transform((value) => {
        try {
            return (0, date_fns_1.parseISO)(value);
        }
        catch (error) {
            return "";
        }
    })
        .required("Purchasing date is missing!"),
});
//# sourceMappingURL=validators.js.map