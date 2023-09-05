import { Pool } from 'pg'
import sql from 'sqlstring';

const pool = new Pool({
  host: 'database',
  user: 'root',
  password: '1234',
  database: 'rinhadb',
  min: 50,
  max: 250,
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
  const client = await pool.connect();

  await client.query(`INSERT INTO people (id, nome, apelido, nascimento, stack) VALUES ($1, $2, $3, $4, $5)`, [person.id, person.nome, person.apelido, person.nascimento, person.stack])

  client.release();
}

export const getPerson = async (id: string) =>  {
  const client = await pool.connect();

  const result = await client.query(`SELECT * from people WHERE id = $1 LIMIT 1`, [id])

  client.release();

  return result?.rows?.[0] ?? null;
}

export const getPeople = async (searchParam: string) =>  {
  const client = await pool.connect();

  const stmt = sql.format(`SELECT id, apelido, nome, nascimento, stack
                           FROM people
                           WHERE BUSCA_TRGM ILIKE '%'?'%'
                           LIMIT 50`, [searchParam.toLowerCase()] )

  const result = await client.query(stmt)

  client.release();

  return result.rows;
}

export const getCount = async () => {
  const client = await pool.connect();

  const result = await client.query(`SELECT count(1) from people`)

  client.release();

  return result.rows[0].count;
}
