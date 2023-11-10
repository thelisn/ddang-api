const express = require('express')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const corsConfig = require('./config/cors')
let indexRouter = require('./routes/index')
const db = require('./models');

db.sequelize
.sync()
.then(() => {
  console.log('DB 연결 성공하셨습니다.')
})
.catch(err => console.log(err))

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



// socket
const socketController = require('./socket/index');
const { Socket } = require('socket.io')

const http = require('http').createServer(express);
const io = require('socket.io')(http, {
  cors: {
    origin: ['http://localhost:8080', 'https://admin.socket.io']
  }
});

io.on('connection', (socket) => {
  socket.on('login', (data) => {
    socketController.login(socket, data);
  });

  socket.on('join-quiz', (data) => {
    socketController.joinQuiz(socket, data);
  });

  socket.on('join-admin-quiz', (data) => {
    socketController.joinAdminQuiz(socket, data);
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
  })
})

http.listen(3100, function() {
  console.log('socket io server listening on port 3100')
});

module.exports = app