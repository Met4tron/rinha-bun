## Stack

- Bun
- Hono (https://hono.dev/)
- MongoDB
- Nginx
- Redis

## Cache

- In memory + Redis
- TTL (5s) para os casos de busca p/ query

## Batch Insert

- A cada 500ms
- InsertMany + Unique constraint (apelido)

## Docker

```sh
docker buildx create --name rinha-bun --platform linux/amd64,linux/arm64,linux/arm64/v8
docker buildx build -t met4tron/rinha-nodejs:latest --builder rinha-nodejs --push --platform linux/arm64/v8,linux/amd64,linux/arm64 .
```