import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'
import {
  sh,
  getKnownBins,
  getAllBins,
  getPaths,
  getOSInfo
} from './utils.node.js'
import { CLEAR } from './utils.js'
// A messages service that allows to create new
// and return all existing messages
class MessageService {
  constructor() {
    this.messages = []
  }

  async find() {
    // Just return all our messages
    return this.messages
  }

  async create(data) {
    // The new message is the data merged with a unique identifier
    // using the messages length since it changes whenever we add one
    const message = {
      id: this.messages.length,
      text: data.text || data.command,
      date: new Date().toISOString(),
      command: await sh(data.command)
    }

    // Add new message to the list
    if (CLEAR === message.command?.stdout) {
      this.remove(null)
    } else {
      this.messages.push(message)
    }

    return message
  }

  async remove() {
    this.messages = this.messages.filter((m) => m.command === undefined)
  }
}

// Creates an ExpressJS compatible Feathers application
const app = express(feathers())

// Parse HTTP JSON bodies
app.use(express.json())
// Parse URL-encoded params
app.use(express.urlencoded({ extended: true }))
// Host static files from the current folder
app.use(express.static('./'))
// Add REST API support
app.configure(express.rest())
// Configure Socket.io real-time APIs
app.configure(
  socketio(function (io) {
    io.on('connection', function (socket) {
      const transport = socket.conn.transport
      const command = `echo '👋 ${transport.name} #${socket.id}'`
      app.service('messages').create({ command })
    })
  })
)
// Register an in-memory messages service
app.use('/messages', new MessageService())
// Register a nicer error handler than the default Express one
app.use(express.errorHandler())

// Add any new real-time connection to the `everybody` channel
app.on('connection', (connection) => app.channel('everybody').join(connection))
// Publish all events to the `everybody` channel
app.publish((data) => app.channel('everybody'))

// Start the server
app.listen(3030).on('listening', async () => {
  console.log('Feathers server listening on localhost:3030')
  app.service('messages').create({
    text: '## Paths\n\n' + getPaths().join('\n')
  })

  app.service('messages').create({
    text:
      '## OS Information\n\n' +
      [...getOSInfo()]
        .map((i) => `${i[0]}: ${JSON.stringify(i[1], null, 2)}`)
        .join('\n')
  })

  const allBins = await getAllBins()
  const knownBins = await getKnownBins()
  const binsWNewMarked = allBins.map((b) =>
    knownBins.includes(b) ? b : b + ' <!-- ** NEW ADDITION !!! ** -->'
  )
  app.service('messages').create({
    text: `## Commands (${allBins.length})\n\n` + binsWNewMarked.join('\n')
  })
})
