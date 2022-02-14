'use strict'

const { join } = require('path')

const { test } = require('tap')

const art = require('art-template')
const Fastify = require('fastify')
const plugin = require('..')

test('art-template engine - using `fastify.view` decorator :', async (t) => {
  t.test('with full path `templates` folder', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { 'art-template': art },
      templates: join(__dirname, '..', 'templates')
    })

    fastify.get('/', (request, reply) => {
      fastify.view('./index', data, (err, html) => {
        t.error(err)

        reply.send(html)
      })
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    const templatePath = join(__dirname, '..', 'templates', 'index.art')

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-type'], 'text/plain; charset=utf-8')
    t.equal(art(templatePath, data), response.body.toString())
  })

  t.test('with a missing page, it should throw an error', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: { 'art-template': art }
    })

    await fastify.ready()

    fastify.view(null, {}, (err) => {
      t.ok(err instanceof Error)
      t.equal(err.message, 'Missing page')
    })
  })
})

test('art-template engine - using `reply.view` decorator :', async (t) => {
  t.test('with custom `templates` folder', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { 'art-template': art },
      templates: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('./index.art', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    const templatePath = join(__dirname, '..', 'templates', 'index.art')

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(art(templatePath, data), response.body.toString())
  })

  t.test('with `defaultContext`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { 'art-template': art },
      defaultContext: data,
      templates: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('./index.art', {})
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    const templatePath = join(__dirname, '..', 'templates', 'index.art')

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(art(templatePath, data), response.body.toString())
  })

  t.test('with `defaultContext` but without `data` parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { 'art-template': art },
      defaultContext: data,
      templates: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('./index.art')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    const templatePath = join(__dirname, '..', 'templates', 'index.art')

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(art(templatePath, data), response.body.toString())
  })

  t.test('without `defaultContext` and `data` parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: { 'art-template': art },
      templates: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('./index.art')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    const templatePath = join(__dirname, '..', 'templates', 'index.art')

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(art(templatePath, {}), response.body.toString())
  })

  t.test('without `data` parameter and `defaultContext` but with `reply.locals`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }

    await fastify.register(plugin, {
      engine: { 'art-template': art }
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index.art')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    const templatePath = join(__dirname, '..', 'templates', 'index.art')

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(art(templatePath, localsData), response.body.toString())
  })

  t.test('without `defaultContext` but with `reply.locals` and `data` parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }
    const localsData = { text: 'text from locals' }

    await fastify.register(plugin, {
      engine: { 'art-template': art }
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index.art', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    const templatePath = join(__dirname, '..', 'templates', 'index.art')

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    t.equal(art(templatePath, data), response.body.toString())
  })

  t.test('with `defaultContext` and `reply.locals` but without `data` parameter ', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const contextData = { text: 'text from context' }
    const localsData = { text: 'text from locals' }

    await fastify.register(plugin, {
      engine: { 'art-template': art },
      defaultContext: contextData
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index.art')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    const templatePath = join(__dirname, '..', 'templates', 'index.art')

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(art(templatePath, localsData), response.body.toString())
  })

  t.test('with `defaultContext`, `data` parameter and `reply.locals`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    const contextData = { text: 'text from context' }
    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { 'art-template': art },
      defaultContext: contextData
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index.art', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    const templatePath = join(__dirname, '..', 'templates', 'index.art')

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(art(templatePath, data), response.body.toString())
  })

  t.test('with full path `templates` folder', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { 'art-template': art },
      templates: join(__dirname, '..', 'templates')
    })

    fastify.get('/', (request, reply) => {
      reply.view('./index.art', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    const templatePath = join(__dirname, '..', 'templates', 'index.art')

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(art(templatePath, data), response.body.toString())
  })

  t.test('with `includeViewExtension` set to `true`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { 'art-template': art },
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

    const templatePath = join(__dirname, '..', 'templates', 'index.art')

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(art(templatePath, data), response.body.toString())
  })

  t.test('it should return a 500 error if render fails', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const art = {
      compile: () => { throw Error('Compile Error') }
    }

    await fastify.register(plugin, {
      engine: { 'art-template': art }
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    const payload = JSON.parse(response.payload)
    t.equal(response.statusCode, 500)
    t.equal('Compile Error', payload.message)
  })
})
