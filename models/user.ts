import mongoose, { model } from "mongoose";
const Schema = mongoose.Schema;

export interface IUser {
  name: string,
  email: string,
  password: string,
  refreshToken: string
}

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    refreshToken: { type: String },
  },
  { collection: "user-data" }
);

export default model<IUser>("User", UserSchema);