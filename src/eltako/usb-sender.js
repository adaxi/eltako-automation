
import Joi from 'joi'

const internals = {}
internals.schemas = {}
internals.schemas.button = Joi.object({
  buttonAddress: Joi.string().required(),
  buttonKey: Joi.string().required()
})

const toFourByteBuffer = (data) => {
  if (typeof data === 'string') {
    data = Buffer.from(data, 'hex')
  }
  if (!Buffer.isBuffer(data) && typeof data !== 'number') {
    data = Buffer.from(data.toString())
  }
  if (data.length >= 4) {
    return data.slice(-4)
  }
  return Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x00]), data], 4)
}


const buildAction = (address = Buffer.from([0x00, 0x00, 0x10, 0x23]), data = '\x30\x00\x00\x00') => {
  const d = toFourByteBuffer(data)
  return buildPacket(d, toFourByteBuffer(address), d[0] === 0x30 ? 0x30 : 0x20)
}

const buildPacket = (data = Buffer.from([0x00, 0x00, 0x00, 0x00]), address = Buffer.from([0x00, 0x00, 0x00, 0x00]), status = 0x30, org = 5, hseq = 0) => {
  data = Buffer.concat([data, address, Buffer.from([status])])
  const hlen = ((data.length + 2) | (hseq << 5)) & 0xFF
  data = Buffer.concat([Buffer.from([hlen, org]), data])
  const csum = data.reduce((sum, byte) => sum + byte, 0) % 256
  const packet = Buffer.concat([SYNC, data, Buffer.from([csum])])
  return packet
}

export class UsbSender {
  #queue = []

  constructor (port) {
    this.port = port
  }

  processQueue () {
    const action = outgoingActionQueue.splice(0, 1)
    if (action) {
      serialPort.write(action)
    }
  }

  toggle (buttonCfg) {
    Joi.assert(buttonCfg, internals.schemas.button)
    const { buttonAddress, buttonKey } = buttonCfg
    const action = buildAction(buttonAddress, buttonKey)
    this.#queue.push(action)
  }
}


