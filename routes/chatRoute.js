const express = require('express');
const [authPage,getChats,getChatsById,createChat,updateGroupChatName,updateGroupUsers] = require("../controllers/chatData")
const {protectRoute} = require('../middlewares/authRequests')
const router = express.Router();
//chatRoute

router.route('/check').get(authPage);
router.route('/').get(getChats).post(createChat).patch(updateGroupUsers);
router.route('/:chatId').get(getChatsById);
router.route('/rename').patch(updateGroupChatName)



module.exports = router;