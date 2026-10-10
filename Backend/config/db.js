import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(
      process.env.MONGODB_URI
    )

    console.log(
      `[database] MongoDB connected: ${connection.connection.host}`
    )
  } catch (error) {
    console.error(
      '[database] MongoDB connection failed:',
      error.message
    )

    process.exit(1)
  }
}

export default connectDB