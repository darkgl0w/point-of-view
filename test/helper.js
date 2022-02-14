'use strict'

const { readFileSync } = require('fs')

const dot = require('dot')
const eta = require('eta')
const handlebars = require('handlebars')
const { Liquid } = require('liquidjs')
const nunjucks = require('nunjucks')
const pug = require('pug')
const Twig = require('twig')

const Fastify = require('fastify')
const minifier = require('html-minifier')
const plugin = require('..')

const data = { text: 'text' }
const minifierOpts = {
  removeComments: true,
  removeCommentsFromCDATA: true,
  collapseWhitespace: true,
  collapseBooleanAttributes: true,
  removeAttributeQuotes: true,
  removeEmptyAttributes: true
}

module.exports.dotHtmlMinifierTests = function (t, compileOptions, withMinifierOptions) {
  const { test } = t
  const options = withMinifierOptions ? minifierOpts : {}

  test('reply.view with dot engine and html-minifier', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    dot.log = false

    await fastify.register(plugin, {
      engine: {
        dot: dot
      },
      root: 'templates',
      options: {
        useHtmlMinifier: minifier,
        ...(withMinifierOptions && { htmlMinifierOptions: minifierOpts })
      }
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
    t.equal(response.body.toString(), minifier.minify(dot.process(compileOptions).testdot(data), options))
  })

  test('reply.view with dot engine and paths excluded from html-minifier', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    dot.log = false

    await fastify.register(plugin, {
      engine: {
        dot: dot
      },
      root: 'templates',
      options: {
        useHtmlMinifier: minifier,
        ...(withMinifierOptions && { htmlMinifierOptions: minifierOpts }),
        pathsToExcludeHtmlMinifier: ['/test']
      }
    })

    fastify.get('/test', (request, reply) => {
      reply.view('testdot', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/test'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.body.toString(), dot.process(compileOptions).testdot(data))
  })
}

module.exports.etaHtmlMinifierTests = function (t, withMinifierOptions) {
  const { test } = t
  const options = withMinifierOptions ? minifierOpts : {}

  test('reply.view with eta engine and html-minifier', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: {
        eta: eta
      },
      options: {
        useHtmlMinifier: minifier,
        ...(withMinifierOptions && { htmlMinifierOptions: minifierOpts })
      }
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
    t.equal(response.body.toString(), minifier.minify(eta.render(readFileSync('./templates/index.eta', 'utf8'), data), options))
  })

  test('reply.view with eta engine and paths excluded from html-minifier', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: {
        eta: eta
      },
      options: {
        useHtmlMinifier: minifier,
        ...(withMinifierOptions && { htmlMinifierOptions: minifierOpts }),
        pathsToExcludeHtmlMinifier: ['/test']
      }
    })

    fastify.get('/test', (request, reply) => {
      reply.view('templates/index.eta', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/test'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.body.toString(), eta.render(readFileSync('./templates/index.eta', 'utf8'), data))
  })
}

module.exports.handleBarsHtmlMinifierTests = function (t, withMinifierOptions) {
  const { test } = t
  const options = withMinifierOptions ? minifierOpts : {}

  test('fastify.view with handlebars engine and html-minifier', async (t) => {
    t.plan(1)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: {
        handlebars: handlebars
      },
      options: {
        useHtmlMinifier: minifier,
        ...(withMinifierOptions && { htmlMinifierOptions: minifierOpts }),
        partials: { body: './templates/body.hbs' }
      }
    })

    await fastify.ready()

    await fastify.view('./templates/index.html', data).then(compiled => {
      t.equal(compiled, minifier.minify(handlebars.compile(readFileSync('./templates/index.html', 'utf8'))(data), options))
    })
  })
}

module.exports.liquidHtmlMinifierTests = function (t, withMinifierOptions) {
  const { test } = t
  const options = withMinifierOptions ? minifierOpts : {}

  test('reply.view with liquid engine and html-minifier', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const engine = new Liquid()

    await fastify.register(plugin, {
      engine: {
        liquid: engine
      },
      options: {
        useHtmlMinifier: minifier,
        ...(withMinifierOptions && { htmlMinifierOptions: minifierOpts })
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
    t.equal(response.body.toString(), minifier.minify(html, options))
  })

  test('reply.view with liquid engine and paths excluded from html-minifier', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    const engine = new Liquid()

    await fastify.register(plugin, {
      engine: {
        liquid: engine
      },
      options: {
        useHtmlMinifier: minifier,
        ...(withMinifierOptions && { htmlMinifierOptions: minifierOpts }),
        pathsToExcludeHtmlMinifier: ['/test']
      }
    })

    fastify.get('/test', (request, reply) => {
      reply.view('./templates/index.liquid', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/test'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')

    const html = await engine.renderFile('./templates/index.liquid', data)
    t.equal(response.body.toString(), html)
  })
}

module.exports.nunjucksHtmlMinifierTests = function (t, withMinifierOptions) {
  const { test } = t
  const options = withMinifierOptions ? minifierOpts : {}

  test('reply.view with nunjucks engine, full path templates folder, and html-minifier', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: {
        nunjucks: nunjucks
      },
      templates: 'templates',
      options: {
        useHtmlMinifier: minifier,
        ...(withMinifierOptions && { htmlMinifierOptions: minifierOpts })
      }
    })

    fastify.get('/', (request, reply) => {
      reply.view('./index.njk', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    // Global Nunjucks templates dir changed here.
    t.equal(response.body.toString(), minifier.minify(nunjucks.render('./index.njk', data), options))
  })

  test('reply.view with nunjucks engine, full path templates folder, and paths excluded from html-minifier', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: {
        nunjucks: nunjucks
      },
      templates: 'templates',
      options: {
        useHtmlMinifier: minifier,
        ...(withMinifierOptions && { htmlMinifierOptions: minifierOpts }),
        pathsToExcludeHtmlMinifier: ['/test']
      }
    })

    fastify.get('/test', (request, reply) => {
      reply.view('./index.njk', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/test'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    // Global Nunjucks templates dir changed here.
    t.equal(response.body.toString(), nunjucks.render('./index.njk', data))
  })
}

module.exports.pugHtmlMinifierTests = function (t, withMinifierOptions) {
  const { test } = t
  const options = withMinifierOptions ? minifierOpts : {}

  test('reply.view with pug engine and html-minifier', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: {
        pug: pug
      },
      options: {
        useHtmlMinifier: minifier,
        ...(withMinifierOptions && { htmlMinifierOptions: minifierOpts })
      }
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
    t.equal(response.body.toString(), minifier.minify(pug.render(readFileSync('./templates/index.pug', 'utf8'), data), options))
  })

  test('reply.view with pug engine and paths excluded from html-minifier', async (t) => {
    t.plan(4)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    await fastify.register(plugin, {
      engine: {
        pug: pug
      },
      options: {
        useHtmlMinifier: minifier,
        ...(withMinifierOptions && { htmlMinifierOptions: minifierOpts }),
        pathsToExcludeHtmlMinifier: ['/test']
      }
    })

    fastify.get('/test', (request, reply) => {
      reply.view('./templates/index.pug', data)
    })

    await fastify.ready()

    const response = await fastify.inject({
      method: 'GET',
      path: '/test'
    })

    t.equal(response.statusCode, 200)
    t.equal(response.headers['content-length'], `${response.body.length}`)
    t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
    t.equal(response.body.toString(), pug.render(readFileSync('./templates/index.pug', 'utf8'), data))
  })
}

module.exports.twigHtmlMinifierTests = function (t, withMinifierOptions) {
  const { test } = t
  const options = withMinifierOptions ? minifierOpts : {}

  test('reply.view with twig engine and html-minifier', (t) => {
    t.plan(6)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    fastify.register(plugin, {
      engine: {
        twig: Twig
      },
      options: {
        useHtmlMinifier: minifier,
        ...(withMinifierOptions && { htmlMinifierOptions: minifierOpts })
      }
    })

    fastify.get('/', (request, reply) => {
      reply.view('./templates/index.twig', data)
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.inject({
        method: 'GET',
        path: '/'
      }).then((response) => {
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-length'], `${response.body.length}`)
        t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
        Twig.renderFile('./templates/index.twig', data, (err, html) => {
          t.error(err)
          t.equal(response.body.toString(), minifier.minify(html, options))
        })
      }).catch((err) => {
        t.error(err)
      })
    })
  })

  test('reply.view with twig engine and paths excluded from html-minifier', (t) => {
    t.plan(6)

    const fastify = Fastify()
    t.teardown(fastify.close.bind(fastify))

    fastify.register(plugin, {
      engine: {
        twig: Twig
      },
      options: {
        useHtmlMinifier: minifier,
        ...(withMinifierOptions && { htmlMinifierOptions: minifierOpts }),
        pathsToExcludeHtmlMinifier: ['/test']
      }
    })

    fastify.get('/test', (request, reply) => {
      reply.view('./templates/index.twig', data)
    })

    fastify.ready((err) => {
      t.error(err)

      fastify.inject({
        method: 'GET',
        path: '/test'
      }).then((response) => {
        t.equal(response.statusCode, 200)
        t.equal(response.headers['content-length'], `${response.body.length}`)
        t.equal(response.headers['content-type'], 'text/html; charset=utf-8')
        Twig.renderFile('./templates/index.twig', data, (err, html) => {
          t.error(err)
          t.equal(response.body.toString(), html)
        })
      }).catch((err) => {
        t.error(err)
      })
    })
  })
}
