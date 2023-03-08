import * as mongoose from 'mongoose';

mongoose.set('strictQuery', false);

export default async function dbConnect() {
	return mongoose.connect(process.env.ATLAS_URI!);
}
