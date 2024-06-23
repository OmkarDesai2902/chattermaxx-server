const express = require('express')
const http = require('http')
const userData = require('./routes/userData');
const chatRoute = require('./routes/chatRoute');
const messageRoute = require('./routes/messageRoute');
const { protectRoute } = require('./middlewares/authRequests');
//const { Server } = require('socket.io');
// const prismaClient = require('./services/prisma')
const Redis = require('ioredis');
const [produceMessage,startMessageConsumer,mf] = require('./services/kafka');
const { compare } = require('bcryptjs');
var cors = require('cors')


const pub = new Redis(process.env.REDIS_URL)
const sub = new Redis(process.env.REDIS_URL)



const app = express()
app.use(express.json());

var corsOptions = {
  origin: 'https://chattermaxx.onrender.com',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}
app.use(cors(corsOptions));

console.log(corsOptions)
app.use('/api/user',userData);
app.use('/api/chats',protectRoute,chatRoute);
app.use('/api/messages',protectRoute,messageRoute);

// const socketService =  new SocketService();
// socketService.io.attach(httpServer);
// const io = new Server(httpServer)

const PORT = process.env.PORT ? process.env.PORT : 8000;

const _server =  app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})



const io = require('socket.io')(_server, 
  {
    pingTimeout: 60000,
    cors :{
      allowedHeaders: ['*'],
      origin: 'https://chattermaxx.onrender.com',
    },
  }
)


const initConsumer = async () => {
  await startMessageConsumer();
} 

initConsumer();
mf()
//console.log('cc')


io.on('connection', (socket) => {
  sub.subscribe("MESSAGES");

  console.log('User connected', socket.id);

  socket.on('setup',(profileId)=>{
    socket.join(profileId)
    console.log('User joined room ',profileId)
    // socket.emit('connected')
  })
  
  //no use
  let joinedChatRooms = []
  socket.on('join chat',(selectedChatID)=>{
    joinedChatRooms.push(selectedChatID)
    if(joinedChatRooms.length >1){
      joinedChatRooms.map((joinedRoom)=>{
        if(joinedRoom !== selectedChatID){
          socket.leave(joinedRoom);
          console.log(`Socket left room : ${joinedRoom}`)
        }
      })
    }
    console.log('JOinnnnnnnnnn')
    socket.join(selectedChatID)
    //console.log('also joined room ', selectedChatID)
    console.log(`User ${socket.id} also joined room ${selectedChatID}`)

    socket.on('start typing',([room,newMessage])=>{
      //console.log('typing')
      socket.to(room).emit('set typing',newMessage)
    })
    
  })

  //end of no use

  socket.on('new message', async ([newMessageRecieved,users])=>{

    let data = {
      newMessageRecieved,
      users
    }
    //console.log(data)
    await pub.publish("MESSAGES",JSON.stringify(data));
    //console.log(newMessageRecieved.msg)
    // await produceMessage(newMessageRecieved.msg);
    await produceMessage(JSON.stringify(newMessageRecieved));

    //earlier w/o redis
    // users.map(user =>{
    //   socket.to(user).emit('message recieved',newMessageRecieved)
    // })

  })

 

  

});



sub.on('message', async (channel,message)=>{
  if(channel === 'MESSAGES'){
    let messageData = JSON.parse(message)
    let {newMessageRecieved, users } = messageData

    
    io.to(newMessageRecieved.chatId).emit('message recieved',newMessageRecieved)
    console.log(`MSG Emmited to ${newMessageRecieved.chatId}`)
    //commented
    // users.map(user =>{
    //   io.to(user).emit('message recieved',newMessageRecieved)
    // })

  }
})



// socketService.initListeners();





// const init = async (message) => {
  
//   console.log('prisma entered')
//   const data = await prismaClient.messages.findMany()
//   console.log(data.id);
  
 
// }

// init('Hello From Demo2');
