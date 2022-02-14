'use strict'

const { readFileSync } = require('fs')
const { join } = require('path')

const t = require('tap')
const { test } = t

const Fastify = require('fastify')
const proxyquire = require('proxyquire')
const pug = require('pug')
const plugin = require('..')

require('./helper').pugHtmlMinifierTests(t, true)
require('./helper').pugHtmlMinifierTests(t, false)

test('reply.view with pug engine', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { pug }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.pug', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), pug.render(readFileSync('./templates/index.pug', 'utf8'), data))
})

test('reply.view with pug engine in production mode should use cache', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const POV = proxyquire('..', {
    hashlru: function () {
      return {
        get: () => {
          return () => '<div>Cached Response</div>'
        },
        set: () => {}
      }
    }
  })

  await fastify.register(POV, {
    engine: { pug },
    production: true
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.pug')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), '<div>Cached Response</div>')
})

test('reply.view with pug engine and includes', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { pug }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/sample.pug', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), pug.renderFile('./templates/sample.pug', data))
})

test('reply.view for pug without data-parameter but defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { pug },
    defaultContext: data
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.pug')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), pug.render(readFileSync('./templates/index.pug', 'utf8'), data))
})

test('reply.view for pug without data-parameter and without defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { pug }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.pug')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), pug.render(readFileSync('./templates/index.pug', 'utf8')))
})

test('reply.view with pug engine and defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { pug },
    defaultContext: data
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.pug', {})
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), pug.render(readFileSync('./templates/index.pug', 'utf8'), data))
})

test('reply.view for pug engine without data-parameter and defaultContext but with reply.locals', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }

  await fastify.register(plugin, {
    engine: { pug }
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.pug')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), pug.render(readFileSync('./templates/index.pug', 'utf8'), localsData))
})

test('reply.view for pug engine without defaultContext but with reply.locals and data-parameter', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { pug }
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.pug', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), pug.render(readFileSync('./templates/index.pug', 'utf8'), data))
})

test('reply.view for pug engine without data-parameter but with reply.locals and defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const contextData = { text: 'text from context' }

  await fastify.register(plugin, {
    engine: { pug },
    defaultContext: contextData
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.pug')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), pug.render(readFileSync('./templates/index.pug', 'utf8'), localsData))
})

test('reply.view for pug engine with data-parameter and reply.locals and defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const contextData = { text: 'text from context' }
  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { pug },
    defaultContext: contextData
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.pug', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString(), pug.render(readFileSync('./templates/index.pug', 'utf8'), data))
})

test('reply.view with pug engine, will preserve content-type', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { pug }
  })

  fastify.get('/', (request, reply) => {
    reply.header('Content-Type', 'text/xml')
    reply.view('./templates/index.pug', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/xml')
  t.equal(response.body.toString(), pug.render(readFileSync('./templates/index.pug', 'utf8'), data))
})

test('fastify.view with pug engine, should throw page missing', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { pug }
  })

  await fastify.ready()

  await fastify.view(null, {}, (err) => {
    t.ok(err instanceof Error)
    t.equal(err.message, 'Missing page')
  })
})

test('reply.view with pug engine, should throw error if non existent template path', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { pug },
    templates: 'non-existent'
  })

  fastify.get('/', (request, reply) => {
    reply.view('./test/index.html')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 500)
  t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
  t.equal(response.headers['content-length'], `${response.body.length}`)

  const payload = JSON.parse(response.payload)
  t.equal(payload.message, `ENOENT: no such file or directory, open '${join(__dirname, '../non-existent/test/index.html')}'`)
})

test('reply.view with pug engine should return 500 if compile fails', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const pug = {
    compile: () => { throw Error('Compile Error') }
  }

  await fastify.register(plugin, {
    engine: { pug }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.pug')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  const payload = JSON.parse(response.payload)
  t.equal(response.statusCode, 500)
  t.equal(payload.message, 'Compile Error')
})
