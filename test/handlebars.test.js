'use strict'

const { readFileSync } = require('fs')
const { join } = require('path')

const t = require('tap')
const { test } = t

const Fastify = require('fastify')
const handlebars = require('handlebars')
const proxyquire = require('proxyquire')
const plugin = require('..')

require('./helper').handleBarsHtmlMinifierTests(t, true)
require('./helper').handleBarsHtmlMinifierTests(t, false)

test('Handlebars.js engine - using `fastify.view` decorator :', async (t) => {
  t.test('with the default options', async (t) => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { handlebars }
    })

    await fastify.ready()

    await fastify.view('./templates/index.html', data).then(compiled => {
      t.equal(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(data), compiled)
    })
  })

  t.test('without `data` parameter but with `defaultContext`', async (t) => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { handlebars },
      defaultContext: data
    })

    await fastify.ready()

    await fastify.view('./templates/index.html').then(compiled => {
      t.equal(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(data), compiled)
    })
  })

  t.test('without `data` parameter and without `defaultContext`', async (t) => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: { handlebars }
    })

    await fastify.ready()

    await fastify.view('./templates/index.html').then(compiled => {
      t.equal(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(), compiled)
    })
  })

  t.test('with `defaultContext`', async (t) => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { handlebars },
      defaultContext: data
    })

    await fastify.ready()

    await fastify.view('./templates/index.html', {}).then(compiled => {
      t.equal(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(data), compiled)
    })
  })

  t.test('with `layout` option on render', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'it works!' }

    await fastify.register(plugin, {
      engine: { handlebars }
    })

    await fastify.ready()

    await fastify.view('./templates/index-for-layout.hbs', data, { layout: './templates/layout.hbs' }, (err, compiled) => {
      t.error(err)
      t.equal(handlebars.compile(readFileSync('./templates/index.hbs', 'utf8'))(data), compiled)
    })
  })

  t.test('with an invalid `layout` option on render, it should throw', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'it works!' }

    await fastify.register(plugin, {
      engine: { handlebars }
    })

    await fastify.ready()

    await fastify.view('./templates/index-for-layout.hbs', data, { layout: './templates/invalid-layout.hbs' }, (err, compiled) => {
      t.ok(err instanceof Error)
      t.equal(err.message, 'unable to access template "./templates/invalid-layout.hbs"')
    })
  })

  t.test('with callback syntax', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { handlebars }
    })

    await fastify.ready()

    await fastify.view('./templates/index.html', data, (err, compiled) => {
      t.error(err)
      t.equal(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(data), compiled)
    })
  })

  t.test('with callback syntax in `production` mode', (t) => {
    t.plan(6)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    fastify.register(plugin, {
      engine: { handlebars },
      production: true
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.view('./templates/index.html', data, (err, compiled) => {
        t.error(err)
        t.equal(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(data), compiled)

        fastify.ready((err) => {
          t.error(err)

          fastify.view('./templates/index.html', data, (err, compiled) => {
            t.error(err)
            t.equal(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(data), compiled)
          })
        })
      })
    })
  })

  t.test('with `layout` option', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'it works!' }

    await fastify.register(plugin, {
      engine: { handlebars },
      layout: './templates/layout.hbs'
    })

    await fastify.ready()

    await fastify.view('./templates/index-for-layout.hbs', data, (err, compiled) => {
      t.error(err)
      t.equal(handlebars.compile(readFileSync('./templates/index.hbs', 'utf8'))(data), compiled)
    })
  })

  t.test('with missing `partials` path in `production` mode, it should not start', (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    fastify.register(plugin, {
      engine: { handlebars },
      options: {
        partials: { body: './non-existent' }
      },
      production: true
    })

    fastify.ready((err) => {
      t.ok(err instanceof Error)
      t.equal(err.message, `ENOENT: no such file or directory, open '${join(__dirname, '../non-existent')}'`)
    })
  })

  t.test('with missing template files, it should throw an error', (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    fastify.register(plugin, {
      engine: { handlebars }
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.view('./missing.html', {}, (err) => {
        t.ok(err instanceof Error)
        t.equal(err.message, `ENOENT: no such file or directory, open '${join(__dirname, '../missing.html')}'`)
      })
    })
  })

  t.test('with a missing page, it should throw an error', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: { handlebars }
    })

    await fastify.ready()

    fastify.view(null, {}, (err) => {
      t.ok(err instanceof Error)
      t.equal(err.message, 'Missing page')
    })
  })
})

test('Handlebars.js engine - using `reply.view` decorator :', async (t) => {
  t.test('with the default options', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { handlebars }
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index.html', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(data), response.body.toString())
  })

  t.test('with `layout` option', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: { handlebars },
      layout: './templates/layout.hbs'
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index-for-layout.hbs')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(handlebars.compile(readFileSync('./templates/index.hbs', 'utf8'))({}), response.body.toString())
  })

  t.test('with `layout` option on render', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: { handlebars }
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index-for-layout.hbs', {}, { layout: './templates/layout.hbs' })
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(handlebars.compile(readFileSync('./templates/index.hbs', 'utf8'))({}), response.body.toString())
  })

  t.test('with `defaultContext`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { handlebars },
      defaultContext: data
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index.html', {})
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(data), response.body.toString())
  })

  t.test('with `includeViewExtension` property set as `true`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { handlebars },
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
    t.equal(handlebars.compile(readFileSync('./templates/index.hbs', 'utf8'))(data), response.body.toString())
  })

  t.test('without `data` parameter and `defaultContext` but with `reply.locals`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }

    await fastify.register(plugin, {
      engine: { handlebars }
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index.html')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(localsData), response.body.toString())
  })

  t.test('without `defaultContext` but with `reply.locals` and `data` parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { handlebars }
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index.html', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(data), response.body.toString())
  })

  t.test('without `data` parameter but with `reply.locals` and `defaultContext`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    const contextData = { text: 'text from context' }

    await fastify.register(plugin, {
      engine: { handlebars },
      defaultContext: contextData
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index.html')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(localsData), response.body.toString())
  })

  t.test('with `data` parameter and `reply.locals` and `defaultContext`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    const contextData = { text: 'text from context' }
    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { handlebars },
      defaultContext: contextData
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index.html', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(data), response.body.toString())
  })

  t.test('with `partials`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { handlebars },
      options: {
        partials: { body: './templates/body.hbs' }
      }
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index-with-partials.hbs', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(handlebars.compile(readFileSync('./templates/index-with-partials.hbs', 'utf8'))(data), response.body.toString())
  })

  t.test('with `partials` in `production` mode, it should use cache', async (t) => {
    t.plan(3)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const POV = proxyquire('..', {
      hashlru: function () {
        return {
          get: (key) => {
            t.equal(key, 'handlebars-Partials')
          },
          set: (key, value) => {
            t.equal(key, 'handlebars-Partials')
            t.strictSame(value, { body: readFileSync('./templates/body.hbs', 'utf8') })
          }
        }
      }
    })

    await fastify.register(POV, {
      engine: { handlebars },
      options: {
        partials: { body: './templates/body.hbs' }
      },
      production: true
    })

    await fastify.ready()
  })

  t.test('with missing `partials` path, it should throw an error', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { handlebars },
      options: {
        partials: { body: './non-existent' }
      }
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index-with-partials.hbs', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 500)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'application/json; charset=utf-8')

    const payload = JSON.parse(response.payload)
    t.equal(payload.message, `ENOENT: no such file or directory, open '${join(__dirname, '../non-existent')}'`)
  })

  t.test('with missing `layout` on render, it should return a 500 error', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: { handlebars }
    })

    const unknownLayout = './templates/missing-layout.hbs'

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index-for-layout.hbs', {}, { layout: unknownLayout })
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

  t.test('it should catch render errors', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    handlebars.registerHelper('badHelper', () => { throw new Error('kaboom') })

    await fastify.register(plugin, {
      engine: { handlebars }
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/error.hbs')
    })

    const response = await fastify.inject({
      method: 'GET',
      url: '/'
    })

    const payload = JSON.parse(response.payload)
    t.equal(payload.message, 'kaboom')
    t.equal(response.statusCode, 500)
  })

  t.test('it should return a 500 error if `template` fails in `production` mode', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const POV = proxyquire('..', {
      hashlru: function () {
        return {
          get: () => {
            return () => { throw Error('Template Error') }
          },
          set: () => { }
        }
      }
    })

    fastify.register(POV, {
      engine: { handlebars },
      layout: './templates/layout.hbs',
      production: true
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index.hbs')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    const payload = JSON.parse(response.payload)
    t.equal(response.statusCode, 500)
    t.equal(payload.message, 'Template Error')
  })
})
