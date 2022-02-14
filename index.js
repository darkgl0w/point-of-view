'use strict'

const {
  accessSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFile
} = require('fs')
const {
  basename,
  dirname,
  extname,
  join,
  normalize,
  resolve
} = require('path')
const fp = require('fastify-plugin')
const HLRU = require('hashlru')

const supportedEngines = [
  'art-template',
  'dot',
  'ejs',
  'eta',
  'handlebars',
  'liquid',
  'mustache',
  'nunjucks',
  'pug',
  'twig'
]

function fastifyView (fastify, opts, next) {
  if (!opts.engine) {
    return next(new Error('Missing engine'))
  }

  const type = Object.keys(opts.engine)[0]

  if (supportedEngines.indexOf(type) === -1) {
    return next(new Error(`'${type}' is not yet supported. Would you like to send a PR ? :)`))
  }

  const defaultOptions = {
    charset: 'utf-8',
    defaultContext: {},
    options: {},
    includeViewExtension: false,
    maxCache: 100,
    production: process.env.NODE_ENV === 'production',
    propertyName: 'view',
    templates: '.',
    viewExt: ''
  }

  const {
    charset,
    defaultContext: defaultCtx,
    layout: globalLayoutFileName,
    options: globalOptions,
    includeViewExtension,
    maxCache,
    production: isProduction,
    propertyName,
    root,
    templates,
    viewExt
  } = Object.assign(defaultOptions, opts)

  const engine = opts.engine[type]
  const lru = HLRU(maxCache)
  const templatesDir = root || resolve(templates)

  function layoutIsValid (_layoutFileName) {
    if (type !== 'dot' && type !== 'handlebars' && type !== 'ejs' && type !== 'eta') {
      throw new Error('Only Dot, Handlebars, EJS, and Eta support the "layout" option')
    }

    if (!hasAccessToLayoutFile(_layoutFileName, getDefaultExtension(type))) {
      throw new Error(`unable to access template "${_layoutFileName}"`)
    }
  }

  if (globalLayoutFileName) {
    try {
      layoutIsValid(globalLayoutFileName)
    } catch (error) {
      return next(error)
    }
  }

  const dotRender = type === 'dot'
    ? viewDot.call(fastify, preProcessDot.call(fastify, templatesDir, globalOptions))
    : null

  const renders = {
    _default: view,
    'art-template': viewArtTemplate,
    dot: withLayout(dotRender, globalLayoutFileName),
    ejs: withLayout(viewEjs, globalLayoutFileName),
    eta: withLayout(viewEta, globalLayoutFileName),
    handlebars: withLayout(viewHandlebars, globalLayoutFileName),
    liquid: viewLiquid,
    mustache: viewMustache,
    nunjucks: viewNunjucks,
    twig: viewTwig
  }

  const renderer = renders[type] || renders._default

  function viewDecorator () {
    const args = Array.from(arguments)
    const done = (typeof args[args.length - 1] === 'function') && args.pop()

    const promise = new Promise((resolve, reject) => {
      renderer.apply({
        getHeader: () => {},
        header: () => {},
        send: result => {
          if (result instanceof Error) {
            reject(result)
            return
          }

          resolve(result)
        }
      }, args)
    })

    if (done && typeof done === 'function') {
      return promise.then(done.bind(null, null), done)
    }

    return promise
  }

  viewDecorator.clearCache = function () {
    lru.clear()
  }

  fastify.decorate(propertyName, viewDecorator)

  fastify.decorateReply(propertyName, function () {
    renderer.apply(this, arguments)

    return this
  })

  function getPage (page, extension) {
    const pageLRU = `getPage-${page}-${extension}`
    let result = lru.get(pageLRU)

    if (typeof result === 'string') {
      return result
    }

    result = join(dirname(page), `${basename(page, extname(page))}${getExtension(page, extension)}`)
    lru.set(pageLRU, result)

    return result
  }

  function getDefaultExtension (type) {
    const mappedExtensions = {
      'art-template': 'art',
      handlebars: 'hbs',
      nunjucks: 'njk'
    }

    return viewExt || (mappedExtensions[type] || type)
  }

  function getExtension (page, extension) {
    return viewExt
      ? `.${viewExt}`
      : includeViewExtension
        ? `.${extension}`
        : extname(page) || `.${getDefaultExtension(type)}`
  }

  function isPathExcludedFromMinification (currentPath, pathsToExclude) {
    return (pathsToExclude && Array.isArray(pathsToExclude))
      ? pathsToExclude.includes(currentPath)
      : false
  }

  function useHtmlMinification (globalOpts, requestedPath) {
    return globalOpts.useHtmlMinifier &&
      typeof globalOpts.useHtmlMinifier.minify === 'function' &&
      !isPathExcludedFromMinification(requestedPath, globalOpts.pathsToExcludeHtmlMinifier)
  }

  function getRequestedPath (fastify) {
    return (fastify && fastify.request)
      ? fastify.request.context.config.url
      : null
  }

  // Gets template as string (or precompiled for Handlebars) from LRU cache or filesystem.
  const getTemplate = function (file, callback, requestedPath) {
    const data = lru.get(file)

    if (data && isProduction) {
      return callback(null, data)
    } else {
      readFile(join(templatesDir, file), 'utf-8', (err, data) => {
        if (err) return callback(err, null)

        if (useHtmlMinification(globalOptions, requestedPath)) {
          data = globalOptions.useHtmlMinifier.minify(data, globalOptions.htmlMinifierOptions || {})
        }

        if (type === 'handlebars') {
          data = engine.compile(data)
        }

        lru.set(file, data)
        return callback(null, data)
      })
    }
  }

  // Gets partials as collection of strings from LRU cache or filesystem.
  const getPartials = function (page, { partials, requestedPath }, callback) {
    const partialsObj = lru.get(`${page}-Partials`)

    if (partialsObj && isProduction) {
      return callback(null, partialsObj)
    } else {
      let filesToLoad = Object.keys(partials).length

      if (filesToLoad === 0) {
        return callback(null, {})
      }

      let error = null
      const partialsHtml = {}
      Object.keys(partials).forEach((key) => {
        readFile(join(templatesDir, partials[key]), 'utf-8', (err, data) => {
          if (err) {
            error = err
          }

          if (useHtmlMinification(globalOptions, requestedPath)) {
            data = globalOptions.useHtmlMinifier.minify(data, globalOptions.htmlMinifierOptions || {})
          }

          partialsHtml[key] = data

          if (--filesToLoad === 0) {
            lru.set(`${page}-Partials`, partialsHtml)
            return callback(error, partialsHtml)
          }
        })
      })
    }
  }

  function readCallback (that, page, data) {
    return function _readCallback (err, html) {
      const requestedPath = getRequestedPath(that)

      if (err) return that.send(err)

      let compiledPage
      try {
        if ((type === 'ejs') && viewExt && !globalOptions.includer) {
          globalOptions.includer = (originalPath, parsedPath) => {
            return {
              filename: parsedPath || join(templatesDir, `${originalPath}.${viewExt}`)
            }
          }
        }

        globalOptions.filename = join(templatesDir, page)
        compiledPage = engine.compile(html, globalOptions)
      } catch (error) {
        return that.send(error)
      }

      lru.set(page, compiledPage)

      let cachedPage
      try {
        cachedPage = lru.get(page)(data)
      } catch (error) {
        cachedPage = error
      }

      if (useHtmlMinification(globalOptions, requestedPath)) {
        cachedPage = globalOptions.useHtmlMinifier.minify(cachedPage, globalOptions.htmlMinifierOptions || {})
      }

      setDefaultContentTypeIfNeeded(that, charset)
      return that.send(cachedPage)
    }
  }

  function preProcessDot (templatesDir, options) {
    // Process all templates to in memory functions
    // https://github.com/olado/doT#security-considerations
    const destinationDir = options.destination || join(__dirname, 'out')

    if (!existsSync(destinationDir)) {
      mkdirSync(destinationDir)
    }

    const renderer = engine.process(
      Object.assign({}, options, { path: templatesDir, destination: destinationDir })
    )

    // .jst files are compiled to .js files so we need to require them
    for (const file of readdirSync(destinationDir, { withFileTypes: false })) {
      renderer[basename(file, '.js')] = require(resolve(join(destinationDir, file)))
    }

    if (Object.keys(renderer).length === 0) {
      this.log.warn(`WARN: no template found in ${templatesDir}`)
    }

    return renderer
  }

  function view (page, data) {
    sendErrorOnMissingPage(page, this)

    data = Object.assign({}, defaultCtx, this.locals, data)
    // append view extension
    page = getPage(page, type)

    const toHtml = lru.get(page)

    if (toHtml && isProduction) {
      setDefaultContentTypeIfNeeded(this, charset)

      return this.send(toHtml(data))
    }

    readFile(join(templatesDir, page), 'utf8', readCallback(this, page, data))
  }

  function viewEjs (page, data, opts) {
    if (opts && opts.layout) {
      try {
        layoutIsValid(opts.layout)
        const that = this

        return withLayout(viewEjs, opts.layout).call(that, page, data)
      } catch (error) {
        return this.send(error)
      }
    }

    sendErrorOnMissingPage(page, this)

    data = Object.assign({}, defaultCtx, this.locals, data)
    // append view extension
    page = getPage(page, type)
    const requestedPath = getRequestedPath(this)
    getTemplate(page, (err, template) => {
      if (err) return this.send(err)

      const toHtml = lru.get(page)
      if (toHtml && isProduction && (typeof (toHtml) === 'function')) {
        setDefaultContentTypeIfNeeded(this, charset)
        return this.send(toHtml(data))
      }
      readFile(join(templatesDir, page), 'utf8', readCallback(this, page, data))
    }, requestedPath)
  }

  function viewArtTemplate (page, data) {
    sendErrorOnMissingPage(page, this)

    data = Object.assign({}, defaultCtx, this.locals, data)
    // Append view extension.
    page = getPage(page, 'art')

    const defaultSetting = {
      debug: process.env.NODE_ENV !== 'production',
      root: templatesDir
    }

    // merge engine options
    const confs = Object.assign({}, defaultSetting, globalOptions)

    function render (filename, data) {
      confs.filename = join(templatesDir, filename)
      const render = engine.compile(confs)

      return render(data)
    }

    try {
      const html = render(page, data)

      setDefaultContentTypeIfNeeded(this, charset)
      return this.send(html)
    } catch (error) {
      return this.send(error)
    }
  }

  function viewNunjucks (page, data) {
    sendErrorOnMissingPage(page, this)

    const env = engine.configure(templatesDir, globalOptions)
    if (typeof globalOptions.onConfigure === 'function') {
      globalOptions.onConfigure(env)
    }
    data = Object.assign({}, defaultCtx, this.locals, data)
    // Append view extension.
    page = getPage(page, 'njk')
    env.render(join(templatesDir, page), data, (err, html) => {
      if (err) return this.send(err)

      const requestedPath = getRequestedPath(this)

      if (useHtmlMinification(globalOptions, requestedPath)) {
        html = globalOptions.useHtmlMinifier.minify(html, globalOptions.htmlMinifierOptions || {})
      }

      setDefaultContentTypeIfNeeded(this, charset)
      return this.send(html)
    })
  }

  function viewHandlebars (page, data, opts) {
    if (opts && opts.layout) {
      try {
        layoutIsValid(opts.layout)
        const that = this

        return withLayout(viewHandlebars, opts.layout).call(that, page, data)
      } catch (error) {
        return this.send(error)
      }
    }

    sendErrorOnMissingPage(page, this)

    const options = Object.assign({}, globalOptions)
    data = Object.assign({}, defaultCtx, this.locals, data)
    // append view extension
    page = getPage(page, 'hbs')
    const requestedPath = getRequestedPath(this)
    getTemplate(page, (err, template) => {
      if (err) return this.send(err)

      if (isProduction) {
        try {
          const html = template(data)

          setDefaultContentTypeIfNeeded(this, charset)
          return this.send(html)
        } catch (error) {
          return this.send(error)
        }
      } else {
        getPartials(type, { partials: options.partials || {}, requestedPath: requestedPath }, (err, partialsObject) => {
          if (err) return this.send(err)

          try {
            Object.keys(partialsObject).forEach((name) => {
              engine.registerPartial(name, engine.compile(partialsObject[name]))
            })

            const html = template(data)

            setDefaultContentTypeIfNeeded(this, charset)
            return this.send(html)
          } catch (error) {
            return this.send(error)
          }
        })
      }
    }, requestedPath)
  }

  function viewMustache (page, data, opts) {
    sendErrorOnMissingPage(page, this)

    const options = Object.assign({}, opts)
    data = Object.assign({}, defaultCtx, this.locals, data)
    // append view extension
    page = getPage(page, 'mustache')
    const requestedPath = getRequestedPath(this)
    getTemplate(page, (err, templateString) => {
      if (err) return this.send(err)

      getPartials(page, { partials: options.partials || {}, requestedPath: requestedPath }, (err, partialsObject) => {
        if (err) return this.send(err)

        const html = engine.render(templateString, data, partialsObject)

        setDefaultContentTypeIfNeeded(this, charset)
        return this.send(html)
      })
    }, requestedPath)
  }

  function viewTwig (page, data, opts) {
    sendErrorOnMissingPage(page, this)

    data = Object.assign({}, defaultCtx, globalOptions, this.locals, data)
    // Append view extension.
    page = getPage(page, 'twig')
    engine.renderFile(join(templatesDir, page), data, (err, html) => {
      if (err) return this.send(err)

      const requestedPath = getRequestedPath(this)

      if (useHtmlMinification(globalOptions, requestedPath)) {
        html = globalOptions.useHtmlMinifier.minify(html, globalOptions.htmlMinifierOptions || {})
      }

      setDefaultContentTypeIfNeeded(this, charset)
      return this.send(html)
    })
  }

  function viewLiquid (page, data, opts) {
    sendErrorOnMissingPage(page, this)

    data = Object.assign({}, defaultCtx, this.locals, data)
    // Append view extension.
    page = getPage(page, 'liquid')

    const { root } = engine.options

    // Don't execute it if root path is included, then serve it directly
    const isRootIncluded = root
      .map((path) => normalize(path))
      .find((path) => page.indexOf(path) !== -1)

    const pagePath = (typeof root.length !== 'undefined' && !isRootIncluded)
      ? root
          .map((dir) => join(resolve(dir), page))
          .find((filepath) => existsSync(filepath)) || join(templatesDir, page)
      : join(templatesDir, page)

    engine.renderFile(pagePath, data, opts)
      .then((html) => {
        const requestedPath = getRequestedPath(this)

        if (useHtmlMinification(globalOptions, requestedPath)) {
          html = globalOptions.useHtmlMinifier.minify(html, globalOptions.htmlMinifierOptions || {})
        }

        setDefaultContentTypeIfNeeded(this, charset)
        return this.send(html)
      })
      .catch((err) => {
        return this.send(err)
      })
  }

  function viewDot (renderModule) {
    return function _viewDot (page, data, opts) {
      if (opts && opts.layout) {
        try {
          layoutIsValid(opts.layout)
          const that = this

          return withLayout(dotRender, opts.layout).call(that, page, data)
        } catch (error) {
          return this.send(error)
        }
      }

      sendErrorOnMissingPage(page, this)

      data = Object.assign({}, defaultCtx, this.locals, data)
      let html = renderModule[page](data)
      const requestedPath = getRequestedPath(this)

      if (useHtmlMinification(globalOptions, requestedPath)) {
        html = globalOptions.useHtmlMinifier.minify(html, globalOptions.htmlMinifierOptions || {})
      }

      setDefaultContentTypeIfNeeded(this, charset)
      return this.send(html)
    }
  }

  function viewEta (page, data, opts) {
    if (opts && opts.layout) {
      try {
        layoutIsValid(opts.layout)
        const that = this

        return withLayout(viewEta, opts.layout).call(that, page, data)
      } catch (error) {
        return this.send(error)
      }
    }

    sendErrorOnMissingPage(page, this)

    lru.define = lru.set
    engine.configure({
      templates: globalOptions.templates ? globalOptions.templates : lru
    })

    const config = Object.assign({
      cache: isProduction,
      views: templatesDir
    }, globalOptions)

    data = Object.assign({}, defaultCtx, this.locals, data)
    // Append view extension (Eta will append '.eta' by default,
    // but this also allows custom extensions)
    page = getPage(page, 'eta')
    engine.renderFile(page, data, config, (err, html) => {
      if (err) return this.send(err)

      if (
        config.useHtmlMinifier &&
        typeof config.useHtmlMinifier.minify === 'function' &&
        !isPathExcludedFromMinification(getRequestedPath(this), config.pathsToExcludeHtmlMinifier)
      ) {
        html = config.useHtmlMinifier.minify(
          html,
          config.htmlMinifierOptions || {}
        )
      }

      setDefaultContentTypeIfNeeded(this, charset)
      return this.send(html)
    })
  }

  if (isProduction && type === 'handlebars' && globalOptions.partials) {
    getPartials(type, { partials: globalOptions.partials, requestedPath: getRequestedPath(this) }, (err, partialsObject) => {
      if (err) return next(err)

      Object.keys(partialsObject).forEach((name) => {
        engine.registerPartial(name, engine.compile(partialsObject[name]))
      })

      return next()
    })
  } else {
    return next()
  }

  function withLayout (render, layout) {
    if (layout) {
      return function (page, data, opts) {
        if (opts && opts.layout) throw new Error('A layout can either be set globally or on render, not both.')

        const that = this
        data = Object.assign({}, defaultCtx, this.locals, data)
        render.call({
          getHeader: () => {},
          header: () => {},
          send: (result) => {
            if (result instanceof Error) {
              throw result
            }

            data = Object.assign(data, { body: result })
            render.call(that, layout, data, opts)
          }
        }, page, data, opts)
      }
    }

    return render
  }

  function hasAccessToLayoutFile (fileName, ext) {
    try {
      accessSync(join(templatesDir, getPage(fileName, ext)))

      return true
    } catch (error) {
      return false
    }
  }
}

function sendErrorOnMissingPage (page, reply) {
  if (!page) return reply.send(new Error('Missing page'))
}

function setDefaultContentTypeIfNeeded (reply, charset) {
  if (!reply.getHeader('content-type')) {
    return reply.header('Content-Type', `text/html; charset=${charset}`)
  }
}

module.exports = fp(fastifyView, {
  fastify: '3.x',
  name: 'point-of-view'
})
