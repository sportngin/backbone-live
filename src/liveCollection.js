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
        this.pusherChannel.unbind("add_" + this.eventType)
        this.pusherChannel.unbind("remove_" + this.eventType)
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

    liveAdd: function(model) {
      model = this.liveFilter(model)
      if (!this.get(model.id)) {
        this.add(model).trigger('live:add', model, this)
      }
    },

    liveUpdate: function(model){
      var collectionModel = this.get(model.id)
      if (!collectionModel) {
        this.liveAdd(model)
      } else if (!outdatedUpdate(this.timeStamp, collectionModel, model)) {
        collectionModel.set(model)
        collectionModel.trigger('live:update', model, this)
      }
    },

    liveRemove: function(model){
      this.remove(model).trigger('live:remove', model, this)
    },

    liveReset: function(model){
      this.reset(model).trigger('live:reset', model, this)
    },

    liveParse: function(model){
      return model
    },

    liveFilter: function(model){
      return model
    }

  }
}

function handler(method, pushObj) {
  var model = JSON.parse(pushObj.message)
  model = this.liveParse(model)

  switch(method){
    case 'add' : return (this.opts.add || this.liveAdd).call(this, model)
    case 'update' : return (this.opts.update || this.liveUpdate).call(this, model)
    case 'remove' : return (this.opts.remove || this.liveRemove).call(this, model)
    case 'reset' : return (this.opts.add || this.liveReset).call(this, model)
  }
}

function bindChannel(collection, channel, eventType) {
  channel.bind("add_" + eventType, handler.bind(collection, 'add'))
  channel.bind("remove_" + eventType, handler.bind(collection, 'remove'))
  channel.bind("update_" + eventType, handler.bind(collection, 'update'))
  channel.bind("reset_" + eventType, handler.bind(collection, 'reset'))
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

