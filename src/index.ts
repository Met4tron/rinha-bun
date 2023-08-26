import { Hono } from 'hono'
import {addPeople, connectMongo, getCount, getPeople, getPerson, Person} from './db';
import {createPerson, findPeople, findPerson} from './schemas';
import {
  getNicknameFromCache,
  getRequestCache,
  getSearchRequestCache,
  setNicknameCache,
  setRequestCache,
  setSearchRequestCache
} from './redis';
import * as crypto from 'crypto';

const app = new Hono()

await connectMongo()

const personById = new Map();
const personByNickname = new Set();
const searchByTerm = new Map();

const queueInsert: Person[] = [];

async function processPeople () {
  if (!queueInsert.length) {
    return;
  }

  const insertPeople = new Map();

  while(true) {
    const person = queueInsert.shift();
    if (!person) { break }
    if (insertPeople.has(person.apelido)) { continue }
    insertPeople.set(person.apelido, person);
    if (queueInsert.length === 0) { break }
  }

  try {
    await addPeople(Array.from(insertPeople.values()));
    console.log(`insertPeople.size ${insertPeople.size}`)
  } catch (e) {
    console.log('Error to insert', insertPeople.size)
  }
}

setInterval(processPeople, 500)

app.get('/pessoas/:id', findPerson, async (c) => {
  const { id } = c.req.valid('param');

  if (personById.has(id)) {
    console.log('Cached - Get Person - Map');
    return c.json(personById.get(id), 200, {
      'cache-control': 'public, max-age=604800, immutable'
    })
  }

  const personCache = await getRequestCache(id);

  if (personCache) {
    console.log('Cached - Get Person - Redis');
    personById.set(id, JSON.parse(personCache));
    return c.json(JSON.parse(personCache), 200, {
      'cache-control': 'public, max-age=604800, immutable'
    })
  }

  const personDb = await getPerson(id);

  if (personDb) {
    console.log('Cached - Get Person - Database');
    return c.json({
      ...personDb,
      stack: personDb.stack.split(' ')
    }, 200, {
      'cache-control': 'public, max-age=604800, immutable'
    })
  }

  return c.json({}, 404);
})

app.get('/pessoas', findPeople, async (c) => {
  const { t } = c.req.valid('query')

  if (!t || !t.length) {
    return c.json({}, 400);
  }

  if (searchByTerm.has(t)) {
    return c.json(searchByTerm.get(t), 200, {
      'cache-control': 'public, max-age=5, immutable'
    })
  }

  const cacheSearch = await getSearchRequestCache(t);

  if (cacheSearch) {
    return c.json(JSON.parse(cacheSearch), 200, {
      'cache-control': 'public, max-age=5, immutable'
    })
  }

  const people = await getPeople(t);

  await setSearchRequestCache(t, JSON.stringify(people));

  searchByTerm.set(t, people);

  return c.json(people, 200, {
    'cache-control': 'public, max-age=5, immutable'
  })
})

function clearCacheSearch() {
  searchByTerm.clear();
}

setInterval(clearCacheSearch, 5000);

app.post('/pessoas', createPerson, async (c) => {
  const body = c.req.valid('json');

  if (personByNickname.has(body.apelido)) {
    console.log('Cached - Create Person - Set');
    return c.json({ message: 'Invalid user' }, 422);
  }

  const hasApelido = await getNicknameFromCache(body.apelido);

  if (hasApelido) {
    personByNickname.add(body.apelido);
    console.log('Cached - Create Person - Redis');
    return c.json({ message: 'Invalid user' }, 422);
  }

  const personId = crypto.randomUUID();

  const newPerson: Person = {
    id: personId,
    nome: body.nome,
    apelido: body.apelido,
    nascimento: body.nascimento,
    stack: body?.stack
  };

  queueInsert.push(newPerson);

  await Promise.all([
    await setNicknameCache(newPerson.apelido),
    await setRequestCache(newPerson.id, JSON.stringify(newPerson)),
  ]);

  personByNickname.add(newPerson.apelido);
  personById.set(newPerson.id, newPerson);

  return c.json({}, 201, {
    'Location': `/pessoas/${personId}`
  });
})

app.get('/contagem-pessoas', async (c) => {
  const count = await getCount();

  return c.json({ count }, 200);
})

export default {
  port: 80,
  fetch: app.fetch
}
