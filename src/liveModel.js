// LiveCollection Mixin for use with Pusher

'use-strict'

module.exports = function() {

  return {
    live: function(options) {
      options = options || {}
      this.liveOpts = options
      var collection = this
      var liveOpts = this.liveOpts

      // Create channel
      setLogging(liveOpts.log)
      this.pusherChannel = createChannel(liveOpts.pusher, liveOpts.pusherChannel, liveOpts.channelName)
      liveOpts.pusherChannel = this.pusherChannel
      if (!this.pusherChannel) return

      // Bind message events
      bindChannel(collection, this.pusherChannel, liveOpts.eventType)

      this.isLive = true
      return this.pusherChannel
    },

    die: function() {
      this.isLive = false
      var liveOpts = this.liveOpts
      if (this.pusherChannel) {
        this.pusherChannel.unbind("update_" + liveOpts.eventType)
      }
      return this.pusherChannel
    },

    killAll: function() {
      var c = this.die()
      this.pusher.unsubscribe(this.liveOpts.channelName)
      return c
    },

    isLive: function() {
      return this.isLive
    },

    liveUpdate: function(model){
      var collectionModel = this.get(model.id)
      if (!collectionModel) {
        this.liveAdd(model)
      } else if (!outdatedUpdate(this.timeStamp, collectionModel, model)) {
        collectionModel.set(model, {silent: this.liveOpts.silent})
        collectionModel.trigger('live:update', collectionModel, this)
      }
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
  if (this.liveOpts.syncedOnly && !pushObj.synced) return
  var model = JSON.parse(pushObj.message)
  model = this.liveParse(model)

  switch(method){
    case 'update' : return (this.liveOpts.update || this.liveUpdate).call(this, model)
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

