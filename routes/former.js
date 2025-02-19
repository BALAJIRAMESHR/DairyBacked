const express = require("express");
const router = express.Router();
const formerController = require("../controllers/formerController.js");

router.get('/checkFarmer/:farmerId',formerController.CheckFormer);
router.get('/farmer/:farmerId',formerController.getFormerByID);
router.get('/last-order/:farmer_id',formerController.preOrder);

module.exports = router;

