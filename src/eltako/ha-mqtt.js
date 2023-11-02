import EventEmitter from 'node:events'
import Mqtt from 'mqtt'

export const HA_ONLINE = 'hamqtt.ha-online'
export const STATE_CHANGE_REQUEST = 'hamqtt.state-change-request'

export class HaMqtt extends EventEmitter {
  constructor (mqttUrl) {
    super()
    this.mqttUrl = mqttUrl
  }

  async init () {
    this.mqttClient = await Mqtt.connectAsync(this.mqttUrl)
    this.mqttClient.on('message', async (topic, message) => {
      console.log(topic, message.toString('utf-8'))

      const payload = message.toString('utf-8')
      if (topic === 'homeassistant/status') {
        if (payload === 'online') {
          this.emit(HA_ONLINE)
        }
        return
      }

      const [, label] = topic.split('/')
      this.emit(STATE_CHANGE_REQUEST, { label, state: payload === '1' })
    })
  }

  async stop () {
    await this.mqttClient.endAsync()
  }

  async publish (actuator) {
    await this.mqttClient.publishAsync(`eltako/${actuator.label}/get`, actuator.state ? '1' : '0')
  }

  async publishAll (actuators) {
    for (const actuator of actuators) {
      await this.publish(actuator)
    }
  }

  async subscribe (actuator) {
    await this.mqttClient.subscribeAsync(`eltako/${actuator.label}/set`)
  }

  async subscribeAll (actuators) {
    for (const actuator of actuators) {
      await this.subscribe(actuator)
    }
  }

  async provision (actuators) {
    for (const actuator of actuators) {
      await this.mqttClient.publishAsync(`homeassistant/switch/${actuator.label}/config`, JSON.stringify(actuator.haConfig()))
    }
  }
}
