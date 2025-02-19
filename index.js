const express = require("express");
const cors = require("cors");
const path = require("path");
const connection = require("./connection.js");

const port = 8803;
const app = express();

app.use(express.json());
app.use(cors());



//  Import routes
const authRoutes = require("./routes/auth.js");
const ticketRoutes = require("./routes/ticket.js");
const formerRoutes = require("./routes/former.js");
const doctorRoutes = require("./routes/doctor.js");
const feedRoutes = require("./routes/feed.js");
const medRoutes = require("./routes/med.js");
const treatmentRoutes = require("./routes/treatment.js");
const adminRoutes = require("./routes/admin.js");

// use routes
app.use('/',authRoutes);
app.use('/ticket',ticketRoutes);
app.use('/farmer',formerRoutes);
app.use('/doctor',doctorRoutes);
app.use('/feed',feedRoutes);
app.use('/med',medRoutes);
app.use('/treatment',treatmentRoutes);
app.use('/admin',adminRoutes);

app.use("/images", express.static(path.join(__dirname, "images")));

app.listen(port, () => {
  console.log("running...");
});
