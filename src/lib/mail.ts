import nodemailer from "nodemailer";
import { MailtrapTransport } from "mailtrap";
import "dotenv/config";

interface ISender {
  address: string,
  name: string
}

interface IMailBody {
  subject: string,
  html?: string,
  text?: string,
  category?: string
}

class Mail {
  private recipients: Array<string>;
  private sender: ISender
  private mailBody: IMailBody
  constructor(recipients: Array<string>, sender: ISender, mailBody: IMailBody) {
    this.recipients = recipients;
    this.sender = sender
    this.mailBody = mailBody
  }
  async send() {
    const transport = nodemailer.createTransport(
      MailtrapTransport({
        token: process.env.MAILTRAP_API_TOKEN ?? "",
      })
    );
    await transport.sendMail({
      from: this.sender,
      to: this.recipients,
      ...this.mailBody
    });
  }
}

export default Mail
