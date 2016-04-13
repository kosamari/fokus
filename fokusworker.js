importScripts('./lib/grafi.js')

self.onmessage = function (message) {
  var img = message.data.img
  var processed = grafi.brightness(img, {level: message.data.level})
  if (message.data.blur) {
    processed = grafi.blur(processed)
  }
  self.postMessage(processed, [processed.data.buffer])
}