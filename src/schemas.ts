import {zValidator} from '@hono/zod-validator';
import {z} from 'zod';

export const createPerson = zValidator ('json', z.object({
  nome: z.string().max(100),
  apelido: z.string().max(32),
  stack: z.array(z.string().max(32)).min(1).optional().transform((val) => val?.join(' ') ?? ''),
  nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((val) => +new Date(val), {
    message: 'Data de nascimento inválida'
  })
}));

export const findPerson = zValidator ('param', z.object({
  id: z.string().uuid()
}))

export const findPeople = zValidator ('query', z.object({
  t: z.string().transform(val => val.toLowerCase())
}))