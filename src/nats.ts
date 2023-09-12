import { connect, NatsConnection, JSONCodec } from 'nats';
import {Person} from './db';

export const cache = {
  byNickname: new Set(),
  byPersonId: new Map(),
  bySearchTerm: new Map(),
}

let server: NatsConnection;

export const connectNats = async () => {
  server = await connect({
    servers: process.env.NATS_HOST || 'localhost'
  });

  console.log(`Connected to ${server.getServer()}`);
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
