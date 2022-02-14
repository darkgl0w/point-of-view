'use strict'

const { promisify } = require('util')
const sleep = promisify(setTimeout)

const Fastify = require('fastify')
const nunjucksEngine = require('nunjucks')
// const pointOfView = require('point-of-view')
const pointOfView = require('..')

const templates = 'templates'

const fastify = Fastify({ logger: true })

fastify.register(pointOfView, {
  engine: {
    nunjucks: nunjucksEngine
  },
  templates
})

async function something () {
  await sleep(1000)
  return new Date()
}

fastify.get('/', async (request, reply) => {
  const t = await something()
  return reply.view('/index.njk', { text: t })
})

fastify.listen(3000, (err) => {
  if (err) throw err
})
