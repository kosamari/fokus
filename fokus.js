// DOM ELEMENTS
var $input = document.getElementById('input')
var $canvas = document.getElementById('canvas')
var $run = document.getElementById('run')
var $canvasRef = document.getElementById('canvas-ref')
var $level = document.getElementById('level')
var $blur = document.getElementById('blur')
var $file = document.getElementById('file')
var $download = document.getElementById('download')
var $a = document.getElementById('a')

// Canvas Contexts
var ctx = $canvas.getContext('2d')
var ctxRef = $canvasRef.getContext('2d')

// Objects
var worker = new Worker('fokusworker.js')
var reader = new FileReader()
var image = new Image()

// File
var filename
var imageFile
var edited = false

// File Input Event - start of the process !
$input.addEventListener('change', function () {
  reader.readAsDataURL(this.files[0])
  filename = this.files[0].name.split('.')[0]
  updateRunBtn()

  reader.onload = function () {
    // Create new Image in memory for canvas to use
    image.src = reader.result
    image.onload = function () {
      $canvas.width = image.width
      $canvas.height = image.height
      ctx.drawImage(image, 0, 0)

      $canvasRef.width = image.width
      $canvasRef.height = image.height
      ctxRef.drawImage(image, 0, 0)

      updateRunBtn()
      startApp()
    }
  }
}, false)

function startApp () {
  var ready = true
  var startFlag = false
  var startX, startY, rectWidth, rectHeight

  // Event handlers
  $canvas.addEventListener('click', function (e) {
    drawGuide(e.clientX, e.clientY)
    startFlag = !startFlag
  }, false)

  $run.addEventListener('click', function (e) {
    if (startX && startY && rectWidth && rectHeight) {
      // set to false so that click on canvas won't trigger drawGuide
      ready = false
      processImage($level.value, $blur.checked)
    }
  }, false)

  $level.oninput = function () {
    updateRunBtn(true)
  }

  $blur.onchange = function () {
    updateRunBtn(true)
  }

  $download.addEventListener('click', function (e) {
    // Create Download Link
    $canvas.toBlob(function (blob) {
      // Check if image file was made previously & remove
      if (imageFile !== null) {
        window.URL.revokeObjectURL(imageFile)
      }
      imageFile = window.URL.createObjectURL(blob)
      $a.download = filename + '.' + $file.value.split('/')[1]
      $a.href = imageFile
      $a.click()
    }, $file.value)
  })

  function processImage (level, blur) {
    // Entire image to be processed
    var wholeimage = ctxRef.getImageData(0, 0, $canvas.width, $canvas.height)

    // Part if the Image to be "focused"
    var parcial = ctxRef.getImageData(startX, startY, rectWidth, rectHeight)

    var data = {img: wholeimage, level: level, blur: blur}
    worker.postMessage(data, [data.img.data.buffer])
    worker.onmessage = function (message) {
      var newimg = message.data
      ctx.putImageData(new ImageData(newimg.data, newimg.width, newimg.height), 0, 0)
      ctx.putImageData(parcial, startX, startY)

      // set the flag back on
      edited = true
      ready = true
      updateRunBtn()
    }
  }

  function drawGuide (xpos, ypos) {
    // Only draw guide rectangle when Web Worker is not running
    if (ready) {
      var rect = $canvas.getBoundingClientRect()
      var x = xpos - rect.left
      var y = ypos - rect.top

      // 1st click
      if (!startFlag) {
        startX = x
        startY = y
        edited = false
        clearRect(ctx)
        ctx.drawImage(image, 0, 0)
        appendCircle(ctx, x, y)
        updateRunBtn()
        return
      }

      // 2nd click
      rectWidth = x - startX
      rectHeight = y - startY
      if (x < startX) {
        rectWidth = startX - x
        startX = x
      }
      if (y < startY) {
        rectHeight = startY - y
        startY = y
      }
      appendCircle(ctx, x, y)
      appendRect(ctx, startX, startY, rectWidth, rectHeight)
      return
    }
    return
  }
}

// Canvas Manipulation Functions
function clearRect (ctx) {
  ctx.clearRect(0, 0, $canvas.width, $canvas.height)
}

function appendCircle (ctx, x, y) {
  ctx.beginPath()
  ctx.arc(x, y, 3, 0, 2 * Math.PI, false)
  ctx.fillStyle = '#888'
  ctx.fill()
}

function appendRect (ctx, x, y, w, h) {
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, w, h)
}

// UTILITIS
function updateRunBtn (rebuild) {
  if (rebuild && edited) {
    $run.textContent = 'Rebuild Image'
    $run.style.backgroundColor = '#00549B'

    return
  }
  $run.textContent = 'Process Image'
  $run.style.backgroundColor = '#00245B'
}

// toBlob Polyfill
if (!HTMLCanvasElement.prototype.toBlob) {
 Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  value: function (callback, type, quality) {

    var binStr = atob(this.toDataURL(type, quality).split(',')[1])
    var len = binStr.length
    var arr = new Uint8Array(len)

    for (var i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i)
    }

    callback(new Blob( [arr], {type: type || 'image/png'}))
  }
 })
}
