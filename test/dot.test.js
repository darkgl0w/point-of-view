'use strict'

const { existsSync, rmdirSync } = require('fs')
const stream = require('stream')

const t = require('tap')
const { test } = t

const dot = require('dot')
const Fastify = require('fastify')
const plugin = require('..')

const compileOptions = {
  path: 'templates',
  destination: 'out',
  log: false
}

require('./helper').dotHtmlMinifierTests(t, compileOptions, true)
require('./helper').dotHtmlMinifierTests(t, compileOptions, false)

test('doT.js engine - using `fastify.view` decorator :', async (t) => {
  t.test('with a missing page, it should throw an error', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))
    dot.log = false

    await fastify.register(plugin, {
      engine: { dot }
    })

    await fastify.ready()

    fastify.view(null, {}, (err) => {
      t.ok(err instanceof Error)
      t.equal(err.message, 'Missing page')
    })
  })
})

test('doT.js engine - using `reply.view` decorator :', async (t) => {
  t.test('with `.dot` file', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }
    dot.log = false

    await fastify.register(plugin, {
      engine: { dot },
      root: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('testdot', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    const html = dot.process({ path: 'templates', destination: 'out' }).testdot(data)
    t.equal(response.body.toString(), html)
  })

  t.test('with `.dot` file, it should create "non-existent" destination', async (t) => {
    t.plan(1)

    dot.log = false

    const fastify = Fastify()
    t.teardown(() => {
      rmdirSync('non-existent')
      fastify.close()
    })

    await fastify.register(plugin, {
      engine: { dot },
      options: {
        destination: 'non-existent'
      }
    })

    fastify.get('/', (request, reply) => {
      reply.view('testdot')
    })

    await fastify.ready()

    t.ok(existsSync('non-existent'))
  })

  t.test('with `.jst` file', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }
    dot.log = false

    await fastify.register(plugin, {
      engine: { dot },
      root: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('testjst', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    dot.process(compileOptions)
    const html = require('../out/testjst')(data)
    t.equal(response.body.toString(), html)
  })

  t.test('with `layout` option', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { dot },
      root: 'templates',
      layout: 'layout'
    })

    fastify.get('/', (request, reply) => {
      reply.view('testdot', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.body.toString(), 'header: textfoo text1 <p>foo</p>footer')
  })

  t.test('with `layout` option on render', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { dot },
      root: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('testdot', data, { layout: 'layout' })
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.body.toString(), 'header: textfoo text1 <p>foo</p>footer')
  })

  t.test('with `defaultContext` but without `data` parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }
    dot.log = false

    await fastify.register(plugin, {
      engine: { dot },
      defaultContext: data,
      root: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('testdot')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    const html = dot.process(compileOptions).testdot(data)
    t.equal(response.body.toString(), html)
  })

  t.test('without `defaultContext` and `data` parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    dot.log = false

    await fastify.register(plugin, {
      engine: { dot },
      root: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('testdot')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    const html = dot.process(compileOptions).testdot()
    t.equal(response.body.toString(), html)
  })

  t.test('with `defaultContext` and `data` parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }
    dot.log = false

    await fastify.register(plugin, {
      engine: { dot },
      defaultContext: data,
      root: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('testdot', {})
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    const html = dot.process(compileOptions).testdot(data)
    t.equal(response.body.toString(), html)
  })

  t.test('without `data` parameter and `defaultContext` but with `reply.locals`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    dot.log = false

    await fastify.register(plugin, {
      engine: { dot },
      root: 'templates'
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('testdot', {})
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    const html = dot.process(compileOptions).testdot(localsData)
    t.equal(response.body.toString(), html)
  })

  t.test('without `defaultContext` but with `reply.locals` and `data` parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    const data = { text: 'text' }
    dot.log = false

    await fastify.register(plugin, {
      engine: { dot },
      root: 'templates'
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('testdot', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    const html = dot.process(compileOptions).testdot(data)
    t.equal(response.body.toString(), html)
  })

  t.test('with `defaultContext` and `reply.locals` but without `data` parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    const defaultContext = { text: 'text' }
    dot.log = false

    await fastify.register(plugin, {
      engine: { dot },
      defaultContext,
      root: 'templates'
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('testdot')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    const html = dot.process(compileOptions).testdot(localsData)
    t.equal(response.body.toString(), html)
  })

  t.test('with `defaultContext`, `data` parameter and `reply.locals`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    const defaultContext = { text: 'text from context' }
    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { dot },
      defaultContext,
      root: 'templates'
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('testdot', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    const html = dot.process(compileOptions).testdot(data)
    t.equal(response.body.toString(), html)
  })

  t.test('with a not found `template`, it should log a warning', async (t) => {
    t.plan(2)

    dot.log = false

    const logs = []
    const destination = new stream.Writable({
      write: function (chunk, encoding, next) {
        logs.push(JSON.parse(chunk))
        next()
      }
    })

    const fastify = Fastify({ logger: { level: 'warn', stream: destination } })

    t.teardown(() => {
      rmdirSync('empty')
      fastify.close()
    })

    await fastify.register(plugin, {
      engine: { dot },
      options: {
        destination: 'empty'
      }
    })

    await fastify.ready()

    // Warn level is equal to 40 so we search for an entry with a level of 40
    const warning = logs.find((entry) => entry.level && entry.level === 40)

    t.equal(warning.level, 40)
    t.equal(/^WARN: no template found/s.test(warning.msg), true)
  })

  t.test('with missing `layout` on render, it should return a 500 error', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }
    const unknownLayout = 'non-existing-layout'

    await fastify.register(plugin, {
      engine: { dot },
      root: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('testdot', data, { layout: unknownLayout })
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    const payload = JSON.parse(response.payload)
    t.equal(response.statusCode, 500)
    t.equal(payload.message, `unable to access template "${unknownLayout}"`)
  })
})
