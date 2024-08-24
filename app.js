const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const corsConfig = require("./config/cors");
const indexRouter = require("./routes/index");
const db = require("./models");

db.sequelize
  .sync()
  .then(() => {
    console.log("DB 연결 성공하셨습니다.");
  })
  .catch((err) => console.log(err));

app.use(cors(corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("lisn"));
app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: "lisn",
    cookie: {
      httpOnly: true,
    },
  })
);
app.use("/api", indexRouter);

// socket
const userSocketController = require("./socket/user.js");
const adminSocketController = require("./socket/admin.js");

const server = http.createServer(app);
const socketCors = { cors: { origin: "*" } }; // 추후 추가예정 "https://admin.socket.io"
const io = new Server(server, socketCors);

io.on("connection", (socket) => {
  // User
  socket.on("login", (data) => {
    userSocketController.login(socket, data);
  });

  socket.on("rejoin", (data) => {
    userSocketController.rejoin(socket, data);
  });

  socket.on("join-quiz", (data) => {
    userSocketController.joinQuiz(io, data);
  });

  socket.on("select-answer", (data) => {
    userSocketController.selectAnswer(io, data);
  });

  socket.on("check-answer", (data) => {
    userSocketController.checkAnswer(socket, data);
  });

  // Admin
  socket.on("join-admin-quiz", (data) => {
    adminSocketController.joinAdminQuiz(socket, data);
  });

  socket.on("start-quiz", (data) => {
    adminSocketController.startQuiz(socket, data);
  });

  socket.on("show-answer", (data, callback) => {
    adminSocketController.showAnswer(socket, data, callback);
  });

  socket.on("update-current-user", (data) => {
    adminSocketController.updateCurrentUser(socket, data);
  });

  socket.on("show-end-winner", (callback) => {
    adminSocketController.showEndWinner(socket, callback);
  });

  socket.on("re-start-quiz", (callback) => {
    adminSocketController.reStartQuiz(socket, callback);
  });

  socket.on("revive", (data) => {
    adminSocketController.revive(socket, data);
  });
});

// Socket Port
server.listen(process.env.PORT, function () {
  console.log("socket io server listening on port 3100");
});

module.exports = server;
