import Confidence from '@hapipal/confidence'

import 'dotenv/config'

const actuators = [
  {
    index: '00000001',
    label: 'cuisine',
    usbCfg: {
      buttonAddress: '00001001',
      buttonKey: '70000000'
    },
    radioCfg: {
      index: 1
    }
  },
  {
    index: '00000002',
    label: 'hotte',
    usbCfg: {
      buttonAddress: '00001002',
      buttonKey: '50000000'
    },
    radioCfg: {
      index: 2
    }
  },
  {
    index: '00000003',
    label: 'salon',
    usbCfg: {
      buttonAddress: '00001003',
      buttonKey: '30000000'
    },
    radioCfg: {
      index: 3
    }
  },
  {
    index: '00000004',
    label: 'salle_a_manger',
    usbCfg: {
      buttonAddress: '00001004',
      buttonKey: '10000000'
    },
    radioCfg: {
      index: 4
    }
  },
  {
    index: '00000005',
    label: 'evier',
    usbCfg: {
      buttonAddress: '00001005',
      buttonKey: '70000000'
    },
    radioCfg: {
      index: 5
    }
  },
  {
    index: '00000006',
    label: 'porte_entree',
    usbCfg: {
      buttonAddress: '00001006',
      buttonKey: '70000000'
    },
    radioCfg: {
      index: 6
    }
  },
  {
    index: '00000007',
    label: 'hall_bas',
    usbCfg: {
      buttonAddress: '00001007',
      buttonKey: '70000000'
    },
    radioCfg: {
      index: 7
    }
  },
  {
    index: '00000008',
    label: 'wc',
    usbCfg: {
      buttonAddress: '00001008',
      buttonKey: '70000000'
    },
    radio: {
      index: 8
    }
  },
  {
    index: '00000009',
    label: 'bureau',
    usbCfg: {
      buttonAddress: '00001009',
      buttonKey: '70000000'
    },
    radioCfg: {
      index: 9
    }
  },
  {
    index: '0000000a',
    label: '_',
    usbCfg: {
      buttonAddress: '00001010',
      buttonKey: '70000000'
    },
    radioCfg: {
      index: 10
    }
  },
  {
    index: '0000000b',
    label: 'hall_haut',
    usbCfg: {
      buttonAddress: '00001011',
      buttonKey: '70000000'
    },
    radioCfg: {
      index: 11
    }
  },
  {
    index: '0000000c',
    label: 'chambre_amis',
    usbCfg: {
      buttonAddress: '00001012',
      buttonKey: '70000000'
    },
    radioCfg: {
      index: 12
    }
  },
  {
    index: '0000000d',
    label: 'garage',
    usbCfg: {
      buttonAddress: '00001013',
      buttonKey: '30000000'
    },
    radioCfg: {
      index: 13
    }
  },
  {
    index: '0000000e',
    label: 'local_technique',
    usbCfg: {
      buttonAddress: '00001014',
      buttonKey: '10000000'
    },
    radioCfg: {
      index: 14
    }
  },
  {
    index: '0000000f',
    label: 'chambre',
    usbCfg: {
      buttonAddress: '00001015',
      buttonKey: '70000000'
    },
    radioCfg: {
      index: 15
    }
  },
  {
    index: '00000010',
    label: 'salle_de_bain',
    usbCfg: {
      buttonAddress: '00001016',
      buttonKey: '50000000'
    },
    radioCfg: {
      index: 16
    }
  }
]

export default async function () {
  return new Confidence.Store({
    server: {
      address: {
        $env: 'ELTAKO_BIND_ADDRESS',
        $default: '0.0.0.0'
      },
      port: {
        $env: 'ELTAKO_PORT',
        $default: 8080
      },
      debug: {
        request: ['error', 'uncaught']
      }
    },
    register: {
      plugins: [
        {
          plugin: '@hapi/inert'
        },
        {
          plugin: '@hapi/vision'
        },
        {
          plugin: 'hapi-swagger'
        },
        {
          plugin: 'blipp'
        },
        {
          plugin: 'laabr',
          options: {
            handleUncaught: true,
            formats: {
              onPostStart: '[:time[iso]][:level] :message at: :host[uri]',
              onPostStop: '[:time[iso]][:level] :message at: :host[uri]',
              request: '[:time[iso]][:level] :message [:requestId]',
              response: '[:time[iso]] :method :remoteAddress :url :status :payload (:responseTime ms) [:requestId]',
              log: '[:time[iso]][:level] :message :tags',
              uncaught: '{ error::error, timestamp::time, level::level, environment::environment, stack::error[stack] }',
              'request-error': '{ error::error, timestamp::time, level::level, environment::environment, stack::error[stack] }'
            }
          }
        },
        {
          plugin: await import('./src/eltako/index.js'),
          options: {
            usb: {
              tty: {
                $env: 'ELTAKO_USB_TTY_PATH',
                $default: '/dev/serial/by-id/usb-FTDI_FT232R_USB_UART_AB73IPJ7-if00-port0'
              },
              baudRate: {
                $env: 'ELTAKO_USB_TTY_BAUD_RATE',
                $default: 57600,
                $coerce: 'number'
              }
            },
            radio: {
              tty: {
                $env: 'ELTAKO_RADIO_TTY_PATH',
                $default: '/dev/serial/by-id/usb-EnOcean_GmbH_USB_300_DE_EO76BRGH-if00-port0'
              },
              baudRate: {
                $env: 'ELTAKO_RADIO_TTY_BAUD_RATE',
                $default: 57600,
                $coerce: 'number'
              }
            },
            actuators: {
              $env: 'ELTAKO_ACTUATORS',
              $default: actuators,
              $coerce: 'object'
            },
            mqttUrl: {
              $env: 'ELTAKO_MQTT_URL',
              $default: 'mqtt://localhost:1883'
            }
          }
        }
      ]
    }
  })
}
