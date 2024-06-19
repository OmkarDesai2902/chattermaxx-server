const prismaClient = require('../services/prisma');
const {v4 : uuidv4} = require('uuid');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/auth');
var jwt = require('jsonwebtoken');

const getAllUsers = async (req,res)=>{
    // res.send("Users Dta");
    const data = await prismaClient.users.findMany();
    res.send({data});
}

const registerUser = async (req,res) =>{
    const {name, email, password} = req.body;
    const userId = uuidv4();
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password,salt);
    
    if(!name || !email || !password){
        res.status(201).send({status:'Failure',
        message:'Details not provided!'});
    }

    // console.log(name,email,password);
    const existsUser = await prismaClient.users.findMany({
        where: {
            email: email,
        }
    });

    if(existsUser[0]){
        res.status(201).send({status:'Failure',
        message:'User already exists. Kindly proceed to login!'});
        return;
    }
    const user = await prismaClient.users.create({
        data : {
            id: userId,
            name: name,
            email: email,
            password : hashPassword,
            profilephotolink: '',
        }
    })

    res.status(200).send({status:'Success'});
}

const loginUser = async (req,res)=>{
    const {name, email, password} = req.body;
    
    if(!email || !password){
        res.status(201).send('Username Password not provided');
        return;
    }

    const existsUser = await prismaClient.users.findMany({
        where: {
            email: email,
        }
    });

    if(existsUser[0]){
        const hashedPassword = existsUser[0].password;
        const isMatch = await bcrypt.compare(password, hashedPassword);
        const {name, email, id } =existsUser[0];
        if(isMatch){
            const token = generateToken(id);
            res.status(200).send({token, loggedIn: true});
            // res.redirect('/chats');
            return;
        }
        else{
            res.status(201).send({loggedIn: false});
        }
        
    }
    else{
        res.status(201).send({loggedIn: false, message : 'Invalid Email / Password'});
    }
    
}

const getSearchUsers = async (req,res)=>{
    // res.send("Users Dta");
    const {searchTerm} = req.body;
    if(searchTerm === '' || searchTerm === ' ' || !searchTerm){
        res.send({data : []})
        return;
    }
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded.id)
    const data = await prismaClient.users.findMany({
        where : {
            name :{
                contains : searchTerm,
                mode:'insensitive'
            },
            id : {
                not:decoded.id,
            },
        },
        select :{
            id :true,
            name :true,
            email :true,
            profilephotolink :true,
        },
        orderBy : {
            name : 'asc'
        }
    });
    res.send({data});
}

const getSearchUsersExcludeGrpMembers = async (req,res)=>{
    // res.send("Users Dta");
    const {searchTerm, groupID} = req.body;
    if(searchTerm === '' || searchTerm === ' ' || !searchTerm){
        res.send({data : []})
        return;
    }
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded.id)

    const groupMembers = await prismaClient.chats.findMany({ 
        where : {
            id : groupID
        }
    })

    let excludedUsers = groupMembers[0].users.user
    console.log(excludedUsers)

    const data = await prismaClient.users.findMany({
        where : {
            name :{
                contains : searchTerm,
                mode:'insensitive'
            },
            
            NOT : {
                id :{
                    in :excludedUsers,
                },
                
            },
        },
        select :{
            id :true,
            name :true,
            email :true,
            profilephotolink :true,
        },
        orderBy : {
            name : 'asc'
        }
    });
    res.send({data});
}


module.exports = [getAllUsers, registerUser,loginUser,getSearchUsers, getSearchUsersExcludeGrpMembers];