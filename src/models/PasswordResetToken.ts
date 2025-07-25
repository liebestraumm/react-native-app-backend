import { compare, genSalt, hash } from "bcrypt";
import { Schema, model } from "mongoose";
import { IPasswordResetTokenDocument } from "../interfaces/IPasswordResetTokenDocument";

interface Methods {
  compareToken(token: string): Promise<boolean>;
}

const passwordResetTokenschema = new Schema<IPasswordResetTokenDocument, {}, Methods>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    expires: 3600, // 60 * 60
    default: Date.now(),
  },
});

passwordResetTokenschema.pre("save", async function (next) {
  if (this.isModified("token")) {
    const salt = await genSalt(10);
    this.token = await hash(this.token, salt);
  }

  next();
});

passwordResetTokenschema.methods.compareToken = async function (token) {
  return await compare(token, this.token);
};

const PasswordResetTokenModel = model("PasswordResetToken", passwordResetTokenschema);
export default PasswordResetTokenModel;
