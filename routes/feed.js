const express = require("express");
const router = express.Router();
const feedController = require("../controllers/feedController.js");

router.get('/getProducts',feedController.getAllFeed);
router.post('/create-order/:staffId',feedController.createOrder);

module.exports = router;

