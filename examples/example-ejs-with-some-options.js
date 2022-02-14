'use strict'

const { resolve } = require('path')

const Fastify = require('fastify')
const ejsEngine = require('ejs')
// const pointOfView = require('point-of-view')
const pointOfView = require('..')

const templatesFolder = 'templates'
const data = { text: 'Hello from EJS Templates' }

const fastify = Fastify({ logger: true })

fastify.register(pointOfView, {
  engine: {
    ejs: ejsEngine
  },
  defaultContext: {
    header: 'header value defined as default contenxt',
    footer: 'footer value defined as default contenxt'
  },
  includeViewExtension: true,
  layout: 'layout',
  templates: templatesFolder,
  options: {
    filename: resolve(templatesFolder)
  },
  charset: 'utf-8' // sample usage, but specifying the same value already used as default
})

fastify.get('/', (request, reply) => {
  // reply.type('text/html; charset=utf-8').view('index-linking-other-pages', data)  // sample for specifying with type
  reply.view('index-linking-other-pages', data)
})

fastify.get('/include-test', (request, reply) => {
  reply.view('index-with-includes', data)
})

fastify.get('/include-one-include-missing-test', (request, reply) => {
  reply.view('index-with-includes-one-missing', data)
})

fastify.get('/include-one-attribute-missing-test', (request, reply) => {
  reply.view('index-with-includes-and-attribute-missing', data)
})

fastify.listen(3000, (err) => {
  if (err) throw err
})
