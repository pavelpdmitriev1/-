const express = require('express');
const { Pool } = require('pg');
const app = express();
const port = 3000;

// Подключение к PostgreSQL
const pool = new Pool({
    user: 'your_username',
    host: 'localhost',
    database: 'electronics_store',
    password: 'your_password',
    port: 5432,
});

app.use(express.json());

// 1. Пользователи
app.get('/api/users', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { username, email, password_hash, full_name, phone } = req.body;
    try {
        const { rows } = await pool.query(
            'INSERT INTO users (username, email, password_hash, full_name, phone) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [username, email, password_hash, full_name, phone]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Товары
app.get('/api/products', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT p.*, c.name as category_name, m.name as manufacturer_name 
            FROM products p
            JOIN categories c ON p.category_id = c.category_id
            JOIN manufacturers m ON p.manufacturer_id = m.manufacturer_id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { rows } = await pool.query(`
            SELECT p.*, ps.*, c.name as category_name, m.name as manufacturer_name 
            FROM products p
            LEFT JOIN product_specs ps ON p.product_id = ps.product_id
            JOIN categories c ON p.category_id = c.category_id
            JOIN manufacturers m ON p.manufacturer_id = m.manufacturer_id
            WHERE p.product_id = $1
        `, [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Заказы
app.get('/api/orders', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT o.*, u.username, u.email 
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    const { user_id, address_id, items, payment_method } = req.body;
    
    try {
        await pool.query('BEGIN');
        
        // Создаем заказ
        const orderResult = await pool.query(
            'INSERT INTO orders (user_id, address_id, payment_method) VALUES ($1, $2, $3) RETURNING *',
            [user_id, address_id, payment_method]
        );
        const order = orderResult.rows[0];
        
        // Добавляем товары в заказ
        let totalAmount = 0;
        for (const item of items) {
            const productResult = await pool.query(
                'SELECT price FROM products WHERE product_id = $1',
                [item.product_id]
            );
            if (productResult.rows.length === 0) {
                await pool.query('ROLLBACK');
                return res.status(400).json({ error: `Product ${item.product_id} not found` });
            }
            
            const price = productResult.rows[0].price;
            await pool.query(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
                [order.order_id, item.product_id, item.quantity, price]
            );
            
            totalAmount += item.quantity * price;
            
            // Обновляем количество товара на складе
            await pool.query(
                'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2',
                [item.quantity, item.product_id]
            );
        }
        
        // Обновляем общую сумму заказа
        await pool.query(
            'UPDATE orders SET total_amount = $1 WHERE order_id = $2',
            [totalAmount, order.order_id]
        );
        
        await pool.query('COMMIT');
        res.status(201).json({ ...order, total_amount: totalAmount });
    } catch (err) {
        await pool.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
