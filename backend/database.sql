-- Create database
CREATE DATABASE IF NOT EXISTS shop_db;
USE shop_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(40) DEFAULT NULL,
    address VARCHAR(200) DEFAULT NULL,
    district VARCHAR(80) DEFAULT NULL,
    postalcode VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image VARCHAR(255),
    stock INT DEFAULT 50,
    category VARCHAR(50) NOT NULL,
    size VARCHAR(50),
    rating DECIMAL(3, 1) DEFAULT 4.5,
    tag VARCHAR(50),
    is_available BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,
    supabase_user_id VARCHAR(64) DEFAULT NULL,
    user_email VARCHAR(100) DEFAULT NULL,
    customer_name VARCHAR(150) DEFAULT NULL,
    customer_phone VARCHAR(40) DEFAULT NULL,
    customer_address VARCHAR(200) DEFAULT NULL,
    payment_method VARCHAR(40) DEFAULT 'credit_card',
    payment_status VARCHAR(20) DEFAULT 'paid',
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (user_email) REFERENCES users(email) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    subject VARCHAR(200),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    user_email VARCHAR(100) DEFAULT NULL,
    user_id INT DEFAULT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (user_email) REFERENCES users(email) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Site reviews table
CREATE TABLE IF NOT EXISTS site_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL,
    user_email VARCHAR(100) DEFAULT NULL,
    user_id INT DEFAULT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (user_email) REFERENCES users(email) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Advertisements table
CREATE TABLE IF NOT EXISTS advertisements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    button_text VARCHAR(80) DEFAULT 'Learn More',
    button_link VARCHAR(500) DEFAULT '',
    footer_text VARCHAR(150) DEFAULT '',
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Email Subscriptions table for product notifications
CREATE TABLE IF NOT EXISTS email_subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    is_subscribed BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Sample products for BUY LK Food Delivery
INSERT INTO products (name, category, price, rating, tag, image, description, stock, size) VALUES
('Margherita Pizza', 'pizza', 299.99, 4.7, 'Bestseller', 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=800&q=80', 'Classic Margherita pizza with fresh basil and mozzarella', 50, 'medium'),
('Pepperoni Pizza', 'pizza', 349.99, 4.8, 'Popular', 'https://images.unsplash.com/photo-1628840042765-356cda07f4ee?auto=format&fit=crop&w=800&q=80', 'Delicious pepperoni pizza with extra cheese', 45, 'medium'),
('Vegetarian Kottu', 'kottu', 249.99, 4.5, 'Trending', 'https://images.unsplash.com/photo-1609501676725-7186f017a4b0?auto=format&fit=crop&w=800&q=80', 'Sri Lankan chopped paratha with vegetables', 60, NULL),
('Chicken Kottu', 'kottu', 279.99, 4.6, 'Bestseller', 'https://images.unsplash.com/photo-1609501676725-7186f017a4b0?auto=format&fit=crop&w=800&q=80', 'Sri Lankan chopped paratha with tender chicken', 55, NULL),
('Fried Rice', 'rice', 199.99, 4.4, 'Quick', 'https://images.unsplash.com/photo-1603894542802-f7ef2c9caa11?auto=format&fit=crop&w=800&q=80', 'Fluffy fried rice with egg and vegetables', 70, NULL),
('Butter Chicken Rice', 'rice', 329.99, 4.7, 'Special', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc201?auto=format&fit=crop&w=800&q=80', 'Creamy butter chicken served with fragrant rice', 40, NULL),
('Chocolate Cake', 'bakery', 149.99, 4.8, 'Sweet', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80', 'Rich and moist chocolate cake slice', 80, NULL),
('Croissant', 'bakery', 99.99, 4.6, 'Fresh', 'https://images.unsplash.com/photo-1585080199000-c9fccfadae5d?auto=format&fit=crop&w=800&q=80', 'Buttery and flaky French croissant', 100, NULL),
('Iced Tea', 'beverages', 79.99, 4.5, 'Refreshing', 'https://images.unsplash.com/photo-1556195332-924ec42dd029?auto=format&fit=crop&w=800&q=80', 'Cold and refreshing iced tea', 150, NULL),
('Mango Smoothie', 'beverages', 119.99, 4.7, 'Popular', 'https://images.unsplash.com/photo-1638859289117-b8c0b6935d8b?auto=format&fit=crop&w=800&q=80', 'Fresh mango smoothie with yogurt', 120, NULL),
('Samosa', 'others', 49.99, 4.5, 'Snack', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80', 'Crispy triangular pastry with spiced filling', 200, NULL);

-- Sample reviews for food products
INSERT INTO product_reviews (product_id, user_name, rating, comment) VALUES
(1, 'Amal Silva', 5, 'Best pizza in town! Fresh ingredients and perfect crust.'),
(1, 'Priya Perera', 4, 'Great taste, delivery was quick!'),
(2, 'Ravi Kumar', 5, 'Pepperoni pizza is absolutely delicious!'),
(3, 'Nadeesha Fernando', 4, 'Authentic kottu, tastes homemade!'),
(4, 'Imran Khan', 5, 'Chicken kottu with perfect spice level. Highly recommend!'),
(5, 'Ayesha Hassan', 4, 'Fried rice was hot and fresh.'),
(9, 'David Wilson', 5, 'Best mango smoothie ever! Very refreshing.');

-- Sample site reviews
INSERT INTO site_reviews (user_name, user_email, rating, comment) VALUES
('Ayesha Perera', 'ayesha@example.com', 5, 'BUY LK has the best food delivery service! Fast and delicious.'),
('Kasun Silva', 'kasun@example.com', 4, 'Great variety of food options and smooth checkout experience.'),
('Nadeesha Fernando', 'nadeesha@example.com', 5, 'Amazing food quality and very responsive customer support!'),
('Imran Khan', 'imran@example.com', 5, 'Best food delivery app in Sri Lanka. Highly recommend!'),
('Ravi Kumar', 'ravi@example.com', 4, 'Good selection and reasonable prices. Keep up the good work!');

