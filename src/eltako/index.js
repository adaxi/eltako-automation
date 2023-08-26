'use strict'

// https://roelofjanelsinga.com/articles/how-to-create-switch-dashboard-home-assistant/
// https://cedalo.com/blog/mosquitto-docker-configuration-ultimate-guide/

import { SerialPort } from 'serialport'
import { DelimiterParser } from '@serialport/parser-delimiter'
import Mqtt from 'mqtt'
import Boom from '@hapi/boom'

const SYNC = Buffer.from([0xA5, 0x5A])

function capitalize (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export const plugin = {
  name: 'eltako',
  version: '1.0.0',
  register: async (server, options) => {
    let outgoingActionQueue = []
    let serialPort
    let mqttClient

    const actuators = structuredClone(options.actuators)

    const handleOutgoingQueue = () => {
      if (outgoingActionQueue.length === 0) {
        return
      }
      const actions = outgoingActionQueue
      outgoingActionQueue = []
      for (const action of actions) {
        serialPort.write(action)
      }
    }

    const handleIncomingPacket = async (packet) => {
      try {
        assertChecksum(packet)
        assertDataPacket(packet)
        const { index, data } = decodePacket(packet)
        const actuator = actuators.find(actuator => actuator.index === index)
        const on = isOn(data)
        if (actuator.on !== on) {
          actuator.on = on
          server.log(['info'], `Actuator ${actuator.index} ${actuator.label.padEnd(20)} => ${on ? 'on ' : 'off'}`)
          if (mqttClient) {
            server.log(['info'], `publishing on: eltako/${actuator.label}/get`)
            await mqttClient.publishAsync(`eltako/${actuator.label}/get`, on ? '1' : '0')
          }
        }
      } catch (err) {
        server.log(['trace', 'incoming-packet'], err.toString())
      }
    }

    const sendAction = (actuator) => {
      if (!actuator.buttonAddress) {
        throw Boom.badImplementation('Actuator not configured: missing buttonAddress.')
      }
      if (!actuator.buttonKey) {
        throw Boom.badImplementation('Actuator not configured: missing buttonKey.')
      }
      const action = buildAction(actuator.buttonAddress, actuator.buttonKey)
      outgoingActionQueue.push(action)
    }

    server.ext([
      {
        type: 'onPostStart',
        method: async () => {
          serialPort = new SerialPort({
            path: options.tty,
            baudRate: options.baudRate
          })

          const parser = serialPort.pipe(new DelimiterParser({ delimiter: SYNC, includeDelimiter: false }))
          parser.on('data', (packet) => {
            handleIncomingPacket(packet)
            handleOutgoingQueue()
          })

          try {
            mqttClient = await Mqtt.connectAsync(options.mqttUrl)

            for (const actuator of actuators) {
              await mqttClient.subscribeAsync(`eltako/${actuator.label}/set`)
            }

            mqttClient.on('message', (topic, message) => {
              console.log(topic, message.toString('utf-8'))
              const payload = message.toString('utf-8')
              const [, label] = topic.split('/')
              const actuator = actuators.find(actuator => actuator.label === label)
              if (actuator) {
                if ((actuator.on && payload === '0') || (!actuator.on && payload === '1')) {
                  sendAction(actuator)
                }
              }
            })
          } catch (err) {
            console.log(err)
            server.log(['error'], `Failed to connect to mqtt broker ${options.mqttUrl}`)
          }
        }
      },
      {
        type: 'onPreStop',
        method: async () => {
          if (serialPort) {
            try {
              await new Promise((resolve, reject) => serialPort.close((err) => err ? reject(err) : resolve()))
            } catch (err) {
              server.log(['error'], 'Failed to close serial port.')
            }
          }
          if (mqttClient) {
            try {
              await mqttClient.endAsync()
            } catch (err) {
              server.log(['error'], 'Failed to mqtt client.')
            }
          }
        }
      }
    ])

    server.route({
      path: '/publish-home-assistant',
      method: 'POST',
      async handler (request, h) {
        for (const actuator of actuators) {
          await mqttClient.publishAsync(`discovery/switch/${actuator.label}`, JSON.stringify({
            unique_id: actuator.label,
            name: capitalize(actuator.label).replaceAll('_', ' '),
            state_topic: `eltako/${actuator.label}/get`,
            command_topic: `eltako/${actuator.label}/set`,
            payload_on: '1',
            payload_off: '0',
            state_on: '1',
            state_off: '0',
            optimistic: false,
            qos: 0,
            retain: true
          }))
        }
        return h.response().code(204)
      }
    })

    server.route({
      path: '/actuators',
      method: 'GET',
      handler (request, h) {
        return actuators
      }
    })

    server.route({
      path: '/actuators/{label}/toggle',
      method: 'POST',
      handler (request, h) {
        const { label } = request.params
        const actuator = actuators.find(actuator => actuator.label === label)
        if (!actuator) {
          throw Boom.notFound('No actuator found at that index')
        }
        sendAction(actuator)
        return h.response().code(204)
      }
    })

    server.route({
      path: '/actuators/{label}/set/{state}',
      method: 'POST',
      handler (request, h) {
        const { label, state } = request.params
        const actuator = actuators.find(actuator => actuator.label === label)
        if (!actuator) {
          throw Boom.notFound('No actuator found at that index')
        }
        if ((actuator.on && state === '0') || (!actuator.on && state === '1')) {
          sendAction(actuator)
        }
        return h.response().code(204)
      }
    })
  }
}

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

const isOn = (data) => {
  return (data || '00').slice(0, 2) === '70'
}
