import mongoose from "mongoose";

const connectToDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set. Add it to your .env file.");
  }

  if (/[<][^>]+[>]/.test(mongoUri)) {
    throw new Error(
      "MONGODB_URI still contains placeholder values. Replace them with a real MongoDB connection string. Atlas is recommended, but a local replica-set URI also works."
    );
  }

  await mongoose.connect(mongoUri);
};

export default connectToDatabase;
