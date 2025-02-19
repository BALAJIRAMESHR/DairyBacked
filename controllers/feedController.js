const connection = require("../connection.js");

exports.getAllFeed = async (req, res) => {
    const sql = "SELECT Feed_id, name, price, Type, Manufacturer FROM Feed";
  
    try {
      const [results] = await connection.execute(sql);
  
      const feedProducts = results
        .filter((product) => product.Type === 0)
        .map((product) => ({
          id: product.Feed_id,
          name: product.name,
          price: product.price,
          Manufacturer: product.Manufacturer
        }));
  
      const supplementaryProducts = results
        .filter((product) => product.Type === 1)
        .map((product) => ({
          id: product.Feed_id,
          name: product.name,
          price: product.price,
          Manufacturer: product.Manufacturer
        }));
  
      res.json({ feedProducts, supplementaryProducts });
    } catch (err) {
      res.status(500).send("Error fetching data....");
    }
  }

exports.createOrder = async (req, res) => {
    const staffId = req.params.staffId;
    const order = req.body.order;
    const ticketid = req.body.ticketid;
    const items = order.items;
  
    if (!order || !order.formerId || !order.items || !Array.isArray(order.items)) {
      return res.status(400).json({ error: 'Invalid order format' });
    }
  
    try { 
      const connection1 = await connection.getConnection();
      await connection1.beginTransaction();
  
      const query = `
        INSERT INTO Feed_Orders (Former_id, Date_Time, Staff_id, Status, Total_Price, Paid, Ticket_id) 
        VALUES (?, NOW(), ?, ?, ?, ?, ?)`;
      const [result] = await connection1.execute(query, [
        order.formerId,
        staffId,
        0,
        order.totalPrice,
        0,
        ticketid,
      ]);
  
      const billId = result.insertId;
  
      const itemQueries = items.map((item) => {
        return connection1.execute(
          'INSERT INTO Bill (Bill_id, Item_id, Qty, Price) VALUES (?, ?, ?, ?)',
          [billId, item.id, item.quantity, item.price * item.quantity]
        );
      });
   
      await Promise.all(itemQueries);
  
      await connection1.commit();
      res.status(201).json({ message: 'Order created successfully', billId });
    } catch (error) {
      console.error(error);
      if (connection) {
        await connection.rollback();
      }
      res.status(500).json({ error: 'Failed to create order' });
    }
  }; 