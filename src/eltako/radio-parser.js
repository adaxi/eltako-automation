import Joi from 'joi'
import Enocean from 'enocean-js'

const { ESP3Parser, pretty } = Enocean

const internals = {}
internals.schemas = {}
internals.schemas.button = Joi.object({
  index: Joi.number().required()
})

export class RadioParser {
  constructor (port) {
    this.port = port
  }

  async init () {
    const parser = new ESP3Parser()
    this.port.pipe(parser)
    parser.on('data', pretty.logESP3)
  }
}
