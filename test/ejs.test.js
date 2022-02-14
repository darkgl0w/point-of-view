'use strict'

const { readFileSync } = require('fs')
const { join, resolve } = require('path')

const { test } = require('tap')

const ejs = require('ejs')
const Fastify = require('fastify')
const minifier = require('html-minifier')
const plugin = require('..')

const minifierOpts = {
  removeComments: true,
  removeCommentsFromCDATA: true,
  collapseWhitespace: true,
  collapseBooleanAttributes: true,
  removeAttributeQuotes: true,
  removeEmptyAttributes: true
}

test('EJS engine - using `fastify.view` decorator :', async (t) => {
  t.test('with a missing template file, it should return a 500 error', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: { ejs }
    })

    await fastify.ready()

    await fastify.view('./missing.html', {}, (err) => {
      t.ok(err instanceof Error)
      t.equal(err.message, `ENOENT: no such file or directory, open '${join(__dirname, '../missing.html')}'`)
    })
  })

  t.test('with callback syntax in `production` mode', (t) => {
    t.plan(6)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    fastify.register(plugin, {
      engine: { ejs },
      production: true
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.view('templates/index.ejs', data, (err, compiled) => {
        t.error(err)
        t.equal(compiled, ejs.render(readFileSync('./templates/index.ejs', 'utf8'), data))

        fastify.ready((err) => {
          t.error(err)

          fastify.view('templates/index.ejs', data, (err, compiled) => {
            t.error(err)
            t.equal(compiled, ejs.render(readFileSync('./templates/index.ejs', 'utf8'), data))
          })
        })
      })
    })
  })
})

test('EJS engine - using `reply.view` decorator :', async (t) => {
  t.test('with custom `templates` folder', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
      templates: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('index.ejs', data)
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

  t.test('with `layout` option', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
      root: join(__dirname, '../templates'),
      layout: 'layout.html'
    })

    fastify.get('/', (request, reply) => {
      reply.view('index-for-layout.ejs', data)
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

  t.test('with `layout` option on render', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
      root: join(__dirname, '../templates')
    })

    fastify.get('/', (request, reply) => {
      reply.view('index-for-layout.ejs', data, { layout: 'layout.html' })
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

  t.test('with a custom extension', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
      templates: 'templates',
      viewExt: 'ejs'
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

    const html = ejs.render(readFileSync('./templates/index.ejs', 'utf8'), data)
    t.equal(response.body.toString(), html)
  })

  t.test('with `defaultContext` but without `data` parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
      defaultContext: data,
      templates: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('index.ejs')
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

  t.test('reply.view for ejs without data-parameter but defaultContext', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
      defaultContext: data,
      templates: 'templates'
    })

    fastify.get('/', (request, reply) => {
      reply.view('index.ejs')
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

  t.test('reply.view for ejs without data-parameter and without defaultContext', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: { ejs },
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

    const html = ejs.render(readFileSync('./templates/index-bare.html', 'utf8'))
    t.equal(response.body.toString(), html)
  })

  t.test('reply.view for ejs engine without data-parameter and defaultContext but with reply.locals', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }

    await fastify.register(plugin, {
      engine: { ejs }
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

    const html = ejs.render(readFileSync('./templates/index-bare.html', 'utf8'), localsData)
    t.equal(response.body.toString(), html)
  })

  t.test('reply.view for ejs engine without defaultContext but with reply.locals and data-parameter', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs }
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

    const html = ejs.render(readFileSync('./templates/index-bare.html', 'utf8'), data)
    t.equal(response.body.toString(), html)
  })

  t.test('reply.view for ejs engine without data-parameter but with reply.locals and defaultContext', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    const contextData = { text: 'text from context' }

    await fastify.register(plugin, {
      engine: { ejs },
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

    const html = ejs.render(readFileSync('./templates/index-bare.html', 'utf8'), localsData)
    t.equal(response.body.toString(), html)
  })

  t.test('reply.view for ejs engine with data-parameter and reply.locals and defaultContext', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const localsData = { text: 'text from locals' }
    const contextData = { text: 'text from context' }
    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
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

    const html = ejs.render(readFileSync('./templates/index-bare.html', 'utf8'), data)
    t.equal(response.body.toString(), html)
  })

  t.test('reply.view with ejs engine and full path templates folder', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
      templates: join(__dirname, '../templates')
    })

    fastify.get('/', (request, reply) => {
      reply.view('index.ejs', data)
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

  t.test('reply.view with ejs engine and includeViewExtension property as true', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const ejs = require('ejs')
    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
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

    const html = ejs.render(readFileSync('./templates/index.ejs', 'utf8'), data)
    t.equal(response.body.toString(), html)
  })

  t.test('reply.view with ejs engine, template folder specified, include files (ejs and html) used in template, includeViewExtension property as true', async (t) => {
    t.plan(5)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const ejs = require('ejs')
    const resolve = require('path').resolve
    const templatesFolder = 'templates'
    const options = {
      filename: resolve(templatesFolder), // needed for include files to be resolved in include directive ...
      views: [__dirname] // must be put to make tests (with include files) working ...
    }
    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
      includeViewExtension: true,
      templates: templatesFolder,
      options: options
    })

    fastify.get('/', (request, reply) => {
      reply
        .type('text/html; charset=utf-8')
      // sample for specifying with type
        .view('index-linking-other-pages', data)
    // reply.view('index-with-includes', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    ejs.renderFile(templatesFolder + '/index-linking-other-pages.ejs', data, options, function (err, output) {
      t.error(err)
      t.equal(output.length, response.body.length)
    })
  })

  t.test('reply.view with ejs engine, templates with folder specified, include files and attributes; home', async (t) => {
    t.plan(5)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const ejs = require('ejs')
    const resolve = require('path').resolve
    const templatesFolder = 'templates'
    const options = {
      filename: resolve(templatesFolder),
      views: [__dirname]
    }
    const data = { text: 'Hello from EJS Templates' }

    await fastify.register(plugin, {
      engine: { ejs },
      includeViewExtension: true,
      templates: templatesFolder,
      options: options
    })

    fastify.get('/', (request, reply) => {
      reply.type('text/html; charset=utf-8').view('index', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    ejs.renderFile(templatesFolder + '/index.ejs', data, options, function (err, output) {
      t.error(err)
      t.equal(output.length, response.body.length)
    })
  })

  t.test('reply.view with ejs engine', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs }
    })

    fastify.get('/', (request, reply) => {
      reply.view('templates/index.ejs', data)
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

  t.test('reply.view with ejs engine and defaultContext', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
      defaultContext: data
    })

    fastify.get('/', (request, reply) => {
      reply.view('templates/index.ejs', {})
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

  t.test('reply.view with ejs engine and html-minifier', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
      options: {
        useHtmlMinifier: minifier,
        htmlMinifierOptions: minifierOpts
      }
    })

    fastify.get('/', (request, reply) => {
      reply.view('templates/index.ejs', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(minifier.minify(ejs.render(readFileSync('./templates/index.ejs', 'utf8'), data), minifierOpts), response.body.toString())
  })

  t.test('reply.view with ejs engine and paths excluded from html-minifier', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
      options: {
        useHtmlMinifier: minifier,
        htmlMinifierOptions: minifierOpts,
        pathsToExcludeHtmlMinifier: ['/test']
      }
    })

    fastify.get('/test', (request, reply) => {
      reply.view('templates/index.ejs', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/test'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    const html = ejs.render(readFileSync('./templates/index.ejs', 'utf8'), data)
    t.equal(response.body.toString(), html)
  })

  t.test('reply.view with ejs engine and includeViewExtension property as true', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
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

    const html = ejs.render(readFileSync('./templates/index.ejs', 'utf8'), data)
    t.equal(response.body.toString(), html)
  })

  t.test('*** reply.view with ejs engine with layout option, includeViewExtension property as true ***', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }
    const header = ''
    const footer = ''

    await fastify.register(plugin, {
      engine: { ejs },
      defaultContext: {
        header,
        footer
      },
      includeViewExtension: true,
      root: join(__dirname, '../templates'),
      layout: 'layout-with-includes'
    })

    fastify.get('/', (request, reply) => {
      reply.view('index-for-layout.ejs', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    const html = ejs.render(readFileSync('./templates/index.ejs', 'utf8'), { ...data, header, footer })
    t.equal(response.body.toString(), html)
  })

  t.test('*** reply.view with ejs engine with layout option on render, includeViewExtension property as true ***', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }
    const header = ''
    const footer = ''

    await fastify.register(plugin, {
      engine: { ejs },
      defaultContext: {
        header,
        footer
      },
      includeViewExtension: true,
      root: join(__dirname, '../templates')
    })

    fastify.get('/', (request, reply) => {
      reply.view('index-for-layout.ejs', data, { layout: 'layout-with-includes' })
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    const html = ejs.render(readFileSync('./templates/index.ejs', 'utf8'), { ...data, header, footer })
    t.equal(response.body.toString(), html)
  })

  t.test('reply.view with ejs engine, template folder specified, include files (ejs and html) used in template, includeViewExtension property as true', async (t) => {
    t.plan(5)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const templatesFolder = 'templates'
    const options = {
      filename: resolve(templatesFolder), // needed for include files to be resolved in include directive ...
      views: [__dirname] // must be put to make tests (with include files) working ...
    }
    const data = { text: 'text' }

    await fastify.register(plugin, {
      engine: { ejs },
      includeViewExtension: true,
      templates: templatesFolder
    // Options not necessary now
    })

    fastify.get('/', (request, reply) => {
      reply
        .type('text/html; charset=utf-8')
        .view('index-linking-other-pages', data) // sample for specifying with type
    // reply.view('index-with-includes', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    ejs.renderFile(templatesFolder + '/index-linking-other-pages.ejs', data, options, function (err, output) {
      t.error(err)
      t.equal(output.length, response.body.length)
    })
  })

  t.test('reply.view with ejs engine, templates with folder specified, include files and attributes; home', async (t) => {
    t.plan(5)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const templatesFolder = 'templates'
    const options = {
      filename: resolve(templatesFolder),
      views: [__dirname]
    }
    const data = { text: 'Hello from EJS Templates' }

    await fastify.register(plugin, {
      engine: { ejs },
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

    ejs.renderFile(templatesFolder + '/index.ejs', data, options, function (err, output) {
      t.error(err)
      t.equal(output.length, response.body.length)
    })
  })

  t.test('reply.view with ejs engine, templates with folder specified, include files and attributes; page with no data', async (t) => {
    t.plan(5)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const templatesFolder = 'templates'
    const options = {
      filename: resolve(templatesFolder),
      views: [__dirname]
    }

    await fastify.register(plugin, {
      engine: { ejs },
      includeViewExtension: true,
      templates: templatesFolder,
      options: options
    })

    fastify.get('/no-data-test', (request, reply) => {
      reply.type('text/html; charset=utf-8').view('index-with-no-data')
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/no-data-test'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    ejs.renderFile(templatesFolder + '/index-with-no-data.ejs', null, options, function (err, output) {
      t.error(err)
      t.equal(output.length, response.body.length)
    })
  })

  t.test('reply.view with ejs engine, templates with folder specified, include files and attributes; page with includes', async (t) => {
    t.plan(5)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const templatesFolder = 'templates'
    const options = {
      filename: resolve(templatesFolder),
      views: [join(__dirname, '..')]
    }

    const data = { text: 'Hello from EJS Templates' }

    await fastify.register(plugin, {
      engine: { ejs },
      includeViewExtension: true,
      templates: templatesFolder,
      options: options
    })

    fastify.get('/include-test', (request, reply) => {
      reply.type('text/html; charset=utf-8').view('index-with-includes', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/include-test'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    ejs.renderFile(templatesFolder + '/index-with-includes.ejs', data, options, function (err, output) {
      t.error(err)
      t.equal(output.length, response.body.length)
    })
  })

  t.test('reply.view with ejs engine, templates with folder specified, include files and attributes; page with one include missing', async (t) => {
    t.plan(5)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const templatesFolder = 'templates'
    const options = {
      filename: resolve(templatesFolder),
      views: [__dirname]
    }
    const data = { text: 'Hello from EJS Templates' }

    await fastify.register(plugin, {
      engine: { ejs },
      includeViewExtension: true,
      templates: templatesFolder,
      options: options
    })

    fastify.get('/include-one-include-missing-test', (request, reply) => {
      reply.type('text/html; charset=utf-8').view('index-with-includes-one-missing', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/include-one-include-missing-test'
    })

    t.equal(response.statusCode, 500)
    t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    ejs.renderFile(templatesFolder + '/index-with-includes-one-missing.ejs', data, options, function (err, output) {
      t.type(err, Error) // expected Error here ...
      t.equal(output, undefined)
    })
  })

  t.test('reply.view with ejs engine, templates with folder specified, include files and attributes; page with one attribute missing', async (t) => {
    t.plan(5)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const templatesFolder = 'templates'
    const options = {
      filename: resolve(templatesFolder),
      views: [__dirname]
    }
    const data = { text: 'Hello from EJS Templates' }

    await fastify.register(plugin, {
      engine: { ejs },
      includeViewExtension: true,
      templates: templatesFolder,
      options: options
    })

    fastify.get('/include-one-attribute-missing-test', (request, reply) => {
      reply
        .type('text/html; charset=utf-8')
        .view('index-with-includes-and-attribute-missing', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/include-one-attribute-missing-test'
    })

    t.equal(response.statusCode, 500)
    t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    ejs.renderFile(templatesFolder + '/index-with-includes-and-attribute-missing.ejs', data, options, function (err, output) {
      t.type(err, Error) // expected Error here ...
      t.equal(output, undefined)
    })
  })

  t.test('reply.view should return 500 if layout is missing on render', async (t) => {
    t.plan(2)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'text' }
    await fastify.register(plugin, {
      engine: { ejs },
      root: join(__dirname, '../templates')
    })

    const unknownLayout = 'non-existing-layout.html'

    fastify.get('/', (request, reply) => {
      reply.view('index-for-layout.ejs', data, { layout: unknownLayout })
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
