import express from 'express';
import multer from 'multer';
import path from 'path';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 8000;
app.use(cors());

// Set up the static folder for avatar images
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Multer setup to store files in a local directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Middleware to parse incoming JSON data
app.use(express.json());

// MySQL database connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // no password for root in your case
  database: 'restaurant-db',
});

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

// // Middleware for token verification
// const verifyToken = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   const token = authHeader && authHeader.split(' ')[1];

//   if (!token) {
//     return res.sendStatus(401); // Unauthorized
//   }

//   jwt.verify(token, JWT_SECRET, (err, user) => {
//     if (err) {
//       return res.sendStatus(403); // Forbidden
//     }
//     req.user = user; // Attach user data to request
//     next();
//   });
// };

// Signup Route
app.post('/register', upload.single('avatar'), (req, res) => {
  const { fullName, username, email, password, role, address, phoneNumber } = req.body;
  const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null;  // Get the URL of the uploaded avatar

  // Validate that required fields are provided
  if (!fullName || !username || !email || !password || !role || !avatarUrl) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Hash the password before saving to the database
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) return res.status(500).json({ message: 'Error hashing password.' });

    // Insert user data into MySQL database
    const query = 'INSERT INTO users (fullName, username, email, password, role, avatar_url, address, phone_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [fullName, username, email, hashedPassword, role, avatarUrl, address, phoneNumber];

    db.query(query, values, (error, results) => {
      if (error) {
        console.error('Error inserting data into MySQL:', error);
        return res.status(500).json({ message: 'Failed to register user.' });
      }

      // Return success response with user data (excluding password)
      res.status(201).json({
        message: 'User registered successfully',
        data: { fullName, username, email, role, avatarUrl, address, phoneNumber },
      });
    });
  });
});




// Verify JWT Token
app.get('/verify-token', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({
      authenticated: true,
      user: decoded,
    });
  } catch (error) {
    return res.status(401).json({ authenticated: false, message: 'Invalid or expired token' });
  }
});





// Login Route
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], (error, results) => {
    if (error) {
      return res.status(500).json({ message: 'Internal server error.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const user = results[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).json({ message: 'Error comparing passwords.' });

      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials.' });
      }

      const token = jwt.sign(
        { userId: user.id, username: user.username, role: user.role },
        JWT_SECRET || 'jayshriradharaniradharadharadharadharadharadharahda',
        { expiresIn: '1h' }
      );

      res.json({
        message: 'Login successful',
        user: { id: user.id, fullName: user.fullName, username: user.username, role: user.role, avatarUrl: user.avatar_url },
        token,
      });
    });
  });
});

// Middleware to verify token
function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    // Extract the token from the 'Bearer <token>' format
    const token = bearerHeader.split(' ')[1];
    
    // Verify the token with JWT_SECRET
    jwt.verify(token, JWT_SECRET, (err, authData) => {
      if (err) {
        // Token is invalid or expired
        return res.status(403).json({ message: 'Token is not valid' });
      } else {
        // Attach the decoded token data to the request
        req.user = authData;
        next(); // Proceed to the next middleware or route handler
      }
    });
  } else {
    // No token provided in the Authorization header
    return res.status(403).json({ message: 'No token provided' });
  }
}

// Get current user
app.get('/current-user', verifyToken, (req, res) => {
  const userId = req.user.userId;

  const query = 'SELECT * FROM users WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database query error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = results[0];

    res.status(200).json({
      user: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  });
});

// Logout Route
app.post('/api/auth/logout', (req, res) => {
  try {
    res.clearCookie('authToken'); // Optional
    res.status(200).json({ message: 'Successfully logged out' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while logging out.' });
  }
});

// Endpoint for storing a new menu item
app.post("/api/menu", upload.single("image"), (req, res) => {
  const { name, description, category, price, discount, availability, preparationTime, tags } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const query = `
    INSERT INTO menu (name, description, category, price, discount, availability, preparationTime, imageUrl, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    name,
    description,
    category,
    parseFloat(price),
    parseFloat(discount),
    availability,
    preparationTime,
    imageUrl,
    JSON.stringify(tags || []),
  ];

  db.query(query, values, (error, results) => {
    if (error) {
      return res.status(500).json({ message: "Error saving menu item." });
    }

    res.status(201).json({
      message: "Menu item saved successfully",
      data: { id: results.insertId, name, description, category, price, discount, availability, preparationTime, imageUrl, tags },
    });
  });
});

// Fetch all menu items
app.get('/api/menu', (req, res) => {
  const query = 'SELECT * FROM menu';
  db.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ message: 'Failed to fetch menu items' });
    }
    res.json(results);
  });
});

// Fetch menu item by ID
app.get('/menu/:id', (req, res) => {
  const menuId = req.params.id;
  const query = 'SELECT * FROM menu WHERE id = ?';
  db.query(query, [menuId], (error, results) => {
    if (error) {
      return res.status(500).json({ message: 'Failed to fetch menu item' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    res.json(results[0]);
  });
});


// POST endpoint to place an order
app.post('/api/orders', async (req, res) => {
  const { table_number, order_items, payment_status, order_status } = req.body;

  if (!Array.isArray(order_items) || order_items.length === 0) {
    return res.status(400).json({ message: 'Order items must be a non-empty array.' });
  }

  const subtotal = order_items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.1; // Assuming a tax rate of 10%
  const discount = 0; // Modify as needed
  const total_amount = subtotal + tax - discount;

  try {
    const orderQuery = `
      INSERT INTO orders (table_number, subtotal, tax, discount, total_amount, payment_status, order_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [orderResult] = await db.execute(orderQuery, [table_number, subtotal, tax, discount, total_amount, payment_status, order_status]);

    if (!orderResult || orderResult.affectedRows === 0) {
      return res.status(500).json({ message: 'Failed to create order' });
    }
    
    const newOrderId = orderResult.insertId;

    const orderItemsQuery = `
      INSERT INTO order_items (order_id, menu_item_id, quantity, price)
      VALUES (?, ?, ?, ?)
    `;
    
    const orderItemsPromises = order_items.map(item => {
      return db.execute(orderItemsQuery, [newOrderId, item.id, item.quantity, item.price]);
    });

    await Promise.all(orderItemsPromises);

    return res.status(201).json({ message: 'Order placed successfully', order_id: newOrderId });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to place order', error: error.message });
  }
});

// Route to get the total count of menus
app.get('/api/admin/menu/count', (req, res) => {
  const query = 'SELECT COUNT(*) AS count FROM menu'; // Replace 'menus' with your actual table name

  db.query(query, (error, results) => {
      if (error) {
          console.error('Error fetching menu count:', error);
          return res.status(500).json({ message: 'Internal server error' });
      }

      // Assuming the result will be in results[0].count
      res.json({ count: results[0].count });
  });
});



// Route to get the total count of orders
app.get('/api/admin/orders/count', (req, res) => {
  const query = 'SELECT COUNT(*) AS count FROM orders'; // Replace 'menus' with your actual table name

  db.query(query, (error, results) => {
      if (error) {
          console.error('Error fetching menu count:', error);
          return res.status(500).json({ message: 'Internal server error' });
      }

      // Assuming the result will be in results[0].count
      res.json({ count: results[0].count });
  });
});

// Route to fetch all orders with associated order items
app.get('/orders', (req, res) => {
  const query = `
    SELECT 
      o.order_id, o.table_number, o.subtotal, o.tax, o.discount, o.total_amount, o.payment_status, o.order_status, o.created_at,
      oi.order_item_id, oi.menu_item_id, oi.quantity, oi.price
    FROM orders o
    LEFT JOIN order_items oi ON o.order_id = oi.order_id;
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Group orders with order items
    const orders = {};
    results.forEach(row => {
      if (!orders[row.order_id]) {
        orders[row.order_id] = {
          order_id: row.order_id,
          table_number: row.table_number,
          subtotal: row.subtotal,
          tax: row.tax,
          discount: row.discount,
          total_amount: row.total_amount,
          payment_status: row.payment_status,
          order_status: row.order_status,
          created_at: row.created_at,
          items: []
        };
      }
      // Add order items
      orders[row.order_id].items.push({
        order_item_id: row.order_item_id,
        menu_item_id: row.menu_item_id,
        quantity: row.quantity,
        price: row.price
      });
    });

    res.json(Object.values(orders));
  });
});


// API to fetch order items for a specific order ID
app.get('/orders/items/:orderId', (req, res) => {
  const { orderId } = req.params;

  const query = `
    SELECT item_id, quantity, subtotal, tax, discount
    FROM order_items
    WHERE order_id = ?
  `;

  db.query(query, [orderId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch order items' });
    }
    res.json(results);
  });
});


// Route to handle payment data submission
app.post('/payments', (req, res) => {
  const {
    order_id,
    payment_date,
    payment_amount,
    payment_method,
    payment_status,
    transaction_id,
    payment_reference_number,
    change_given,
    discount_applied,
    tips,
    currency,
    payment_notes,
  } = req.body;

  const sql = `
    INSERT INTO payments (order_id, payment_date, payment_amount, payment_method, payment_status, transaction_id, payment_reference_number, change_given, discount_applied, tips, currency, payment_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    order_id,
    payment_date,
    payment_amount,
    payment_method,
    payment_status,
    transaction_id,
    payment_reference_number,
    change_given,
    discount_applied,
    tips,
    currency,
    payment_notes,
  ], (err, result) => {
    if (err) {
      console.error('Error inserting payment data:', err);
      return res.status(500).json({ message: 'Error processing payment' });
    }

    res.json({ message: 'Payment submitted successfully', paymentId: result.insertId });
  });
});



// Fetch all orders with details (menu items, payments)
app.get('/orders', (req, res) => {
  const query = `
    SELECT 
      orders.order_id,
      orders.table_number,
      orders.subtotal,
      orders.tax,
      orders.discount,
      orders.total_amount,
      orders.order_status,
      menu.name AS menu_item_name,
      menu.price AS menu_item_price,
      order_items.quantity,
      (menu.price * order_items.quantity) AS total_price_for_item,
      payments.payment_amount,
      payments.payment_method,
      payments.payment_status,
      payments.tips
    FROM 
      orders
    INNER JOIN order_items ON orders.order_id = order_items.order_id
    INNER JOIN menu ON order_items.menu_item_id = menu.id
    LEFT JOIN payments ON orders.order_id = payments.order_id
    ORDER BY orders.order_id;
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching orders:', err);
      return res.status(500).json({ error: 'Failed to fetch data' });
    }
    res.json(results);
  });
});

// Fetch order details by order ID
app.get('/orders/:id', (req, res) => {
  const orderId = req.params.id;
  const query = `
    SELECT 
      orders.order_id,
      orders.table_number,
      orders.subtotal,
      orders.tax,
      orders.discount,
      orders.total_amount,
      orders.order_status,
      menu.name AS menu_item_name,
      menu.price AS menu_item_price,
      order_items.quantity,
      (menu.price * order_items.quantity) AS total_price_for_item,
      payments.payment_amount,
      payments.payment_method,
      payments.payment_status,
      payments.tips
    FROM 
      orders
    INNER JOIN order_items ON orders.order_id = order_items.order_id
    INNER JOIN menu ON order_items.menu_item_id = menu.id
    LEFT JOIN payments ON orders.order_id = payments.order_id
    WHERE orders.order_id = ?;
  `;

  db.query(query, [orderId], (err, result) => {
    if (err) {
      console.error('Error fetching order details:', err);
      return res.status(500).json({ error: 'Failed to fetch order details' });
    }
    if (result.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result);
  });
});


//single menu items orders 

app.post('/api/orderssingle', async (req, res) => {
  const { table_number, order_items, payment_status, order_status } = req.body;

  if (!Array.isArray(order_items) || order_items.length === 0) {
    return res.status(400).json({ message: 'Order items must be a non-empty array.' });
  }

  const subtotal = order_items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.1; // Assuming a tax rate of 10%
  const discount = 0; // Modify as needed
  const total_amount = subtotal + tax - discount;

  try {
    // Check if there is an existing order for the table
    const [existingOrder] = await db.promise().execute('SELECT id FROM orders WHERE table_number = ? AND order_status = ?', [table_number, 'pending']);

    let orderId;

    if (existingOrder.length > 0) {
      // If there's an existing order, add items to it
      orderId = existingOrder[0].id;
    } else {
      // Otherwise, create a new order
      const orderQuery = `
        INSERT INTO orders (table_number, subtotal, tax, discount, total_amount, payment_status, order_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const [orderResult] = await db.promise().execute(orderQuery, [table_number, subtotal, tax, discount, total_amount, payment_status, order_status]);

      if (!orderResult || orderResult.affectedRows === 0) {
        return res.status(500).json({ message: 'Failed to create order' });
      }
      
      orderId = orderResult.insertId;
    }

    // Insert order items into the order_items table
    const orderItemsQuery = `
      INSERT INTO order_items (order_id, menu_item_id, quantity, price)
      VALUES (?, ?, ?, ?)
    `;
    
    const orderItemsPromises = order_items.map(item => {
      return db.promise().execute(orderItemsQuery, [orderId, item.menu_item_id, item.quantity, item.price]);
    });

    await Promise.all(orderItemsPromises);

    return res.status(201).json({ message: 'Order placed successfully', order_id: orderId });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to place order', error: error.message });
  }
});




//table codesssssssssssssssssssssssssssss


// GET all available tables
app.get('/api/tables', (req, res) => {
  const query = 'SELECT * FROM tables'; // Adjust the table name as per your database
  db.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ message: 'Error fetching tables', error });
    }
    res.json(results); // Return all tables in JSON format
  });
});


// POST to create a new table (if needed for adding tables)
app.post('/api/tables', async (req, res) => {
  const { number, status } = req.body;
  try {
      const newTable = await Table.create({ number, status });
      res.status(201).json({ message: 'Table created successfully', table: newTable });
  } catch (error) {
      res.status(500).json({ message: 'Error creating table', error });
  }
});

// PUT to update table status (optional feature)
app.put('/api/tables/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
      const table = await Table.findByPk(req.params.id);
      if (table) {
          table.status = status;
          await table.save();
          res.json({ message: 'Table status updated successfully' });
      } else {
          res.status(404).json({ message: 'Table not found' });
      }
  } catch (error) {
      res.status(500).json({ message: 'Error updating table status', error });
  }
});









// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
