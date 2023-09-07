const app = require('express')()
const server = require('http').createServer(app)
const cors = require('cors');
const io = require('socket.io')(server)
const console = require('console')
const axios = require('axios')
const PORT = process.env.PORT || 8001;
const INDEX = '/index.html';


app.use(cors())
app.get('/', (req, res) => {
  res.write(`<h1>Socket IO start on Port: ${PORT}</h1>`)
  res.end()
})


//Todo:
connections = []
var rooms = []
var roomsBusfahrer = []
var randomDeck = []
let allWerbinich = []
let usedWerbinich = []

io.on("connection", socket => {
  connections.push(socket)
  console.log('Client connected')
  console.log('Connect: %s sockets are connected', connections.length)
  socket.emit('deineId', socket.id)
  socket.emit('connected')
  socket.on("usernameWerbinIch", (data) => {
    socket.emit("werbinIchUsername", data)
  })

  socket.on("usernameBusfahrer", (data) => {
    /*if ('roomId' in data) {
      var i = undefined
      var j = undefined
      const currentRoomId = (element) => element.roomId.valueOf() === data.roomId.valueOf()
      const currentUser = (element) => element.name === data.nameBusfahrerOld
      i = roomsBusfahrer.findIndex(currentRoomId)
      if (roomsBusfahrer[i].spieler.length > 0) {
        j = roomsBusfahrer[i].spieler.findIndex(currentUser)
        if (j !== undefined) {
          roomsBusfahrer[i].spieler[j].name = data.nameBusfahrerNew
          socket.emit("busfahrerUsername", roomsBusfahrer[i].spieler[j].name)
          io.to(data.roomId).emit("roomBusfahrer", roomsBusfahrer[i])
        }
      }
    }
    else {
      socket.emit("busfahrerUsername", data.nameBusfahrer)
    }*/
    socket.emit("busfahrerUsername", data)
  })

  socket.on("createRoom", (data) => {
    var roomId = ""
    const currentRoomId = (element) => element.roomId.valueOf() === roomId.valueOf()
    do {
      roomId = randomGenerator(5)
    } while (rooms.findIndex(currentRoomId) != -1)

    const room = {
      "roomId": roomId,
      "spieler": []
    }
    const user = {
      "id": socket.id,
      "username": data.name,
      "werbinich": {id: -1, text: "", info:""}
    }
    var i = undefined
    if (roomId !== undefined) {
      //const currentRoomId = (element) => element.roomId.valueOf() === roomId.valueOf()
      rooms.push(room)
      i = rooms.findIndex(currentRoomId)
      rooms[i].spieler.push(user)
      socket.join(roomId)
      io.to(roomId).emit("room", rooms[i])
    }
  })

  socket.on("createRoomBusfahrer", (data) => {
    var roomId = ""
    const currentRoomId = (element) => element.roomId.valueOf() === roomId.valueOf()
    do {
      roomId = randomGenerator(5)
    } while (roomsBusfahrer.findIndex(currentRoomId) != -1)

    const roomBusfahrer = {
      roomId: roomId,
      deck: [],
      spieler: [],
      phase: 0
    }
    const einSpieler = {
      id: socket.id,
      name: data,
      karten: [],
      flipArray: [false, false, false]
    }

    var i = undefined
    if (roomId !== undefined) {
      //const currentRoomId = (element) => element.roomId.valueOf() === roomId.valueOf()
      roomsBusfahrer.push(roomBusfahrer)
      i = roomsBusfahrer.findIndex(currentRoomId)
      roomsBusfahrer[i].spieler.push(einSpieler)
      roomsBusfahrer[i].phase = 1
      socket.join(roomId)
      io.to(roomId).emit("roomBusfahrer", roomsBusfahrer[i])
    }
  })

  socket.on('joinRoom', (data) => {
    const user = {
      id: socket.id,
      username: data.name,
      werbinich: {id: -1, text: "", info:""}
    }

    var i = undefined
    var j = undefined
    const currentRoomId = (element) => element.roomId.valueOf() === data.roomId.valueOf()
    const currentUser = (element) => element.name === data.name
    i = rooms.findIndex(currentRoomId)

    if (i === -1) {
      socket.emit('keinRaumGefunden')
    }
    else {
      if (rooms[i].spieler.length > 0) {
        j = rooms[i].spieler.findIndex(currentUser)
      }
      if (rooms[i].spieler.length === 10) {
        socket.emit('roomFull')
      }
      if (j !== -1) {
        socket.emit('nameBesetzt')
      }
      else {
        rooms[i].spieler.push(user)
        socket.join(data.roomId)
        socket.emit('closeModal')
        io.to(data.roomId).emit("room", rooms[i])
      }
    }
  })

  socket.on('joinRoomBusfahrer', (data) => {
    const user = {
      id: socket.id,
      name: data.name,
      karten: [],
      flipArray: [false, false, false]
    }

    var i = undefined
    var j = undefined
    const currentRoomId = (element) => element.roomId.valueOf() === data.roomId.valueOf()
    const currentUser = (element) => element.name === data.name
    i = roomsBusfahrer.findIndex(currentRoomId)

    if (i === -1) {
      io.to(socket.id).emit('keinRaumGefundenBusfahrer')
    }
    else {
      if (roomsBusfahrer[i].spieler.length > 0) {
        j = roomsBusfahrer[i].spieler.findIndex(currentUser)
      }
      if (roomsBusfahrer[i].spieler.length === 10) {
        io.to(socket.id).emit('roomFullBusfahrer')
        return
      }
      if (j !== -1) {
        io.to(socket.id).emit('nameBesetztBusfahrer')
        return
      }
      if (roomsBusfahrer[i].phase > 1) {
        io.to(socket.id).emit('spielLaeuft')
        return
      }
      else {
        roomsBusfahrer[i].spieler.push(user)
        roomsBusfahrer[i].phase = 1
        socket.join(data.roomId)
        io.to(socket.id).emit('closeModal')
        io.to(data.roomId).emit("roomBusfahrer", roomsBusfahrer[i])
      }
    }
  })

  socket.on('zuweisen', (data) => {
    var i = undefined
    const currentRoomId = (element) => element.roomId.valueOf() === data.roomId.valueOf()
    i = rooms.findIndex(currentRoomId)
    allWerbinich = shuffleArray(allWerbinich)
    allWerbinich = allWerbinich.filter(element => !usedWerbinich.includes(element))
    if (usedWerbinich.length >= allWerbinich.length - 10) {
      usedWerbinich = []
    }
    for (let j = 0; j < rooms[i].spieler.length; j++) {
      rooms[i].spieler[j].werbinich = allWerbinich[j]
      usedWerbinich.push(allWerbinich[j])
    }
    io.to(data.roomId).emit("room", rooms[i])
  })

  socket.on('auswaehlen', (data) => {
    if (data.roomId === undefined) return
    var i = undefined
    const currentRoomId = (element) => element.roomId.valueOf() === data.roomId.valueOf()
    let speicherNamenFuer = []
    i = rooms.findIndex(currentRoomId)
    checker(rooms[i].spieler, speicherNamenFuer)
    for (let j = 0; j < rooms[i].spieler.length; j++) {
      io.to(rooms[i].spieler[j].id).emit("speicherNamenFuer", speicherNamenFuer[j])
    }
  })

  socket.on('namenSpeichern', (data) => {
    var i = undefined
    var j = undefined
    const currentRoomId = (element) => element.roomId.valueOf() === data.roomId.valueOf()
    const currentUser = (element) => element.name === data.name
    i = rooms.findIndex(currentRoomId)
    const werbinich = {
      id: 0,
      text: data.werbinich,
      info: ""
    }
    if (i !== undefined) {
      j = rooms[i].spieler.findIndex(currentUser)
    }
    if (j > -1) {
      rooms[i].spieler[j].werbinich = werbinich
    }
    io.to(data.roomId).emit("room", rooms[i])
  })

  socket.on('austeilen', (data) => {
    socket.broadcast.to(data.roomId).emit('loading');
    var i = undefined
    const currentRoomId = (element) => element.roomId.valueOf() === data.roomId.valueOf()
    i = roomsBusfahrer.findIndex(currentRoomId)
    roomsBusfahrer[i].roomId = data.roomId
    roomsBusfahrer[i].deck = JSON.parse(data.deck)
    roomsBusfahrer[i].phase = 2
    roomsBusfahrer[i].spieler.map(e => e.karten = [])
    roomsBusfahrer[i].spieler.map(e => e.flipArray = [true, true, true]) 
    for (let j = 0; j < roomsBusfahrer[i].spieler.length; j++) {
      if (roomsBusfahrer[i].spieler[j].karten.length < 3) {
        for (let k = 0; k < 3; k++) {
          roomsBusfahrer[i].spieler[j].karten.push(j * 3 + k + 15)
        }
      }
      
      io.to(roomsBusfahrer[i].spieler[j].id).emit("meineKarten", roomsBusfahrer[i].spieler[j].karten)
    }
    io.to(data.roomId).emit("roomBusfahrer", roomsBusfahrer[i])
  })

  socket.on("karteDrehen", (data) => {
    var i = undefined
    const currentRoomId = (element) => element.roomId.valueOf() === data.roomId.valueOf()
    i = roomsBusfahrer.findIndex(currentRoomId)
    /*for (let j = 0; j < roomsBusfahrer[i].spieler.length; j++) {
      var result = roomsBusfahrer[i].spieler[j].karten.map((e, index) => roomsBusfahrer[i].deck[e].value === roomsBusfahrer[i].deck[data.index].value ? index : '').filter(Number.isInteger)
      if (result.length > 0) {
        for (let k = 0; k < result.length; k++) {
          roomsBusfahrer[i].spieler[j].flipArray[result[k]] = false
        }
      }
    }*/
    io.to(data.roomId).emit("gedrehteKarte", data)
  })

  socket.on("busfahren", (data) => {
    var i = undefined
    const currentRoomId = (element) => element.roomId.valueOf() === data.roomId.valueOf()
    i = roomsBusfahrer.findIndex(currentRoomId)
    var name = ""
    var cardsLeft = []
    for (let j = 0; j < roomsBusfahrer[i].spieler.length; j++) {
      var result = roomsBusfahrer[i].spieler[j].flipArray.filter((e) => e === true).length
      cardsLeft.push(result)
    }
    var maxValue = Math.max(...cardsLeft)
    var maxValueIndexes = []
    if (maxValue > 0) {
      for (let k = 0; k < cardsLeft.length; k++) {
        if (cardsLeft[k] === maxValue) {
          maxValueIndexes.push(k)
        }
      }
    }
    else {
      name = roomsBusfahrer[i].spieler[Math.floor((Math.random() * roomsBusfahrer[i].spieler.length))].name
    }

    if (maxValueIndexes.length === 1) {
      name = roomsBusfahrer[i].spieler[maxValueIndexes[0]].name
    }
    else {
      var cardsLeftValue = []
      for (let l = 0; l < maxValueIndexes.length; l++) {
        var user = {
          name: "",
          cardsValue: 0
        }
        user.name = roomsBusfahrer[i].spieler[maxValueIndexes[l]].name
        cardsLeftValue.push(user)
        for (let m = 0; m < 3; m++) {
          if (roomsBusfahrer[i].spieler[maxValueIndexes[l]].flipArray[m] === false) {
            cardsLeftValue[l].cardsValue = cardsLeftValue[l].cardsValue + roomsBusfahrer[i].deck[roomsBusfahrer[i].spieler[maxValueIndexes[l]].karten[m]].value
          }
        }
      }
      var maxCardValue = Math.max(...cardsLeftValue.map(e => e.cardsValue))
      var busfahrer = cardsLeftValue.filter(e => e.cardsValue === maxCardValue)
      if (busfahrer.length === 1) {
        name = busfahrer[0].name
      }
      else if (busfahrer.length > 1) {
        name = busfahrer[Math.floor((Math.random() * busfahrer.length))].name
      }
    }
    io.to(data.roomId).emit("busfahrerBestimmen", name)
  })

  socket.on("zumStart", (data) => {
    var i = undefined
    const currentRoomId = (element) => element.roomId.valueOf() === data.roomId.valueOf()
    i = roomsBusfahrer.findIndex(currentRoomId)
    roomsBusfahrer[i].phase = 1
    io.to(data.roomId).emit("roomBusfahrer", roomsBusfahrer[i])
  })

  socket.on("leave", (data) => {
    var i = undefined
    const currentRoomId = (element) => element.roomId.valueOf() === data.roomId.valueOf()
    i = rooms.findIndex(currentRoomId)
    rooms[i] = data
    socket.leave(data.roomId)
    io.to(data.roomId).emit("room", rooms[i])
  })

  socket.on("leaveBusfahrer", (data) => {
    var i = undefined
    const currentRoomId = (element) => element.roomId.valueOf() === data.roomId.valueOf()
    i = roomsBusfahrer.findIndex(currentRoomId)
    roomsBusfahrer[i].spieler = roomsBusfahrer[i].spieler.filter(user => user.id !== data.spielerId)
    socket.leave(data.roomId)
    for (index in roomsBusfahrer[i].spieler) {
      io.to(roomsBusfahrer[i].spieler[index].id).emit("roomBusfahrerAfterLeave", roomsBusfahrer[i].spieler)
    }
    //io.to(data.roomId).emit("roomBusfahrer", roomsBusfahrer[i])
  })

  socket.on("left", (data) => {
    io.to(data.roomId).emit("left", data)
  })

  socket.on("leftBusfahrer", (data) => {
    io.to(data.roomId).emit("leftBusfahrer", data)
  })

  socket.on("disconnect", () => {
    let data = isItemInArray(rooms, socket.id)
    let dataBusfahrer = isItemInArray(roomsBusfahrer, socket.id)
    var i = undefined
    var j = undefined

    if (rooms.length > 0 && data !== undefined) {
      if (data.roomId !== undefined) {
        const currentRoomId = (element) => element.roomId.valueOf() === data.roomId.valueOf()
        i = rooms.findIndex(currentRoomId)
      }
    }

    if (roomsBusfahrer.length > 0 && data !== undefined) {
      if (dataBusfahrer.roomId !== undefined) {
        const currentRoomId = (element) => element.roomId.valueOf() === dataBusfahrer.roomId.valueOf()
        j = roomsBusfahrer.findIndex(currentRoomId)
      }
    }

    if (i !== undefined && i >= 0) {
      rooms[i].spieler = rooms[i].spieler.filter(user => user.id !== socket.id)
      if (rooms[i].spieler.length === 0) {
        rooms = rooms.filter(room => room.roomId !== rooms[i].roomId)
      }
    }

    if (j !== undefined && j >= 0) {
      roomsBusfahrer[j].spieler = roomsBusfahrer[j].spieler.filter(user => user.id !== socket.id)
      if (roomsBusfahrer[j].spieler.length === 0) {
        roomsBusfahrer = roomsBusfahrer.filter(room => room.roomId !== roomsBusfahrer[j].roomId)
      }
    }

    if (i !== undefined) {
      socket.leave(data.roomId)
      io.to(data.roomId).emit("room", rooms[i])
    }

    if (j !== undefined) {
      socket.leave(dataBusfahrer.roomId)
      io.to(dataBusfahrer.roomId).emit("roomBusfahrer", roomsBusfahrer[i])
    }
    
    console.log('Client disconnected '+ socket.id)
    connections.splice(connections.indexOf(socket), 1)
    console.log('Disconnet: %s sockets are connected', connections.length)

  })
})

const randomGenerator = (length) => {
  var result           = ''
  var characters       = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'
  var charactersLength = characters.length
  for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

const randomGeneratorTest = (length) => {
  var result           = ''
  var characters       = 'AB'
  var charactersLength = characters.length
  for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

const loadWerbinich = () => {
  axios.get(`https://trinkspielplatz.herokuapp.com/trinkspiele/werbinich/`)
    .then((response) => storeWerbinich(response.data))
    .catch((error) => console.log(error))
}

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array
}

const storeWerbinich = (data) => {
  allWerbinich = data
}

const isItemInArray = (array, item) => {
  let data = {
    itemInArray: undefined,
    roomId: undefined,
    x: undefined,
    y: undefined
  }
  if (array.length > 0) {
    for (let i = 0; i < array.length; i++) {
      for (let j = 0; j < array[i].spieler.length; j++) {
        if (array[i].spieler[j].id.valueOf() === item.valueOf()) {
          data.itemInArray = true
          data.roomId = array[i].roomId
          data.x = i
          data.y = j
          return data
        }
      }
    }
  }

  data.itemInArray = false
  return data
}

const nameSpeicherer = (array, speicherNamenFuer) => {
  for (let i = 0; i < array.length; i++) {
    speicherNamenFuer.push(i);
  }
  for (let k = speicherNamenFuer.length - 1; k > 0; k--) {
    let j = Math.floor(Math.random() * (k + 1));
    const temp = speicherNamenFuer[k];
    speicherNamenFuer[k] = speicherNamenFuer[j];
    speicherNamenFuer[j] = temp;
  }
};

const checkIndex = (array) => {
  let temp = [];
  for (let i = 0; i < array.length; i++) {
    temp.push(i);
  }
  for (let i = 0; i < array.length; i++) {
    if (array[i] === temp[i]) {
      array.splice(0, array.length);
      return false;
    }
  }
  return true;
};

const checker = (roomUsers, speicherNamenFuer) => {
  do {
    nameSpeicherer(roomUsers, speicherNamenFuer)
  }
  while (!checkIndex(speicherNamenFuer))
};

server.listen(PORT, () => {
  console.log('Server listening on port ' + PORT)
  loadWerbinich()
})

//to start on produciton -> heroku run npm start