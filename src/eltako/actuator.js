import EventEmitter from 'node:events'

/**
 * {
 *    index: '00000001',
 *    label: 'cuisine',
 *    usbButtonAddress: '00001001',
 *    usbButtonKey: '70000000'
 *    radioButtonAddress: '',
 *  }
 */

export const ACTUATOR_STATE_CHANGE = 'acturator.actuator-state-change'

function capitalize (s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export class Actuator extends EventEmitter {
  #state = false
  constructor (index, label, options) {
    super()
    const { usbSender, usbCfg, radioSender, radioCfg } = options || {}
    this.index = index
    this.label = label
    this.usbSender = usbSender
    this.usbCfg = usbCfg
    this.radioSender = radioSender
    this.radioCfg = radioCfg
  }

  set state (s) {
    if (this.#state !== s) {
      this.#state = s
      this.emit(ACTUATOR_STATE_CHANGE, s)
    }
  }

  get state () {
    return this.#state
  }

  async toggle () {
    if (this.radioSender) {
      this.toggleRadio()
    } else if (this.usbSender) {
      this.toggleUsb()
    } else {
      throw new Error('No senders were configured.')
    }
  }

  async toggleUsb () {
    await this.usbSender?.toggle(this.usbCfg)
  }

  async toggleRadio () {
    await this.radioSender?.toggle(this.radioCfg)
  }

  toJSON () {
    return {
      index: this.index,
      label: this.label,
      state: this.#state,
      usbCfg: this.usbCfg,
      radioCfg: this.radioCfg
    }
  }

  haConfig () {
    return {
      unique_id: this.label,
      name: capitalize(this.label).replaceAll('_', ' '),
      state_topic: `eltako/${this.label}/get`,
      command_topic: `eltako/${this.label}/set`,
      payload_on: '1',
      payload_off: '0',
      state_on: '1',
      state_off: '0',
      optimistic: false,
      qos: 0,
      retain: true
    }
  }
}
