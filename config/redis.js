import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true
});

// 🔗 Connect explicitly
redis
  .connect()
  .then(() => console.log("✅ Redis Connected (Local WSL)"))
  .catch(err => console.error("❌ Redis Connection Failed:", err));

// 🔥 Error listener
redis.on("error", err => {
  console.error("❌ Redis Error:", err.message);
});

export default redis;
