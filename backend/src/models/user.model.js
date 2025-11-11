import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "User name is required"],
      unique: true,
      trim: true,
      length: { min: 3, max: 50 },
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      length: { max: 50 },
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "user"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  // Chỉ hash mật khẩu nếu nó được thay đổi (hoặc là user mới)
  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = model("User", userSchema);

export default User;
