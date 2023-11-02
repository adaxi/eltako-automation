import Joi from 'joi'
import EventEmitter from 'node:events'
import { DelimiterParser } from '@serialport/parser-delimiter'

const SYNC = Buffer.from([0xA5, 0x5A])
export const PACKET_PROCESSED = 'usb-parser.packet-processed'
export const ACTUATOR_STATE = 'usb-parser.acturator-state'

const internals = {}
internals.schemas = {}
internals.schemas.button = Joi.object({
  buttonAddress: Joi.string().required(),
  buttonKey: Joi.string().required()
})

const assertChecksum = (packet) => {
  const cs = packet.slice(0, 11).reduce((sum, byte) => sum + byte, 0) % 256
  if (cs !== packet[11]) {
    throw new Error(`Invalid checksum ${packet}`)
  }
}

const assertDataPacket = (packet) => {
  if (packet[0] !== 0x8B) {
    throw new Error('Not a data packet')
  }
}

const decodePacket = (packet) => {
  return {
    index: packet.slice(6, 10).toString('hex'),
    data: packet.slice(2, 6).toString('hex')
  }
}

const isOn = (data) => {
  return (data || '00').slice(0, 2) === '70'
}

export class UsbParser extends EventEmitter {
  constructor (port) {
    super()
    this.port = port
  }

  init () {
    const parser = this.port.pipe(new DelimiterParser({ delimiter: SYNC, includeDelimiter: false }))
    parser.on('data', async (packet) => {
      await this.handleIncomingPacket(packet)
      this.emit(PACKET_PROCESSED, packet)
    })
  }

  async handleIncomingPacket (packet) {
    try {
      console.log(['trace', 'incoming-packet'], 'Got packet ', packet.toString('hex'))
      assertChecksum(packet)
      assertDataPacket(packet)
      const { index, data } = decodePacket(packet)
      this.emit(ACTUATOR_STATE, { index, state: isOn(data) })
    } catch (err) {
      console.log(['trace', 'incoming-packet'], err.toString())
    }
  }
}
