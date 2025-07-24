import { model, Schema } from "mongoose";
import { hash, compare, genSalt } from "bcrypt";
import { IUserDocument } from "../interfaces/IUserDocument";

interface Methods {
  comparePassword: (password: string) => Promise<boolean>;
}

const userSchema = new Schema<IUserDocument, Methods>(
  {
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

// userSchema.pre("save", async (next) => {
//   (async (doc: UserDocument) => {
//     try {
//       // 'this' refers to the document being saved
//       if (doc.isModified("password")) {
//         const salt = await genSalt(10);
//         doc.password = await hash(doc.password, salt);
//       }
//       return next();
//     } catch (error) {
//       return next(error as Error);
//     }
//   })(userSchema);
//   next();
// });

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await genSalt(10);
    this.password = await hash(this.password, salt);
  }

  next();
});

// userSchema.methods.comparePassword = async function (password: string) {
//   return await compare(password, this.password);
// };

userSchema.methods.comparePassword = (document: IUserDocument) => (password: string) => {
  const compareAsync = async (pwd: string, hash: string): Promise<boolean> => 
    await compare(pwd, hash);
  
  return compareAsync(password, document.password);
};

const UserModel = model("User", userSchema);
export default UserModel;
