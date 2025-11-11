import mongoose from "mongoose";
const { Schema, Types } = mongoose;

const UserSchema = new Schema(
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
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

const UserModel = mongoose.model("User", UserSchema);

export default UserModel;
