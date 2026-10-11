import dns from 'node:dns'
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
    // Some home/office networks and routers cannot resolve the DNS "SRV"
    // records that mongodb+srv:// connection strings rely on, which fails
    // with "querySrv ECONNREFUSED". Retry once using public DNS servers.
    if (error.syscall === 'querySrv') {
      console.warn(
        '[database] SRV lookup failed with the system DNS. Retrying with public DNS (8.8.8.8, 1.1.1.1)...'
      )

      try {
        dns.setServers(['8.8.8.8', '1.1.1.1'])

        const connection = await mongoose.connect(
          process.env.MONGODB_URI
        )

        console.log(
          `[database] MongoDB connected: ${connection.connection.host}`
        )

        return
      } catch (retryError) {
        console.error(
          '[database] MongoDB connection failed:',
          retryError.message
        )

        process.exit(1)
      }
    }

    console.error(
      '[database] MongoDB connection failed:',
      error.message
    )

    process.exit(1)
  }
}

export default connectDB
