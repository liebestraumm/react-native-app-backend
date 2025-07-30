import nodemailer from "nodemailer";
import "dotenv/config";
import envs from "../env";

interface IMailBody {
  subject: string;
  html?: string;
  text?: string;
}

class Mail {
  private recipients: Array<string>;
  private sender: string;
  private mailBody: IMailBody;
  constructor(recipients: Array<string>, sender: string, mailBody: IMailBody) {
    this.recipients = recipients;
    this.sender = sender;
    this.mailBody = mailBody;
  }
  async send() {
    // Looking to send emails in production? Check out our Email API/SMTP product!
    var transport = nodemailer.createTransport({
      host: envs.MAILTRAP_HOST,
      port: 2525,
      auth: {
        user: envs.MAILTRAP_USER,
        pass: envs.MAILTRAP_PASS,
      },
    });
    await transport.sendMail({
      from: this.sender,
      to: this.recipients,
      ...this.mailBody,
    });
  }
}

export default Mail;
