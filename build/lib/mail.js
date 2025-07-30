"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
require("dotenv/config");
const env_1 = __importDefault(require("../env"));
class Mail {
    constructor(recipients, sender, mailBody) {
        this.recipients = recipients;
        this.sender = sender;
        this.mailBody = mailBody;
    }
    async send() {
        // Looking to send emails in production? Check out our Email API/SMTP product!
        var transport = nodemailer_1.default.createTransport({
            host: env_1.default.MAILTRAP_HOST,
            port: 2525,
            auth: {
                user: env_1.default.MAILTRAP_USER,
                pass: env_1.default.MAILTRAP_PASS,
            },
        });
        await transport.sendMail({
            from: this.sender,
            to: this.recipients,
            ...this.mailBody,
        });
    }
}
exports.default = Mail;
//# sourceMappingURL=mail.js.map