'use strict'

const { mkdirSync, readFileSync, writeFileSync } = require('fs')
const { tmpdir } = require('os')
const { join } = require('path')

const { test } = require('tap')

const ejs = require('ejs')
const eta = require('eta')
const Fastify = require('fastify')
const plugin = require('..')

test('`fastify.view` decorator should exist', (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.register(plugin, {
    engine: { ejs }
  })

  fastify.ready((err) => {
    t.error(err)
    t.ok(fastify.view)
  })
})

test('`fastify.view.clearCache` method should exist in `fastify.view` decorator', (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.register(plugin, {
    engine: { ejs }
  })

  fastify.ready((err) => {
    t.error(err)
    t.ok(fastify.view.clearCache)
  })
})

test('`fastify.view.clearCache()` method should clear cache', (t) => {
  t.plan(10)

  const templatesFolder = join(tmpdir(), 'fastify')

  try {
    mkdirSync(templatesFolder)
  } catch {}

  writeFileSync(join(templatesFolder, 'cache_clear_test.ejs'), '<html><body><span>123</span></body></<html>')

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.register(plugin, {
    engine: { ejs },
    includeViewExtension: true,
    templates: templatesFolder,
    production: true
  })

  fastify.get('/view-cache-test', (request, reply) => {
    reply
      .type('text/html; charset=utf-8')
      .view('cache_clear_test')
  })

  fastify.ready((err) => {
    t.error(err)

    fastify.inject({
      method: 'GET',
      path: '/view-cache-test'
    }).then((response) => {
      t.equal(response.headers['content-length'], `${response.body.length}`)
      t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

      writeFileSync(join(templatesFolder, 'cache_clear_test.ejs'), '<html><body><span>456</span></body></<html>')

      const output = response.body.toString()
      fastify.inject({
        method: 'GET',
        path: '/view-cache-test'
      }).then((response) => {
        t.equal(response.headers['content-length'], `${response.body.length}`)
        t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
        t.equal(response.body.toString(), output)

        fastify.view.clearCache()

        fastify.inject({
          method: 'GET',
          path: '/view-cache-test'
        }).then((response) => {
          t.equal(response.headers['content-length'], `${response.body.length}`)
          t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
          t.not(response.body.toString(), output)
          t.match(response.body.toString(), '456')
        })
      })
    }).catch((err) => {
      t.error(err)
    })
  })
})

test('`reply.view` decorator should exist', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { ejs }
  })

  fastify.get('/', (request, reply) => {
    t.ok(reply.view)
    reply.send({ hello: 'world' })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.same(JSON.parse(response.payload), { hello: 'world' })
})

test('`reply.view` can be returned from an async function to indicate that the response processing has finished', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { ejs },
    root: join(__dirname, '../templates'),
    layout: 'layout.html'
  })

  fastify.get('/', async (request, reply) => {
    return reply.view('index-for-layout.ejs', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

  const html = ejs.render(readFileSync('./templates/index.ejs', 'utf8'), data)
  t.equal(response.body.toString(), html)
})

test('It should be able to access `reply.locals` variable across all views', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { ejs },
    layout: 'index-layout-body',
    root: join(__dirname, '../templates'),
    viewExt: 'ejs'
  })

  fastify.addHook('preHandler', async function (request, reply) {
    reply.locals = {
      content: 'ok'
    }
  })

  fastify.get('/', async (request, reply) => {
    return reply.view('index-layout-content')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString().trim(), 'ok')
})

test('It should apply the default extension for ejs', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { ejs },
    root: join(__dirname, '../templates'),
    viewExt: 'html'
  })

  fastify.get('/', async (request, reply) => {
    return reply.view('index-with-includes-without-ext')
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(response.body.toString().trim(), 'ok')
})

test('reply.view with ejs engine and custom propertyName', (t) => {
  t.plan(9)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.register(plugin, {
    engine: { ejs },
    root: join(__dirname, '../templates'),
    layout: 'layout.html',
    propertyName: 'mobile'
  })

  fastify.register(plugin, {
    engine: { ejs },
    root: join(__dirname, '../templates'),
    layout: 'layout.html',
    propertyName: 'desktop'
  })

  fastify.get('/', async (request, reply) => {
    const text = request.headers['user-agent']
    return reply[text]('index-for-layout.ejs', { text })
  })

  fastify.ready((err) => {
    t.error(err)

    fastify.inject({
      method: 'GET',
      path: '/',
      headers: { 'user-agent': 'mobile' }
    }).then((response) => {
      t.equal(response.statusCode, 200)
      t.equal(response.headers['content-length'], `${response.body.length}`)
      t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
      t.equal(response.body.toString(), ejs.render(readFileSync('./templates/index.ejs', 'utf8'), { text: 'mobile' }))

      fastify.inject({
        method: 'GET',
        path: '/',
        headers: { 'user-agent': 'desktop' }
      }).then((response) => {
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-length'], `${response.body.length}`)
        t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
        t.equal(response.body.toString(), ejs.render(readFileSync('./templates/index.ejs', 'utf8'), { text: 'desktop' }))
      })
    }).catch((err) => {
      t.error(err)
    })
  })
})

test('`reply.view` should return a 500 error when page is missing', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { ejs }
  })

  fastify.get('/', (request, reply) => {
    reply.view()
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  const payload = JSON.parse(response.payload)
  t.equal(response.statusCode, 500)
  t.equal(payload.message, 'Missing page')
})

test('`reply.view` should return a 500 error if `layout` is set globally and provided on render', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }
  await fastify.register(plugin, {
    engine: {
      ejs: ejs,
      layout: 'layout.html'
    }
  })

  fastify.get('/', (request, reply) => {
    reply.view('index-for-layout.ejs', data, { layout: 'layout.html' })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  const payload = JSON.parse(response.payload)
  t.equal(response.statusCode, 500)
  t.equal(
    payload.message,
    'unable to access template "layout.html"'
  )
})

// FIXME:
test('`reply.view` should throw if `layout` is set globally and provided on render with the `eta` engine', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await await fastify.register(plugin, {
    engine: { eta },
    root: join(__dirname, '../templates'),
    layout: 'layout-eta.html'
  })

  const data = { text: 'text' }
  fastify.get('/', (request, reply) => {
    reply.view('index-for-layout.eta', data, { layout: 'layout-eta.html' })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    url: '/'
  })
  const payload = JSON.parse(response.payload)

  t.equal(response.statusCode, 500)
  t.equal(
    payload.message,
    'A layout can either be set globally or on render, not both.'
  )
})

test('register callback should throw if the engine is missing', (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.register(plugin)

  fastify.ready((err) => {
    t.ok(err instanceof Error)
    t.equal(err.message, 'Missing engine')
  })
})

test('register callback should throw if the engine is not supported', (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.register(plugin, {
    engine: {
      notSupported: null
    }
  })

  fastify.ready((err) => {
    t.ok(err instanceof Error)
    t.equal(err.message, '\'notSupported\' is not yet supported. Would you like to send a PR ? :)')
  })
})

test('register callback with handlebars engine should throw if layout file does not exist', (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.register(plugin, {
    engine: {
      handlebars: require('handlebars')
    },
    layout: './templates/does-not-exist.hbs'
  })

  fastify.ready((err) => {
    t.ok(err instanceof Error)
    t.same(err.message, 'unable to access template "./templates/does-not-exist.hbs"')
  })
})

test('register callback should throw if layout option provided with wrong engine', (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  fastify.register(plugin, {
    engine: {
      pug: require('pug')
    },
    layout: 'template'
  })

  fastify.ready((err) => {
    t.ok(err instanceof Error)
    t.equal(err.message, 'Only Dot, Handlebars, EJS, and Eta support the "layout" option')
  })
})

test('plugin is registered with "point-of-view" name', async (t) => {
  t.plan(1)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { ejs }
  })

  await fastify.ready()

  const kRegistedPlugins = Symbol.for('registered-plugin')
  const registeredPlugins = fastify[kRegistedPlugins]
  t.ok(registeredPlugins.find(name => name === 'point-of-view'))
})
