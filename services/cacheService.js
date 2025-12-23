import redis from "../config/redis.js";

// Get data from Redis
export const getCache = async (key) => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

// Store data in Redis
export const setCache = async (key, value, ttl = 120) => {
  await redis.set(key, JSON.stringify(value), "EX", ttl);
};
