import mongoose from 'mongoose';

const dbConnect = async () => {
	try {
		await mongoose.connect(process.env.ATLAS_URI!);
	} catch (err: unknown) {
		const error = err as mongoose.Error;
		if (error instanceof mongoose.Error) {
			console.log(`Mongoose connection error: ${error.message}`);
		}
	}
};

export default dbConnect;
