const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController.js");

router.get('/tickets/:staffId',ticketController.getTicket);
router.get('/ticket/:ticketId',ticketController.getTicketById);
router.post('/create-ticket',ticketController.createTicketForDoc);
router.get('/ticketsby/:former_id',ticketController.getTicketByFormerId);
router.post('/feedticket',ticketController.createTicketForFeed);
router.get('/ticketBySpid/:spId',ticketController.getTicketBySpId);
router.post('/updateApprovalStatus/:ticketId',ticketController.updateApprovalStatus);
router.post('/updateStartstatus/:ticketId',ticketController.updateStartstatus);
router.post('/updateEndstatus/:ticketId',ticketController.updateEndstatus);

module.exports = router;

