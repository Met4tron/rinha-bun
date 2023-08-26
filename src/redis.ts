import Redis from 'ioredis';
import * as pool from 'generic-pool';

export const poolRedis = pool.createPool({
  async create(): Promise<Redis> {
    const redis = new Redis({ enableAutoPipelining: true, host: 'redis'  });

    redis.on('error', () => {
      throw new Error('redis closed connection')
    })

    redis.on('close', () => {
      throw new Error('redis closed connection')
    })

    return redis;
  },

  async destroy(client: Redis): Promise<void> {
    await client.quit();
  }
}, { max: 100, min: 5 })

export const getNicknameFromCache = async (nickname: string) => {
  const pool = await poolRedis.acquire();
  const hasNickname = await pool.exists(`person:nickname:${nickname}`);
  await poolRedis.release(pool);

  return hasNickname;
}

export const setNicknameCache = async(nickname: string) => {
  const pool = await poolRedis.acquire();
  await pool.set(`person:nickname:${nickname}`, 1);
  await poolRedis.release(pool);
}

export const setRequestCache = async(id: string, body: string) => {
  const pool = await poolRedis.acquire();
  await pool.set(`person:${id}`, body);
  await poolRedis.release(pool);
}

export const getRequestCache = async(id: string) => {
  const pool = await poolRedis.acquire();
  const reqCache = await pool.get(`person:${id}`);
  await poolRedis.release(pool);

  return reqCache;
}

export const setSearchRequestCache = async(term: string, data: any) => {
  const pool = await poolRedis.acquire();
  await pool.setex(`search:${term}`, 5, data);
  await poolRedis.release(pool);
}

export const getSearchRequestCache = async(term: string) => {
  const pool = await poolRedis.acquire();
  const reqCache = await pool.get(`search:${term}`);
  await poolRedis.release(pool);

  return reqCache;
}
