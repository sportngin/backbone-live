// LiveCollection Mixin for use with Pusher

'use-strict'

module.exports = function() {

  return {

    live: function(options) {
      this.opts = options
      var collection = this

      options = options || {}

      // Set Options
      this.addOnUpdate = options.addOnUpdate
      this.filtered = options.filtered
      this.eventType = options.eventType
      this.pusher = options.pusher
      this.pusherChannel = options.pusherChannel
      this.channelName = options.channelName
      this.timeStamp = options.timeStamp

      // Create channel
      setLogging(options.log)
      this.pusherChannel = createChannel(this.pusher, this.pusherChannel, this.channelName)
      if (!this.pusherChannel) return

      // Bind message events
      bindChannel(collection, this.pusherChannel, this.eventType)

      this.isLive = true
      return this.pusherChannel
    },

    die: function() {
      this.isLive = false
      if (this.pusherChannel) {
        this.pusherChannel.unbind("update_" + this.eventType)
      }
      return this.pusherChannel
    },

    killAll: function() {
      var c = this.die()
      this.pusher.unsubscribe(this.channelName)
      return c
    },

    isLive: function() {
      return this.isLive
    },

    liveUpdate: function(model){
      var collectionModel = this.get(model.id)
      if (!outdatedUpdate(this.timeStamp, collectionModel, model)) {
        collectionModel.set(model)
        collectionModel.trigger('live:update', model, this)
      }
    },

    liveParse: function(model){
      return model
    }

  }
}

function handler(method, pushObj) {
  var model = JSON.parse(pushObj.message)
  model = this.liveParse(model)

  switch(method){
    case 'update' : return (this.opts.update || this.liveUpdate).call(this, model)
  }
}

function bindChannel(collection, channel, eventType) {
  channel.bind("update_" + eventType, handler.bind(collection, 'update'))
}

function setLogging(log) {
  if (log) {
    Pusher.log = function(message) {
      if (window.console && window.console.log) window.console.log(message)
    }
  }
}

function createChannel(pusher, pusherChannel, channelName) {
  if (!pusherChannel) {
    pusherChannel = pusher.subscribe(channelName)
  }

  return pusherChannel
}

function outdatedUpdate(timeStamp, collectionModel, model){
  return (timeStamp && (collectionModel.attributes[timeStamp] >= model[timeStamp]))
}

