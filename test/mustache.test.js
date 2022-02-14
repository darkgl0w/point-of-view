'use strict'

const { readFileSync } = require('fs')
const { join } = require('path')

const { test } = require('tap')

const Fastify = require('fastify')
const minifier = require('html-minifier')
const mustache = require('mustache')
const proxyquire = require('proxyquire')
const plugin = require('..')

const minifierOpts = {
  removeComments: true,
  removeCommentsFromCDATA: true,
  collapseWhitespace: true,
  collapseBooleanAttributes: true,
  removeAttributeQuotes: true,
  removeEmptyAttributes: true
}

test('reply.view with mustache engine', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { mustache }
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
  t.equal(mustache.render(readFileSync('./templates/index.html', 'utf8'), data), response.body.toString())
})

test('reply.view for mustache without data-parameter but defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { mustache },
    defaultContext: data
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
  t.equal(mustache.render(readFileSync('./templates/index.html', 'utf8'), data), response.body.toString())
})

test('reply.view for mustache without data-parameter and without defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { mustache }
  })

  fastify.get('/', (request, reply) => {
    // Reusing the ejs-template is possible because it contains no tags
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
  t.equal(mustache.render(readFileSync('./templates/index-bare.html', 'utf8')), response.body.toString())
})

test('reply.view with mustache engine and defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { mustache },
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
  t.equal(mustache.render(readFileSync('./templates/index.html', 'utf8'), data), response.body.toString())
})

test('reply.view for mustache engine without data-parameter and defaultContext but with reply.locals', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }

  await fastify.register(plugin, {
    engine: { mustache }
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
  t.equal(mustache.render(readFileSync('./templates/index.html', 'utf8'), localsData), response.body.toString())
})

test('reply.view for mustache engine without defaultContext but with reply.locals and data-parameter', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { mustache }
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
  t.equal(mustache.render(readFileSync('./templates/index.html', 'utf8'), data), response.body.toString())
})

test('reply.view for mustache engine without data-parameter but with reply.locals and defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const contextData = { text: 'text from context' }

  await fastify.register(plugin, {
    engine: { mustache },
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
  t.equal(mustache.render(readFileSync('./templates/index.html', 'utf8'), localsData), response.body.toString())
})

test('reply.view for mustache engine with data-parameter and reply.locals and defaultContext', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const localsData = { text: 'text from locals' }
  const contextData = { text: 'text from context' }
  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { mustache },
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
  t.equal(mustache.render(readFileSync('./templates/index.html', 'utf8'), data), response.body.toString())
})

test('reply.view with mustache engine with partials', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { mustache }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.mustache', data, { partials: { body: './templates/body.mustache' } })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(mustache.render(readFileSync('./templates/index.mustache', 'utf8'), data, { body: '<p>{{ text }}</p>' }), response.body.toString())
})

test('reply.view with mustache engine with partials in production mode should use cache', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }
  const POV = proxyquire('..', {
    hashlru: function () {
      return {
        get: () => {
          return '<div>Cached Response</div>'
        },
        set: () => { }
      }
    }
  })

  fastify.register(POV, {
    engine: { mustache },
    production: true
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.mustache', data, { partials: { body: './templates/body.mustache' } })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], String(response.body.length))
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal('<div>Cached Response</div>', response.body.toString())
})

test('reply.view with mustache engine with partials and html-minifier', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { mustache },
    options: {
      useHtmlMinifier: minifier,
      htmlMinifierOptions: minifierOpts
    }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.mustache', data, { partials: { body: './templates/body.mustache' } })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(minifier.minify(mustache.render(readFileSync('./templates/index.mustache', 'utf8'), data, { body: '<p>{{ text }}</p>' }), minifierOpts), response.body.toString())
})

test('reply.view with mustache engine with partials and paths excluded from html-minifier', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { mustache },
    options: {
      useHtmlMinifier: minifier,
      htmlMinifierOptions: minifierOpts,
      pathsToExcludeHtmlMinifier: ['/test']
    }
  })

  fastify.get('/test', (request, reply) => {
    reply.view('./templates/index.mustache', data, { partials: { body: './templates/body.mustache' } })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/test'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(mustache.render(readFileSync('./templates/index.mustache', 'utf8'), data, { body: '<p>{{ text }}</p>' }), response.body.toString())
})

test('reply.view with mustache engine, template folder specified', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }
  const templatesFolder = 'templates'

  await fastify.register(plugin, {
    engine: { mustache },
    templates: templatesFolder
  })

  fastify.get('/', (request, reply) => {
    reply.view('index.html', data)
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(mustache.render(readFileSync('./templates/index.html', 'utf8'), data), response.body.toString())
})

test('reply.view with mustache engine, template folder specified with partials', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }
  const templatesFolder = 'templates'

  await fastify.register(plugin, {
    engine: { mustache },
    templates: templatesFolder
  })

  fastify.get('/', (request, reply) => {
    reply.view('index.mustache', data, { partials: { body: 'body.mustache' } })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })

  t.equal(response.statusCode, 200)
  t.equal(response.headers['content-length'], `${response.body.length}`)
  t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
  t.equal(mustache.render(readFileSync('./templates/index.mustache', 'utf8'), data, { body: '<p>{{ text }}</p>' }), response.body.toString())
})

test('reply.view with mustache engine, missing template file', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { mustache }
  })

  fastify.get('/', (request, reply) => {
    reply.view('../templates/missing.html', data)
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
  t.equal(payload.message, `ENOENT: no such file or directory, open '${join(__dirname, '../../templates/missing.html')}'`)
})

test('reply.view with mustache engine, with partials missing template file', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { mustache }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/missing.mustache', data, { partials: { body: './templates/body.mustache' } })
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
  t.equal(payload.message, `ENOENT: no such file or directory, open '${join(__dirname, '../templates/missing.mustache')}'`)
})

test('reply.view with mustache engine, with partials missing partials file', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { mustache }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.mustache', data, { partials: { body: './templates/missing.mustache' } })
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
  t.equal(payload.message, `ENOENT: no such file or directory, open '${join(__dirname, '../templates/missing.mustache')}'`)
})

test('reply.view with mustache engine, with partials and multiple missing partials file', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  const data = { text: 'text' }

  await fastify.register(plugin, {
    engine: { mustache }
  })

  fastify.get('/', (request, reply) => {
    reply.view('./templates/index.mustache', data, { partials: { body: './templates/missing.mustache', footer: './templates/alsomissing.mustache' } })
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
  t.equal(/ENOENT: no such file or directory/s.test(payload.message), true)
})

test('fastify.view with mustache engine, should throw page missing', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  t.teardown(fastify.close.bind(fastify))

  await fastify.register(plugin, {
    engine: { mustache }
  })

  await fastify.ready()

  await fastify.view(null, {}, (err) => {
    t.ok(err instanceof Error)
    t.equal(err.message, 'Missing page')
  })
})
