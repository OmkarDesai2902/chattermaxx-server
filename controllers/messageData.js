const prismaClient = require('../services/prisma');
var jwt = require('jsonwebtoken');

const sendMessage = async (req,res) =>{
    try {
        if(!req.headers.authorization || 
            !req.headers.authorization.startsWith("Bearer"))
        {
            res.status(201).send({status :'Failure', message:'Request not authorized' });  
            return;
        }
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded || !decoded.id){
            res.send({status :'Failure', message:'Request not authorized' });
            return;
        }

        const {chatid, messagetext} = req.body

        if (!chatid || !messagetext) {
            res.send({status :'Failure', message:'Invalid data' });
            return;
        }

        const existsChat = await prismaClient.chats.findMany({
            where: {
              id : chatid
            }
        });
        
        let chatUsers = existsChat[0].users.user
        //console.log(chatUsers)

        if(existsChat.length === 0){
            res.send({status :'Failure', message:'Chat not found' });
            return;
        }

        let userJSON = {
            user : []
        }

        const senderData = await prismaClient.users.findMany({
            where : { 
                id : decoded.id
            },
            select :{
                id : true,
                name : true
            }
        })

        if(senderData.length<0) {
            res.send({status :'Failure', message:'No authorized' });
            return;
        }
        let sendername =  senderData[0].name;

        const createdMessage = await prismaClient.message.create({
            data : {
                chatid : chatid,
                messagetext : messagetext,
                senderid : decoded.id,
                readby : userJSON,
                sendername :  sendername
            }
        })

        res.send({status : "Success",createdMessage, chatUsers })

    } catch (error) {
        res.send({status : "Failure",message: error})
    }

}


const getAllMessages = async (req,res) =>{
    try {
        if(!req.headers.authorization || 
            !req.headers.authorization.startsWith("Bearer"))
        {
            res.status(201).send({status :'Failure', message:'Request not authorized' });  
            return;
        }
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded || !decoded.id){
            res.send({status :'Failure', message:'Request not authorized' });
            return;
        }

        const { id, cursor } = req.params
        const chatid = parseInt(id)
        const cursorId = parseInt(cursor)

        console.log(cursorId)

        if (!chatid) {
            res.send({status :'Failure', message:'Invalid data' });
            return;
        }

        const existsChat = await prismaClient.chats.findMany({
            where: {
              id : chatid
            }
        });

        let isgroupchat = existsChat[0].isgroupchat;

        const existsMsgs = await prismaClient.message.findMany({
            where: {
              chatid : chatid
            }
        });

        if(existsChat.length === 0){
            res.send({status :'Failure', message:'Chat not found' });
            return;
        }

        if(existsMsgs.length === 0){
            res.send({status :'Failure', message:'No messages' });
            return;
        }

        if(cursorId === 0){
            const getMessage1 = await prismaClient.message.findMany({
                take: -40,
                where: {
                  chatid : chatid
                },
                orderBy: {
                    id: 'asc',
                },
            });

            const lastMessageResult = getMessage1[0] 
            const nextCursor = lastMessageResult.id 

            res.send({status : "Success",nextCursor, getMessage1, isgroupchat});
            return;
        }
        else{
            const getMessage2 = await prismaClient.message.findMany({
                take: -20,
                skip :1,
                cursor: {
                    id : cursorId
                },
                where: {
                  chatid : chatid
                },
                orderBy: {
                    id: 'asc',
                },
            });

            if(getMessage2.length === 0){
                res.send({status : "Success",nextCursor:'Reached End', getMessage2: []});
                return;
            }
            const lastMessageResult = getMessage2[0] 
            const nextCursor = lastMessageResult.id 

            res.send({status : "Success",nextCursor, getMessage2, isgroupchat});
            return;

        }

       
    }
    catch(error){
        res.send({status : "Failure",message: error})
    }
}


module.exports = [getAllMessages,sendMessage];