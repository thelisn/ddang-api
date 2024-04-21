const path = require('path')
require('dotenv').config({ path: path.join(__dirname, './.env') })

const express = require('express')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const corsConfig = require('./config/cors')
let indexRouter = require('./routes/index')

let app = express()
app.use(cors(corsConfig))

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser('lisn'))

app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: 'lisn',
  cookie: {
    httpOnly: true
  }
}))


app.use('/api', indexRouter)

app.use(function(req, res) {
  res.status(404)
  res.json({
    success: false,
    message: 'error'
  })
})

/*
database
 */
const db = require('./models')

db.sequelize
  .sync()
  .then(() => {
    console.log('DB 연결 성공하셨습니다.')
  })
  .catch(err => console.log(err))


/*
socket
 */
const socketController = require('./socket/index')

app.io = require('socket.io')()

app.io.on('connection', (socket) => {
  socket.on('login', (data) => {
    socketController.login(socket, data);
  });

  socket.on('join-quiz', (data) => {
    socketController.joinQuiz(socket, data);
  });

  socket.on('start-quiz', (data) => {
    socketController.startQuiz(socket, data);
  });

  socket.on('select-answer', (data) => {
    socketController.selectAnswer(socket, data);
  });

  socket.on('show-answer', (data) => {
    socketController.showAnswer(socket, data);
  });

  socket.on('check-answer', (data) => {
    socketController.checkAnswer(socket, data);
  });

  socket.on('rejoin', (data) => {
    socketController.rejoin(socket, data);
  });

  socket.on('revive', (data) => {
    socketController.revive(socket, data);
  });
  
  socket.on('test', (data) => {
    socketController.testSocket(socket, data);
  });

  socket.on('update-current-user', (data) => {
    socketController.updateCurrentUser(socket, data);
  });

})

module.exports = app