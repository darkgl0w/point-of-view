'use strict'

const { readFileSync } = require('fs')
const { join, resolve } = require('path')

const t = require('tap')
const { test } = t

const eta = require('eta')
const Fastify = require('fastify')
const plugin = require('..')

require('./helper').etaHtmlMinifierTests(t, true)
require('./helper').etaHtmlMinifierTests(t, false)

test('Eta engine - using `fastify.view` decorator :', async (t) => {
  t.test('with callback syntax in `production` mode', (t) => {
    t.plan(6)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    fastify.register(plugin, {
      engine: { eta },
      production: true
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.view('templates/index.eta', data, (err, compiled) => {
        t.error(err)
        t.equal(eta.render(readFileSync('./templates/index.eta', 'utf8'), data), compiled)

        fastify.ready((err) => {
          t.error(err)

          fastify.view('templates/index.eta', data, (err, compiled) => {
            t.error(err)
            t.equal(eta.render(readFileSync('./templates/index.eta', 'utf8'), data), compiled)
          })
        })
      })
    })
  })

  t.test('it should use cache in `production` mode', async (t) => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const cache = {
      cache: {},
      get (k) {
        if (typeof this.cache[k] !== 'undefined') {
          t.pass()
        }
        return this.cache[k]
      },
      define (k, v) {
        this.cache[k] = v
      }
    }

    await fastify.register(plugin, {
      production: true,
      engine: { eta },
      options: {
        templates: cache
      }
    })

    await fastify.ready()

    await fastify.view('templates/index.eta', { text: 'test' })
    // This should trigger the cache
    await fastify.view('templates/index.eta', { text: 'test' })
  })

  t.test('with custom cache', async (t) => {
    t.plan(7)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const tplPath = 'templates/index.eta'
    const tplAbsPath = resolve(tplPath)
    const data = { text: 'text' }

    // Custom cache
    const pseudoCache = {
      cache: {},
      get: function (k) {
        t.pass('the cache is set')
        return this.cache[k]
      },
      define: function (k, v) {
        this.cache[k] = v
      }
    }

    const etaOptions = {
      cache: true,
      templates: pseudoCache
    }

    eta.configure(etaOptions)

    await fastify.register(plugin, {
      engine: { eta },
      options: etaOptions
    })

    // pre-cache
    const tplFn = eta.loadFile(tplAbsPath, { filename: tplAbsPath })

    fastify.get('/', (request, reply) => {
      try {
        const result = reply.view(tplPath, data)
        t.equal(eta.config.templates, pseudoCache, 'Cache instance should be equal to the pre-defined one')
        t.not(eta.config.templates.get(tplAbsPath), undefined, 'Template should be pre-cached')

        return result
      } catch (error) {
        t.error(error)
      }
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200, 'Response should be 200')

    tplFn(data, eta.config, (err, content) => {
      t.error(err)
      t.equal(content, response.body.toString(), 'Route should return the same result as cached template function')
    })
  })

  t.test('with a missing page, it should throw an error', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: { eta }
    })

    await fastify.ready()

    await fastify.view(null, {}, (err) => {
      t.ok(err instanceof Error)
      t.equal(err.message, 'Missing page')
    })
  })
})

test('Eta engine - using `reply.view` decorator :', async (t) => {
  t.test('with default options', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { eta }
    })

    fastify.get('/', (request, reply) => {
      reply.view('templates/index.eta', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index.eta', 'utf8'), data), response.body.toString())
  })

  t.test('with `defaultContext`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { eta },
      defaultContext: data
    })

    fastify.get('/', (request, reply) => {
      reply.view('templates/index.eta', {})
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index.eta', 'utf8'), data), response.body.toString())
  })

  t.test('with custom `templates` folder', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { eta },
      templates: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('index.eta', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index.eta', 'utf8'), data), response.body.toString())
  })

  t.test('with `layout` option', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { eta },
      root: join(__dirname, '../templates'),
      layout: 'layout-eta.html'
    })

    fastify.get('/', (request, reply) => {
      reply.view('index-for-layout.eta', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index.eta', 'utf8'), data), response.body.toString())
  })

  t.test('with `layout` option on render', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { eta },
      root: join(__dirname, '../templates')
    })

    fastify.get('/', (request, reply) => {
      reply.view('index-for-layout.eta', data, { layout: 'layout-eta.html' })
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index.eta', 'utf8'), data), response.body.toString())
  })

  t.test('with a missing `layout on render, it should return a 500 error', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }
    const unknownLayout = 'non-existing-layout-eta.html'

    await fastify.register(plugin, {
      engine: { eta },
      root: join(__dirname, '../templates')
    })

    fastify.get('/', (request, reply) => {
      reply.view('index-for-layout.eta', data, { layout: unknownLayout })
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

  t.test('with custom extension', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { eta },
      templates: 'templates',
      viewExt: 'eta'
    })

    fastify.get('/', (request, reply) => {
      reply.view('index', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index.eta', 'utf8'), data), response.body.toString())
  })

  t.test('with `defaultContext` but without `data` parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { eta },
      defaultContext: data,
      templates: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('index.eta')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index.eta', 'utf8'), data), response.body.toString())
  })

  t.test('with `defaultContext` but without `data` parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { eta },
      defaultContext: data,
      templates: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('index.eta')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index.eta', 'utf8'), data), response.body.toString())
  })

  t.test('without `data` parameter and `defaultContext`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: { eta },
      templates: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('index-bare.html')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index-bare.html', 'utf8')), response.body.toString())
  })

  t.test('with `reply.locals` but without `data` parameter and `defaultContext`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }

    await fastify.register(plugin, {
      engine: { eta }
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index-bare.html')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index-bare.html', 'utf8'), localsData), response.body.toString())
  })

  t.test('without `defaultContext` but with `reply.locals` and `data` parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { eta }
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index-bare.html', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index-bare.html', 'utf8'), data), response.body.toString())
  })

  t.test('without `data` parameter but with `reply.locals` and `defaultContext`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    const contextData = { text: 'text from context' }

    await fastify.register(plugin, {
      engine: { eta },
      defaultContext: contextData
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index-bare.html')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index-bare.html', 'utf8'), localsData), response.body.toString())
  })

  t.test('with `data` parameter, `reply.locals` and `defaultContext`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    const contextData = { text: 'text from context' }
    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { eta },
      defaultContext: contextData
    })

    fastify.addHook('preHandler', function (request, reply, done) {
      reply.locals = localsData
      done()
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index-bare.html', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index-bare.html', 'utf8'), data), response.body.toString())
  })

  t.test('with full path `templates` folder', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { eta },
      templates: join(__dirname, '../templates')
    })

    fastify.get('/', (request, reply) => {
      reply.view('index.eta', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index.eta', 'utf8'), data), response.body.toString())
  })

  t.test('with `includeViewExtension` property set to `true`', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { eta },
      includeViewExtension: true
    })

    fastify.get('/', (request, reply) => {
      reply.view('templates/index', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(eta.render(readFileSync('./templates/index.eta', 'utf8'), data), response.body.toString())
  })

  t.test('when `templates` with folders are specified, include files (eta and html) used in template, `includeViewExtension` property set to `true`', async (t) => {
    t.plan(5)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const templatesFolder = join(__dirname, '../templates')
    const options = {
      // must be put to make tests (with include files) working ...
      views: templatesFolder
    }
    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { eta },
      includeViewExtension: true,
      templates: templatesFolder,
      options: options
    })

    fastify.get('/', (request, reply) => {
      reply
        // sample for specifying with type
        .type('text/html; charset=utf-8')
        .view('index-linking-other-pages', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    eta.renderFile('/index-linking-other-pages.eta', data, options, function (err, content) {
      t.error(err)
      t.equal(content.length, response.body.length)
    })
  })

  t.test('when `templates` with folders are specified, include files and attributes - home folder', async (t) => {
    t.plan(5)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const templatesFolder = join(__dirname, '../templates')
    const options = {
      views: templatesFolder
    }
    const data = { text: 'Hello from eta Templates' }

    await fastify.register(plugin, {
      engine: { eta },
      includeViewExtension: true,
      templates: templatesFolder,
      options: options
    })

    fastify.get('/', (request, reply) => {
      reply
        .type('text/html; charset=utf-8')
        .view('index', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    eta.renderFile('/index.eta', data, options, function (err, content) {
      t.error(err)
      t.equal(content.length, response.body.length)
    })
  })

  t.test('when `templates` with folders are specified, include files and attributes - page with no data', async (t) => {
    t.plan(5)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const templatesFolder = join(__dirname, '../templates')
    const options = {
      views: templatesFolder
    }

    await fastify.register(plugin, {
      engine: { eta },
      includeViewExtension: true,
      templates: templatesFolder,
      options: options
    })

    fastify.get('/no-data-test', (request, reply) => {
      reply
        .type('text/html; charset=utf-8')
        .view('index-with-no-data')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/no-data-test'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    eta.renderFile('/index-with-no-data.eta', null, options, function (err, content) {
      t.error(err)
      t.equal(content.length, response.body.length)
    })
  })

  t.test('when `templates` with folders are specified, include files and attributes - page with includes', async (t) => {
    t.plan(5)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const templatesFolder = join(__dirname, '../templates')
    const options = {
      views: templatesFolder
    }

    const data = { text: 'Hello from eta Templates' }

    await fastify.register(plugin, {
      engine: { eta },
      includeViewExtension: true,
      templates: templatesFolder,
      options: options
    })

    fastify.get('/include-test', (request, reply) => {
      reply
        .type('text/html; charset=utf-8')
        .view('index-with-includes', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/include-test'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    eta.renderFile('/index-with-includes.eta', data, options, function (err, content) {
      t.error(err)
      t.equal(content.length, response.body.length)
    })
  })

  t.test('when `templates` with folders are specified, include files and attributes - page with one missing include', async (t) => {
    t.plan(5)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const templatesFolder = join(__dirname, '../templates')
    const options = {
      views: templatesFolder
    }
    const data = { text: 'Hello from eta Templates' }

    await fastify.register(plugin, {
      engine: { eta },
      includeViewExtension: true,
      templates: templatesFolder,
      options: options
    })

    fastify.get('/include-one-include-missing-test', (request, reply) => {
      reply
        .type('text/html; charset=utf-8')
        .view('index-with-includes-one-missing', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/include-one-include-missing-test'
    })

    t.equal(response.statusCode, 500)
    t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    eta.renderFile('/index-with-includes-one-missing.eta', data, options, function (err, content) {
      t.type(err, Error)
      t.equal(content, undefined)
    })
  })
})
