import Boom from '@hapi/boom'

server.route({
  path: '/publish-home-assistant',
  method: 'POST',
  async handler (request, h) {
    await provisionHomeAssistant()
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