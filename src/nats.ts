import { connect, NatsConnection, JSONCodec, Subscription } from 'nats';
import {Person} from './db';

export const cache = {
  byNickname: new Set(),
  byPersonId: new Map(),
  bySearchTerm: new Map(),
}

setInterval(() => cache.bySearchTerm.clear(), 5000)

const jsonCodec = JSONCodec();

let server: NatsConnection;

export const connectNats = async () => {
  server = await connect({
    servers: 'nats'
  });

  console.log(`Connected to ${server.getServer()}`);

  const subscriptions = [
    server.subscribe('person.create'),
    server.subscribe('person.search')
  ]

  for (const sub of subscriptions) {
    subscribe(sub)
  }
}

async function subscribe (s: Subscription) {
  let subj = s.getSubject();
  const c = (13 - subj.length);
  const pad = "".padEnd(c);

  for await (const m of s) {
    const data = jsonCodec.decode(m.data) as any;

    if (subj == 'person.create') {
      setRequestCache(data.id, data)
      setApelidoFromCache(data.apelido);
    }

    if (subj == 'person.search') {
      cache.bySearchTerm.set(data.term, data.data);
    }
  }
}

export const publishMessage = (subject: string, payload: any)=> {
  server.publish(subject, jsonCodec.encode(payload));
}

export const getApelidoFromCache = (apelido: string) => {
  return cache.byNickname.has(apelido);
}

export const setApelidoFromCache = (apelido: string) => {
  return cache.byNickname.add(apelido);
}

export const getRequestCache = (id: string) => {
  return cache.byPersonId.get(id)
}

export const setRequestCache = (id: string, value: Person) => {
  return cache.byPersonId.set(id, value)
}

export const getTermFromCache = (term: string) => {
  return cache.bySearchTerm.get(term);
}


