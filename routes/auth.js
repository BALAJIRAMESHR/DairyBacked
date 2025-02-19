const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController.js");

router.post('/login',authController.postLogin);
router.post('/register',authController.postRegister);
router.post('/checktoken',authController.checkToken);

module.exports = router;

