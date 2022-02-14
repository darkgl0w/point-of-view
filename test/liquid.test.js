'use strict'

const { resolve } = require('path')

const t = require('tap')
const { test } = t

const Fastify = require('fastify')
const { Liquid } = require('liquidjs')
const plugin = require('..')

require('./helper').liquidHtmlMinifierTests(t, true)
require('./helper').liquidHtmlMinifierTests(t, false)

test('reply.view with liquid engine', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  const engine = new Liquid()
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.liquid', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = await engine.renderFile('./templates/index.liquid', data)
  t.equal(response.body.toString(), html)
})

test('reply.view with liquid engine without data-parameter but defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  const engine = new Liquid()
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    },
    defaultContext: data
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.liquid')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = await engine.renderFile('./templates/index.liquid', data)
  t.equal(response.body.toString(), html)
})

test('reply.view with liquid engine without data-parameter but without defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const engine = new Liquid()
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.liquid')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = await engine.renderFile('./templates/index.liquid')
  t.equal(response.body.toString(), html)
})

test('reply.view with liquid engine with data-parameter and defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  const engine = new Liquid()
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    },
    defaultContext: data
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.liquid', {})
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = await engine.renderFile('./templates/index.liquid', data)
  t.equal(response.body.toString(), html)
})

test('reply.view for liquid engine without data-parameter and defaultContext but with reply.locals', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }

  const engine = new Liquid()
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    }
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.liquid', {})
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = await engine.renderFile('./templates/index.liquid', localsData)
  t.equal(response.body.toString(), html)
})

test('reply.view for liquid engine without defaultContext but with reply.locals and data-parameter', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const data = { text: 'text' }

  const engine = new Liquid()
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    }
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.liquid', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = await engine.renderFile('./templates/index.liquid', data)
  t.equal(response.body.toString(), html)
})

test('reply.view for liquid engine without data-parameter but with reply.locals and defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const defaultContext = { text: 'text' }

  const engine = new Liquid()
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    },
    defaultContext
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.liquid')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = await engine.renderFile('./templates/index.liquid', localsData)
  t.equal(response.body.toString(), html)
})

test('reply.view for liquid engine with data-parameter and reply.locals and defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const defaultContext = { text: 'text from context' }
  const data = { text: 'text' }

  const engine = new Liquid()
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    },
    defaultContext
  })

  fastify.addHook('preHandler', function (request, reply, done) {
    reply.locals = localsData
    done()
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.liquid', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = await engine.renderFile('./templates/index.liquid', data)
  t.equal(response.body.toString(), html)
})

test('reply.view with liquid engine and custom tag', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  const engine = new Liquid()

  engine.registerTag('header', {
    parse: function (token) {
      const [key, val] = token.args.split(':')
      this[key] = val
    },
    render: async function (scope, emitter) {
      const title = await this.liquid.evalValue(this.content, scope)
      emitter.write(`<h1>${title}</h1>`)
    }
  })
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index-with-custom-tag.liquid', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = await engine.renderFile('./templates/index-with-custom-tag.liquid', data)
  t.equal(response.body.toString(), html)
})

test('reply.view with liquid engine and double quoted variable', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'foo' }

  const engine = new Liquid()
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/double-quotes-variable.liquid', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = await engine.renderFile('./templates/double-quotes-variable.liquid', data)
  t.equal(response.body.toString(), html)
})

test('fastify.view with liquid engine, should throw page missing', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const engine = new Liquid()
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    }
  })

  await fastify.ready()

  await fastify.view(null, {}, (err) => {
    t.ok(err instanceof Error)
    t.equal(err.message, 'Missing page')
  })
})

test('fastify.view with liquid engine template that does not exist errors correctly', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const engine = new Liquid()
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    }
  })

  await fastify.ready()

  await fastify.view('./I-Dont-Exist', {}, (err) => {
    t.ok(err instanceof Error)
    t.match(err.message, 'ENOENT')
  })
})

test('reply.view with liquid engine, should allow just filename for multiple root directories', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  const engine = new Liquid({
    root: ['./templates/liquid-two', './templates/liquid-one']
  })
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    }
  })

  fastify.get('/hello', (request, reply) => {
    reply.view('hello.liquid', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/hello'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = await engine.renderFile(resolve('./templates/liquid-one/hello.liquid'), data)
  t.equal(response.body.toString(), html)
})

test('reply.view with liquid engine, should fallback to the default template dir when engine `root` option is `undefined`', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  const engine = new Liquid({ root: undefined })
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    }
  })

  fastify.get('/hello', (request, reply) => {
    reply.view('templates/liquid-one/hello.liquid', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/hello'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = await engine.renderFile(resolve('templates/liquid-one/hello.liquid'), data)
  t.equal(response.body.toString(), html)
})

test('reply.view with liquid engine, should allow absolute path for multiple root directories', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  const engine = new Liquid({
    root: ['./templates/liquid-two', './templates/liquid-one']
  })
  await fastify.register(plugin, {
    engine: {
      liquid: engine
    }
  })

  fastify.get('/hello', (request, reply) => {
    reply.view('./templates/liquid-one/hello.liquid', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/hello'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = await engine.renderFile(resolve('./templates/liquid-one/hello.liquid'), data)
  t.equal(response.body.toString(), html)
})
