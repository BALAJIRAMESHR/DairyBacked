const mysql = require("mysql2/promise");

let connection;

try {
  connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '110Akash62003',
    database: "diaryuser",
    waitForConnections: true,
  });

  console.log("Database connection pool created successfully");
} catch (err) {
  console.error("Error creating database connection pool:", err);
  process.exit(1); 
}

module.exports = connection;
