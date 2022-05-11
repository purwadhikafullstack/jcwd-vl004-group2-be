require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./configs/sequelize');
const passport = require('passport');
const cookieSession = require('cookie-session');
const bearerToken = require('express-bearer-token');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('./configs/passport');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
  },
});

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    methods: 'GET,POST,PATCH,DELETE',
    credentials: true,
  })
);
app.use(express.json());
app.use(bearerToken());
app.use(
  cookieSession({
    name: 'heizenberg-cookie',
    keys: [process.env.COOKIE_KEY],
  })
);
app.use(passport.initialize());
app.use(passport.session());

(async () => {
  try {
    await sequelize.authenticate();
    // await sequelize.sync({ alter: true });
    console.log('sequelize connection success!');
  } catch (error) {
    console.log(error);
  }
})();

const {
  authRouter,
  authAdminRouters,
  addressRouter,
  categoryRouter,
  deliveryOptionRouter,
  productRouter,
  cartRouter,
  userRouter,
  checkoutRouter,
  transactionAdminRouter,
  transactionUserRouter,
  messageRouter,
  reportRouter,
  adminRouter,
  reviewRouter,
} = require('./routers');

app.use('/public', express.static('public'));
app.use('/auth', authRouter);
app.use('/address', addressRouter);
app.use('/category', categoryRouter);
app.use('/deliveryoption', deliveryOptionRouter);
app.use('/admin/auth', authAdminRouters);
app.use('/admin/transaction', transactionAdminRouter);
app.use('/admin/report', reportRouter);
app.use('/admin/account', adminRouter);
app.use('/product', productRouter);
app.use('/cart', cartRouter);
app.use('/user', userRouter);
app.use('/checkout', checkoutRouter);
app.use('/history', transactionUserRouter);
app.use('/message', messageRouter);
app.use('/review', reviewRouter);

// Socket.io
app.use('/', (req, res) => {
  try {
    res.status(200).send('Welcome to Heizen Berg Socket.io Server!');
  } catch (error) {
    res.status(500).send(err);
  }
});

let users = [];
let admins = [];

const Message = require('./models/Message');

io.on('connection', (socket) => {
  console.log(`${socket.id} has connected`);

  socket.on('userJoin', async (userId) => {
    if (!users.length || !users.some((user) => user.id === userId)) {
      users.push({ id: userId, socketId: socket.id });
      console.log(users);
      console.log(admins);

      const totalNotif = await Message.count({
        where: { userId, to: 'user', is_new: true },
      });

      if (totalNotif) {
        io.to(socket.id).emit('newUserNotif', totalNotif);
      }
    }
  });

  socket.on('adminJoin', async (adminId) => {
    if (!admins.length || !admins.some((admin) => admin.id === adminId)) {
      admins.push({ id: adminId, socketId: socket.id });
      console.log(users);
      console.log(admins);
      const totalNotif = await Message.count({
        where: { to: 'admin', is_new: true },
      });

      if (totalNotif) {
        io.to(socket.id).emit('newAdminNotif', totalNotif);
      }

      if (admins.length) {
        admins.forEach((admin) => io.to(admin.socketId).emit('newOnlineAdmin', { data: admins }));
      }
    }
  });

  socket.on('adminNotif', async () => {
    if (admins.length) {
      const totalNotif = await Message.count({
        where: { to: 'admin', is_new: true },
      });

      admins.forEach((admin) => io.to(admin.socketId).emit('newAdminNotif', totalNotif));
    }
  });

  socket.on('userNotif', async (userId) => {
    const userData = users.find((user) => user.id === userId);

    if (userData) {
      const totalNotif = await Message.count({
        where: { userId, to: 'user', is_new: true },
      });

      io.to(userData.socketId).emit('newUserNotif', totalNotif);
    }
  });

  socket.on('getOnlineAdmin', () => {
    io.to(socket.id).emit('onlineAdminData', { data: admins });
  });

  socket.on('disconnect', () => {
    if (users.some((user) => user.socketId === socket.id)) {
      users = users.filter((user) => user.socketId !== socket.id);
    } else {
      admins = admins.filter((admin) => admin.socketId !== socket.id);

      admins.forEach((admin) => io.to(admin.socketId).emit('offlineAdmin', { data: admins }));
    }
    console.log(`${socket.id} has disconnected`);
    console.log(users);
    console.log(admins);
  });
});

app.listen(process.env.PORT, () => console.log(`API running at port ${process.env.PORT}`));
httpServer.listen(process.env.PORT_SOCKET, () => console.log(`Socket.io Server running at Port ${process.env.PORT_SOCKET}`));
