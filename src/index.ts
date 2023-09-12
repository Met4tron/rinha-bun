import { Hono } from 'hono'
import {addPerson, getCount, getPeople, getPerson, Person} from './db';
import {createPerson, findPeople, findPerson} from './schemas';
import * as crypto from 'crypto';
import {
  connectNats,
  getApelidoFromCache,
  getRequestCache,
  setApelidoFromCache,
  setRequestCache
} from './nats';

const app = new Hono();
connectNats();

app.get('/pessoas/:id', findPerson, async (c) => {
  const { id } = c.req.valid('param');

  let person = getRequestCache(id)

  if (!person) {
    person = await getPerson(id)
    if (person) {
      person = { ...person, stack: person.stack.split(' ') }
    }
  }

  if (person) {
    return c.json(person, 200, {
      'cache-control': 'public, max-age=604800, immutable'
    })
  } else {
    return c.json({}, 404);
  }
})

app.get('/pessoas', findPeople, async (c) => {
  const { t } = c.req.valid('query')

  if (!t || !t.length) {
    return c.json({}, 400);
  }

  const people = await getPeople(t);
  if (people) {
    return c.json(people, 200, {
      'cache-control': 'public, max-age=604800, immutable'
    })
  } else {
    return c.json({}, 404);
  }
})

app.post('/pessoas', createPerson, async (c) => {
  const body = c.req.valid('json');

  if (getApelidoFromCache(body.apelido)) {
    // console.log('Cached - Create Person - Set');
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

  try {
    await addPerson(newPerson);

    return c.json({}, 201, {
      'Location': `/pessoas/${personId}`
    });
  } catch (e) {
    return c.json({}, 400);
  }
})

app.get('/contagem-pessoas', async (c) => {
  const count = await getCount();
  return c.json({ count }, 200);
})

export default {
  port: parseInt(process.env.HTTP_PORT || '8080'),
  fetch: app.fetch
}
