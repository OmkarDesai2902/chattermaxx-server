const express = require('express');
const [getAllUsers, registerUser,loginUser,getSearchUsers,getSearchUsersExcludeGrpMembers] = require("../controllers/userData")
const {protectRoute} = require('../middlewares/authRequests')
const router = express.Router();
//chatRoute
router.route('/').get(protectRoute,getAllUsers).post(getSearchUsers);
router.route('/excludedgrp').post(getSearchUsersExcludeGrpMembers);
router.route('/login').post(loginUser);
router.route('/register').post(registerUser);

module.exports = router;