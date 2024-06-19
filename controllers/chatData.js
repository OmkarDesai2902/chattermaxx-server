const prismaClient = require('../services/prisma');
var jwt = require('jsonwebtoken');

const authPage = async (req, res)=> {
    // const { token } = req.body;
    if(!req.headers.authorization || 
        !req.headers.authorization.startsWith("Bearer"))
     {
     res.status(201).send('Request not authorized');  
     return;
     }
 
     const token = req.headers.authorization.split(' ')[1];
    //console.log(token)
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const existsUser = await prismaClient.users.findMany({
            where: {
                id: decoded.id,
            }
        });
        if(existsUser[0]){
            res.send({status :'Success'})
        }
        else{
            res.send({status :'Failure'})
        }

    } catch (error) {
        res.send({status :'Failure'});
    }
    
    
}

const getChats = async (req,res) =>{
    if(!req.headers.authorization || 
       !req.headers.authorization.startsWith("Bearer"))
    {
    res.status(201).send('Request not authorized');  
    return;
    }

    const token = req.headers.authorization.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded){
            res.send({status :'Failure token'});
        }
        const existsUser = await prismaClient.chats.findMany({
            where: {
              users : {
                path: ['user'],
                array_contains: decoded.id,
              }
            }
        });

        // const userID = [''];
        // userID = decoded.id
        // // const existsUser = await prisma.$queryRaw`SELECT * FROM User WHERE email = ${userID}`
        // const existsUser = await prisma.$queryRaw`select * from chats where users->'user' @> '${userID}' :: jsonb;`
        
        
        let loggedInUser = await prismaClient.users.findMany({
            where: {
              id : decoded.id,
            },
            select: {
                name: true,
            },
        });

        
        const finalResponse = [] ;

        
        for(let user of existsUser){
            let currentPush = {
                'loggedInUserID' :'',
                'loggedInUserName' :'',
                'userID' :'',
                'userInfo' : '',
                'chatId' : '',
                'lastMessage' : '',
                'isGroupChat' : '',
                'groupadminid' : '',
                'groupchatname' : '',
            }
            
            let usersIDFetch = []
            let chatUsers = user.users.user;
            for(let chatUser of chatUsers) {
                if(chatUser === decoded.id){
                    continue;
                }
                usersIDFetch.push(chatUser);
            }

            let usersData = await prismaClient.users.findMany({
                where: {
                  id :{
                    in : usersIDFetch
                  }  
                },
                select: {
                    id:true,
                    email: true,
                    name: true,
                },
            });
            currentPush.loggedInUserID = decoded.id;
            currentPush.loggedInUserName = loggedInUser[0].name;
            currentPush.userID = usersIDFetch;
            currentPush.userInfo = usersData;
            currentPush.chatId = user.id;
            currentPush.isGroupChat = usersIDFetch.length >=2 ? 'TRUE' : 'FALSE';
            currentPush.groupadminid = user.groupadminid;
            currentPush.groupchatname = user.groupchatname;      
            finalResponse.push(currentPush)
        } 
        
        

       

        if(existsUser && finalResponse){
            res.send({ loggedInUser : loggedInUser[0].name, loggedInUserID : decoded.id, finalResponse});
        }
        else{
            res.send([]);
        }
    }
    catch(error){   
        res.send({status :'Failure', error });
    }
}

const getChatsById = async (req,res) =>{ 
    if(!req.headers.authorization || 
    !req.headers.authorization.startsWith("Bearer"))
    {
    res.status(201).send('Request not authorized');  
    return;
    }

    const token = req.headers.authorization.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded){
            res.send({status :'Failure token'});
        }

        const {chatId} = req.params;
        const chatIdInt = parseInt(chatId)

        const groupMembers = await prismaClient.chats.findMany({
            where: {
              id : chatIdInt
            }
        });

        if (groupMembers.length === 0) {
            res.send({status :'Failure', message:'No chat found'});
            return;
        }

        res.send({status :'Success', groupMembers});


    }
    catch(error){
        res.send({status :'Failure', message:error})
    }
}

const createChat = async (req, res) =>{

    if(!req.headers.authorization || 
        !req.headers.authorization.startsWith("Bearer"))
     {
     res.status(201).send({status :'Failure', message:'Request not authorized' });  
     return;
     }
 
     const token = req.headers.authorization.split(' ')[1];

     const {users, isGroupChat, groupChatName} = req.body;

     
    if(!users || !token || !isGroupChat ){
        res.status(201).send({status :'Failure', message:'Parameters not fulfilled'});  
        return;
    }
    

     try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded){
        res.send({status :'Failure', message:'Request not authorized' });
        }

        users.push(decoded.id);
        let groupChatAdmin = isGroupChat === 'TRUE' ?  decoded.id :  '' ;

        const existsUser = await prismaClient.users.findMany({
            where: {
              id : {
                in: users,
              }
            }
        });
        
        if(users.length !== existsUser.length){
            res.send({status :'Failure', message:'Paramters not fulfilled' })
            return;
        }
        if((isGroupChat==='TRUE' && (!groupChatName || groupChatName ==='')) ||
           (isGroupChat==='TRUE' && users.length <=2) ||
           (isGroupChat === 'FALSE' && users.length >2))
           {
            res.status(201).send({status :'Failure', message:'Parameters not fulfilled'});  
            return;
        }

        let userJSON = {
            user : users
        }
        
        const existsChat = await prismaClient.chats.findMany({
            where: {
              users : {
                path: ['user'],
                array_contains: users,
              },
              isgroupchat : 'FALSE'
            }
        });
        if(existsChat.length>0 ){
            res.send({status :'Failure', message:'Chat already exists with user',
            existsChat: existsChat });
            return;
        }


        const createdChat = await prismaClient.chats.create({
            data : {
                users : userJSON,
                lastmessage : '',
                isgroupchat : isGroupChat,
                groupchatname : groupChatName,
                groupadminid : groupChatAdmin
            }
        })

        res.send({ status : "Success",createdChat});


        }
        catch(error){
            res.send({status :'Failure', message:error });
        }    
       
}

const updateGroupChatName = async (req,res) =>{
    
    try {

        if(!req.headers.authorization || 
            !req.headers.authorization.startsWith("Bearer"))
        {
            res.status(201).send({status :'Failure', message:'Request not authorized' });  
            return;
        }
     
        const token = req.headers.authorization.split(' ')[1];
        const {chatId, groupName} = req.body;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded){
        res.send({status :'Failure', message:'Request not authorized' });
        }

        if(!chatId || !groupName){
            res.send({status :'Failure', message:'Incomplete request' });
            return;
        }
        const getChatDetails = await prismaClient.chats.findMany({
            where: {
              id: chatId,
              isgroupchat: 'TRUE'
            }
        });
        if (getChatDetails.length === 0) {
            res.send({status :'Failure', message:'Invalid Chat' });
            return;
        }
        
        // if (getChatDetails[0].groupadminid === decoded.id){
        //     const updateChatDetails = await prismaClient.chats.update({
        //         where: {
        //           id: chatId,
        //         },
        //         data: {
        //             groupchatname: groupName,
        //         },
        //     });
        //     res.send({status : "Success",updateChatDetails})
        //     return;
        // }
        // else{
        //     res.send({status : "Failure",message: "Invalid admin / Chat"})
        //     return;
        // }
        
        const updateChatDetails = await prismaClient.chats.update({
            where: {
                id: chatId,
            },
            data: {
                groupchatname: groupName,
            },
        });
        res.send({status : "Success",updateChatDetails})
    
    } catch (error) {
        res.send({status : "Failure",message: error})
    }
}

const updateGroupUsers = async (req, res) =>{
    try {

        if(!req.headers.authorization || 
            !req.headers.authorization.startsWith("Bearer"))
        {
            res.status(201).send({status :'Failure', message:'Request not authorized' });  
            return;
        }
     
        const token = req.headers.authorization.split(' ')[1];
        const {chatId, users} = req.body;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded){
        res.send({status :'Failure', message:'Request not authorized' });
        }

        if(!chatId || !users){
            res.send({status :'Failure', message:'Incomplete request' });
            return;
        }
        const getChatDetails = await prismaClient.chats.findMany({
            where: {
              id: chatId,
              isgroupchat: 'TRUE'
            }
        });
        if (getChatDetails.length === 0) {
            res.send({status :'Failure', message:'Invalid Chat' });
            return;
        }
        // let adminPresentInUsers = false;
        // for (let i = 0; i < users.length; i++) {
        //     const element = users[i];
        //     if (element === decoded.id) {
        //         adminPresentInUsers = true;
        //     }
        // }
        // if (!adminPresentInUsers || users.length <=2) {
        users.push(decoded.id)
        //console.log(users)
        if (users.length <=2) {
            res.send({status :'Failure', message:'Invalid Users' });
            return;
        }
        let userJSON = {
            user : users
        }
        if (getChatDetails[0].groupadminid === decoded.id){
            const updateChatDetails = await prismaClient.chats.update({
                where: {
                  id: chatId,
                },
                data: {
                    users : userJSON
                },
            });

            let usersIDFetch = updateChatDetails.users.user;
            
            let usersData = await prismaClient.users.findMany({
                where: {
                  id :{
                    in : usersIDFetch
                  },
                  NOT : {
                    id : getChatDetails[0].groupadminid 
                  }  
                },
                select: {
                    id:true,
                    email: true,
                    name: true,
                },
            });

            console.log(usersData)

            res.send({status : "Success",updateChatDetails,userInfo:usersData})
            return;
        }
        else{
            res.send({status : "Failure",message: "Invalid Admin / Chat"})
            return;
        }
        
    
    } catch (error) {
        res.send({status : "Failure",message: error})
    }
}

module.exports = [authPage,getChats,getChatsById,createChat,updateGroupChatName,updateGroupUsers];