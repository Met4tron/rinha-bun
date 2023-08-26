import {Db, MongoClient} from 'mongodb';

const client = new MongoClient('mongodb://database', {
  auth: {
    username: 'rinha',
    password: 'rinha'
  },
  authSource: 'admin',
  authMechanism: 'DEFAULT',
  minPoolSize: 20,
  maxPoolSize: 300,
});

let db: Db;

export type Person = {
  id: string;
  apelido: string;
  nome: string;
  nascimento: string;
  stack?: string | undefined;
}

export const connectMongo = async () => {
  await client.connect();

  db = client.db('rinha')

  await db.collection('people').createIndex({
    apelido: 'text',
    nome: 'text',
    stack: 'text'
  }, {
    name: 'search_params_idx'
  })

  await db.collection('people').createIndex({ apelido: 1 }, {
    name: 'apelido_idx',
    unique: true,
  });
}

export const addPeople = async (people: Person[]) => db.collection('people').insertMany(people)

export const getPerson = async (id: string) =>  db.collection('people').findOne({ id })

export const getPeople = async (searchParam: string) =>  db.collection('people').find({ $text: { $diacriticSensitive: false, $caseSensitive: false, $search: searchParam }})

export const checkNickname = async (nickname: string) => db.collection('people').findOne({ apelido: nickname })

export const getCount = async () => db.collection('people').countDocuments();
