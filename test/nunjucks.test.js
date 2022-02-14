'use strict'

const path = require('path')

const t = require('tap')
const { test } = t

const Fastify = require('fastify')
const nunjucks = require('nunjucks')
const plugin = require('..')

require('./helper').nunjucksHtmlMinifierTests(t, true)
require('./helper').nunjucksHtmlMinifierTests(t, false)

test('reply.view with nunjucks engine and custom templates folder', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { nunjucks }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.njk', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), nunjucks.render('./templates/index.njk', data))
})

test('reply.view for nunjucks engine without data-parameter but defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { nunjucks },
    defaultContext: data
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.njk')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), nunjucks.render('./templates/index.njk', data))
})

test('reply.view for nunjucks engine without data-parameter and without defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { nunjucks }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.njk')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), nunjucks.render('./templates/index.njk'))
})

test('reply.view for nunjucks engine without data-parameter and defaultContext but with reply.locals', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }

  await fastify.register(plugin, {
    engine: { nunjucks }
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.njk')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), nunjucks.render('./templates/index.njk', localsData))
})

test('reply.view for nunjucks engine without defaultContext but with reply.locals and data-parameter', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { nunjucks }
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.njk', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), nunjucks.render('./templates/index.njk', data))
})

test('reply.view for nunjucks engine without data-parameter but with reply.locals and defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const contextData = { text: 'text from context' }

  await fastify.register(plugin, {
    engine: { nunjucks },
    defaultContext: contextData
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.njk')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), nunjucks.render('./templates/index.njk', localsData))
})

test('reply.view for nunjucks engine with data-parameter and reply.locals and defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const contextData = { text: 'text from context' }
  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { nunjucks },
    defaultContext: contextData
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.njk', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), nunjucks.render('./templates/index.njk', data))
})

test('reply.view with nunjucks engine and full path templates folder', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { nunjucks },
    templates: path.join(__dirname, '../templates')
  })

  fastify.get('/', (request, reply) => {
    reply.view('./index.njk', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  // Global Nunjucks templates dir changed here.
  t.equal(response.body.toString(), nunjucks.render('./index.njk', data))
})

test('reply.view with nunjucks engine and includeViewExtension is true', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { nunjucks },
    includeViewExtension: true
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  // Global Nunjucks templates dir is  `./` here.
  t.equal(response.body.toString(), nunjucks.render('./templates/index.njk', data))
})

test('reply.view with nunjucks engine using onConfigure callback', async (t) => {
  t.plan(5)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { nunjucks },
    options: {
      onConfigure: env => {
        env.addGlobal('myGlobalVar', 'my global var value')
      }
    }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index-with-global.njk', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  // Global Nunjucks templates dir is  `./` here.
  t.equal(response.body.toString(), nunjucks.render('./templates/index-with-global.njk', data))
  t.match(response.body.toString(), /.*<p>my global var value<\/p>/)
})

test('fastify.view with nunjucks engine', (t) => {
  t.plan(6)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  fastify.register(plugin, {
    engine: { nunjucks }
  })

  fastify.ready((err) => {
    t.error(err)

    fastify.view('templates/index.njk', data, (err, compiled) => {
      t.error(err)
      t.equal(nunjucks.render('./templates/index.njk', data), compiled)

      fastify.ready((err) => {
        t.error(err)

        fastify.view('templates/index.njk', data, (err, compiled) => {
          t.error(err)
          t.equal(nunjucks.render('./templates/index.njk', data), compiled)
        })
      })
    })
  })
})

test('fastify.view with nunjucks should throw page missing', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { nunjucks }
  })

  await fastify.ready()

  await fastify.view(null, {}, (err) => {
    t.ok(err instanceof Error)
    t.equal(err.message, 'Missing page')
  })
})

test('fastify.view with nunjucks engine should return 500 if render fails', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const nunjucks = {
    configure: () => ({
      render: (_, __, callback) => { callback(Error('Render Error')) }
    })
  }

  await fastify.register(plugin, {
    engine: { nunjucks }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.njk')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  const payload = JSON.parse(response.payload)
  t.equal(response.statusCode, 500)
  t.equal(payload.message, 'Render Error')
})
