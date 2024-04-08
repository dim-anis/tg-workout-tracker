import { envVariables } from "@/config.js";
import mongoose from "mongoose";
const { connect } = mongoose;

mongoose.set("strictQuery", false);
mongoose.connection.on("connected", () => console.log("db connected"));

export default async function dbConnect() {
  return await connect(envVariables.DB_URL);
}
