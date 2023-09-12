import { Pool } from 'pg'
import sql from 'sqlstring';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'rinhadb',
  min: 50,
  max: parseInt(process.env.POOL_SIZE || '50'),
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
});

export type Person = {
  id: string;
  nome: string;
  apelido: string;
  nascimento: string;
  stack: string;
}

export const addPerson = async(person: Person) => {
  let client;
  try {
    client = await pool.connect();
    await client.query(`INSERT INTO people (id, nome, apelido, nascimento, stack) VALUES ($1, $2, $3, $4, $5)`,
      [person.id, person.nome, person.apelido, person.nascimento, person.stack])
  } catch (e) {
    throw e;
  } finally {
    if (client)
      client.release();
  }
}

export const getPerson = async (id: string) =>  {
  let client;
  let result;
  try {
    client = await pool.connect();
    result = await client.query(`SELECT id, apelido, nome, nascimento::text, stack FROM people WHERE id = $1 LIMIT 1`, [id])
  } catch (e) {
    throw e;
  } finally {
    if (client)
      client.release();
  }

  return result?.rows?.[0] ?? null;
}

export const getPeople = async (searchParam: string) =>  {
  let client;
  let result;
  try {
    client = await pool.connect();
    const stmt = sql.format(`SELECT id, apelido, nome, nascimento::text, stack
                            FROM people
                            WHERE BUSCA_TRGM ILIKE '%'?'%'
                            LIMIT 50`, [searchParam.toLowerCase()] )
    result = await client.query(stmt)
  } catch (e) {
    throw e;
  } finally {
    if (client)
      client.release();
  }

  return result?.rows;
}

export const getCount = async () => {
  let client;
  let result;
  try {
    client = await pool.connect();
    result = await client.query(`SELECT count(1) from people`)
  } catch (e) {
    throw e;
  } finally {
    if (client)
      client.release();
  }

  return result?.rows[0].count;
}
