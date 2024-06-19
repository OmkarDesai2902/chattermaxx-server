const jwt = require("jsonwebtoken");

const protectRoute = (req, res, next) =>{
    if(!req.headers.authorization || 
       !req.headers.authorization.startsWith("Bearer"))
    {
      res.status(201).send('Request not authorized');  
      return;
    }
    const token = req.headers.authorization.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token,process.env.JWT_SECRET);
        if(decoded.id){
            //res.send(decoded.id)
            next();
        }
        else{
            res.status(201).send('Request not authorized');  
        }
    } catch (error) {
        res.status(201).send('Request not authorized');  
    }

}



module.exports = {protectRoute}