'use strict'

process.env.NODE_ENV = 'production'

const Fastify = require('fastify')
const pointOfView = require('..')

const fastify = Fastify()

fastify.register(pointOfView, {
  engine: {
    ejs: require('ejs')
  }
})

fastify.get('/', (request, reply) => {
  reply.view('../templates/index.ejs', { text: 'text' })
})

fastify.listen(3000, (err) => {
  if (err) throw err
  console.log(`server listening on ${fastify.server.address().port}`)
})
