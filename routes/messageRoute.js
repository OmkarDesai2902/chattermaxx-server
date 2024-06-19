const express = require('express');
const [getAllMessages,sendMessage] = require("../controllers/messageData")
const {protectRoute} = require('../middlewares/authRequests')
const router = express.Router();
//message Route

router.route('/:id&:cursor').get(getAllMessages);
router.route('/').post(sendMessage)


module.exports = router;