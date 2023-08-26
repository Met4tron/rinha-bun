FROM oven/bun

WORKDIR /usr/app

COPY ./package.json ./bun.lockb ./

RUN bun install

COPY . .

RUN bun build ./src/index.ts --compile --outfile server

CMD ["./server"]