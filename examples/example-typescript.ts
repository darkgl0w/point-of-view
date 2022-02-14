import fastify from 'fastify';
import handlebarsEngine from 'handlebars';
import { resolve } from 'path';
// import pointOfView from 'point-of-view';
import pointOfView from '..';

interface Locals {
  appVersion: string;
}

declare module 'fastify' {
  interface FastifyReply {
    locals: Partial<Locals> | undefined;
  }
}

const app = fastify({ logger: true });

app.register(pointOfView, {
  engine: {
    handlebars: handlebarsEngine,
  },
  templates: 'templates',
  includeViewExtension: true,
  defaultContext: {
    dev: true,
  },
  options: {},
  layout: 'layout',
  charset: 'utf-8',
  maxCache: 100,
  production: false,
  root: resolve(__dirname, '../templates'),
  viewExt: 'ejs'
});

app.get('/', (request, reply) => {
  reply.view('/index-with-no-data');
});

app.get('/data', (request, reply) => {
  if (!reply.locals) {
    reply.locals = {};
  }

  reply.locals.appVersion = '4.14.0';
  reply.view('/index', { text: 'Sample data' });
});

app.get('/dataTyped', (request, reply) => {
  if (!reply.locals) {
    reply.locals = {};
  }

  reply.locals.appVersion = '4.14.0';
  reply.view<{ text: string }>('/index', { text: 'Sample data' });
});

app.listen(3000, (err) => {
  if (err) throw err;
});
