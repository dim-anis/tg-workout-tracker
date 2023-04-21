import mongoose from 'mongoose';
const { connect } = mongoose;
mongoose.set('strictQuery', false);

export default async function dbConnect() {
  return connect(process.env.ATLAS_URI!);
}
