import Enocean from 'enocean-js'

const { ESP3Parser, pretty } = Enocean

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
