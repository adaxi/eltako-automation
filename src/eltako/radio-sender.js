
import { SerialPort } from 'serialport'
import Joi from 'joi'
import Enocean from 'enocean-js'

const { ESP3Parser, SerialportSender, Commander, RadioERP1 } = Enocean

const internals = {}
internals.schemas = {}
internals.schemas.button = Joi.object({
  index: Joi.number().required(),
})

export class RadioSender {

  constructor ({ path, baudRate } = {}) {
    this.path = path
    this.baudRate = baudRate
  }

  async init () {
    this.port = new SerialPort({ path, baudRate })
    this.sender = SerialportSender({ port: port, parser: new ESP3Parser() })
    const usbStick = new Commander(sender)
    const response = await usbStick.getIdBase()
    this.baseId = parseInt(response.baseId.toString(), 16)
  }

  async stop () {
    await new Promise((resolve, reject) => this.port.close((err) => err ? reject(err) : resolve()))
  }

  async toggle (buttonCfg) {
    Joi.assert(buttonCfg, internals.schemas.button)
    const btn = RadioERP1.from({ rorg: 'f6', payload: [0], id: baseId + buttonCfg.index })
    btn.payload = btn.encode({ R1: 0, EB: 1 }, { eep: 'f6-02-01', status: 0x30 })
    await this.sender.send(btn.toString())
  }
}