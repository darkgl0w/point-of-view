'use strict'

const { join, resolve } = require('path')

const { test } = require('tap')

const ejs = require('ejs')
const Fastify = require('fastify')
const plugin = require('..')

const templatesFolder = 'templates'
const options = {
  filename: resolve(templatesFolder),
  views: [join(__dirname, '..')]
}

test('EJS engine (requires TAP snapshots enabled) - using `reply.view` decorator :', async (t) => {
  t.test('when `templates` with folder are specified, include files (ejs and html) used in template, `includeViewExtension` property as `true`', async (t) => {
    t.plan(6)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

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
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    let output = null
    ejs.renderFile(join(templatesFolder, 'index-linking-other-pages.ejs'), data, options, function (err, content) {
      output = content
      t.error(err)
      t.equal(response.body.length, output.length)
    })

    // normalize new lines for cross-platform
    t.matchSnapshot(output.replace(/\r?\n/g, ''), 'output')
  })

  t.test('when `templates` with folder are specified, include `files` and `attributes` - home folder', async (t) => {
    t.plan(6)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

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

    let output = null
    ejs.renderFile(join(templatesFolder, 'index.ejs'), data, options, function (err, content) {
      output = content
      t.error(err)
      t.equal(response.body.length, output.length)
    })

    // normalize new lines for cross-platform
    t.matchSnapshot(output.replace(/\r?\n/g, ''), 'output')
  })

  t.test('when `templates` with folder are specified, include `files` and `attributes` - page with includes', async (t) => {
    t.plan(6)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

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

    let output = null
    ejs.renderFile(join(templatesFolder, 'index-with-includes.ejs'), data, options, function (err, content) {
      output = content
      t.error(err)
      t.equal(response.body.length, output.length)
    })

    // normalize new lines for cross-platform
    t.matchSnapshot(output.replace(/\r?\n/g, ''), 'output')
  })

  t.test('when `templates` with folder are specified, include `files` and `attributes` - page with one include missing', async (t) => {
    t.plan(7)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

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

    let output = null
    ejs.renderFile(join(templatesFolder, 'index-with-includes-one-missing.ejs'), data, options, function (err, content) {
      output = content
      t.ok(err)
      t.type(err, Error)
      t.equal(output, undefined)
    })

    t.matchSnapshot(output, 'output')
  })

  t.test('when `templates` with folder are specified, include `files` and `attributes` - page with one attribute missing', async (t) => {
    t.plan(7)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const data = { text: 'Hello from EJS Templates' }

    await fastify.register(plugin, {
      engine: { ejs },
      includeViewExtension: true,
      templates: templatesFolder,
      options: options
    })

    fastify.get('/include-one-attribute-missing-test', (request, reply) => {
      reply.type('text/html; charset=utf-8').view('index-with-includes-and-attribute-missing', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/include-one-attribute-missing-test'
    })

    t.equal(response.statusCode, 500)
    t.equal(response.headers['content-type'], 'application/json; charset=utf-8')
    t.equal(response.headers['content-length'], `${response.body.length}`)

    let output = null
    ejs.renderFile(join(templatesFolder, 'index-with-includes-and-attribute-missing.ejs'), data, options, function (err, content) {
      output = content
      t.ok(err)
      t.type(err, Error)
      t.equal(output, undefined)
    })

    t.matchSnapshot(output, 'output')
  })
})
