'use strict'

const t = require('tap')
const { test } = t

const twig = require('twig')

const Fastify = require('fastify')
const plugin = require('..')

require('./helper').twigHtmlMinifierTests(t, true)
require('./helper').twigHtmlMinifierTests(t, false)

test('reply.view with twig engine', async (t) => {
  t.plan(5)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { title: 'fastify', text: 'text' }

  await fastify.register(plugin, {
    engine: { twig }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.twig', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  twig.renderFile('./templates/index.twig', data, (err, html) => {
    t.error(err)
    t.equal(response.body.toString(), html)
  })
})

test('reply.view with twig engine and simple include', (t) => {
  t.plan(6)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { title: 'fastify', text: 'text' }

  fastify.register(plugin, {
    engine: { twig }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/template.twig', data)
  })

  fastify.ready((err) => {
    t.error(err)

    fastify.inject({
      method: 'GET',
      path: '/'
    }).then((response) => {
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], `${response.body.length}`)
      t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
      twig.renderFile('./templates/template.twig', data, (err, html) => {
        t.error(err)
        t.equal(response.body.toString(), html)
      })
    }).catch((err) => {
      t.error(err)
    })
  })
})

test('reply.view for twig without data-parameter but defaultContext', async (t) => {
  t.plan(5)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { title: 'fastify', text: 'text' }

  await fastify.register(plugin, {
    engine: { twig },
    defaultContext: data
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.twig')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  twig.renderFile('./templates/index.twig', data, (err, html) => {
    t.error(err)
    t.equal(response.body.toString(), html)
  })
})

test('reply.view for twig without data-parameter and without defaultContext', async (t) => {
  t.plan(5)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { twig }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.twig')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  twig.renderFile('./templates/index.twig', (err, html) => {
    t.error(err)
    t.equal(response.body.toString(), html)
  })
})

test('reply.view with twig engine and defaultContext', async (t) => {
  t.plan(5)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { title: 'fastify', text: 'text' }

  await fastify.register(plugin, {
    engine: { twig },
    defaultContext: data
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.twig', {})
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  twig.renderFile('./templates/index.twig', data, (err, html) => {
    t.error(err)
    t.equal(response.body.toString(), html)
  })
})

test('reply.view for twig engine without data-parameter and defaultContext but with reply.locals', async (t) => {
  t.plan(5)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }

  await fastify.register(plugin, {
    engine: { twig }
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.twig')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  twig.renderFile('./templates/index.twig', localsData, (err, html) => {
    t.error(err)
    t.equal(response.body.toString(), html)
  })
})

test('reply.view for twig engine without defaultContext but with reply.locals and data-parameter', async (t) => {
  t.plan(5)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { twig }
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.twig', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  twig.renderFile('./templates/index.twig', data, (err, html) => {
    t.error(err)
    t.equal(response.body.toString(), html)
  })
})

test('reply.view for twig engine without data-parameter but with reply.locals and defaultContext', async (t) => {
  t.plan(5)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const contextData = { text: 'text from context' }

  await fastify.register(plugin, {
    engine: { twig },
    defaultContext: contextData
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.twig')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  twig.renderFile('./templates/index.twig', localsData, (err, html) => {
    t.error(err)
    t.equal(response.body.toString(), html)
  })
})

test('reply.view for twig engine with data-parameter and reply.locals and defaultContext', async (t) => {
  t.plan(5)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const contextData = { text: 'text from context' }
  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { twig },
    defaultContext: contextData
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.twig', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  twig.renderFile('./templates/index.twig', data, (err, html) => {
    t.error(err)
    t.equal(response.body.toString(), html)
  })
})

test('reply.view with twig engine, will preserve content-type', async (t) => {
  t.plan(5)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { title: 'fastify', text: 'text' }

  await fastify.register(plugin, {
    engine: { twig }
  })

  fastify.get('/', (request, reply) => {
    reply.header('Content-Type', 'text/xml')
    reply.view('./templates/index.twig', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/xml')
  twig.renderFile('./templates/index.twig', data, (err, html) => {
    t.error(err)
    t.equal(response.body.toString(), html)
  })
})

test('fastify.view with twig engine, should throw page missing', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { twig }
  })

  await fastify.ready()

  await fastify.view(null, {}, (err) => {
    t.ok(err instanceof Error)
    t.equal(err.message, 'Missing page')
  })
})

test('reply.view with twig engine should return 500 if renderFile fails', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const twig = {
    renderFile: (_, __, callback) => { callback(Error('RenderFile Error')) }
  }

  await fastify.register(plugin, {
    engine: { twig }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.twig')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  const payload = JSON.parse(response.payload)
  t.equal(response.statusCode, 500)
  t.equal(payload.message, 'RenderFile Error')
})
