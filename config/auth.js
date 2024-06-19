var jwt = require('jsonwebtoken');

const generateToken = (id) =>{
    var token = jwt.sign({id}, process.env.JWT_SECRET,{expiresIn:"5d",});
    //console.log(token);

    return(token);
}



module.exports = {generateToken}