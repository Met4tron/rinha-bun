import { Hono } from 'hono'
import {addPerson, getCount, getPeople, getPerson, Person} from './db';
import {createPerson, findPeople, findPerson} from './schemas';
import * as crypto from 'crypto';
import {
  connectNats,
  getApelidoFromCache,
  getRequestCache,
  getTermFromCache,
  publishMessage, setApelidoFromCache,
  setRequestCache
} from './nats';

const app = new Hono()

await connectNats()

app.get('/pessoas/:id', findPerson, async (c) => {
  const { id } = c.req.valid('param');

  const personCache = getRequestCache(id)

  if (personCache) {
    console.log('Cached - Get Person - Map');
    return c.json(personCache, 200, {
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

  const cacheSearch = await getTermFromCache(t.toLowerCase());

  if (cacheSearch) {
    return c.json(cacheSearch, 200, {
      'cache-control': 'public, max-age=5, immutable'
    })
  }

  const people = await getPeople(t);

  publishMessage('person.search', {
    items: people,
    term: t.toLowerCase(),
  })

  return c.json(people, 200, {
    'cache-control': 'public, max-age=5, immutable'
  })
})

app.post('/pessoas', createPerson, async (c) => {
  const body = c.req.valid('json');

  const hasPerson = getApelidoFromCache(body.apelido);

  if (hasPerson) {
    console.log('Cached - Create Person - Set');
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

  setRequestCache(personId, newPerson);
  setApelidoFromCache(newPerson.apelido);

  publishMessage('person.create', newPerson)

  await addPerson(newPerson);

  return c.json({}, 201, {
    'Location': `/pessoas/${personId}`
  });
})

app.get('/contagem-pessoas', async (c) => {
  const count = await getCount();
  console.log(count);
  return c.json({ count }, 200);
})

export default {
  port: 80,
  fetch: app.fetch
}
