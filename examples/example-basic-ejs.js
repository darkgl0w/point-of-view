'use strict'

const Fastify = require('fastify')
const ejsEngine = require('ejs')
// const pointOfView = require('point-of-view')
const pointOfView = require('..')

const fastify = Fastify({ logger: true })

fastify.register(pointOfView, {
  engine: {
    ejs: ejsEngine
  }
})

fastify.get('/', (request, reply) => {
  reply.view('/templates/index.ejs', { text: 'text' })
})

fastify.listen(3000, (err) => {
  if (err) throw err
})
