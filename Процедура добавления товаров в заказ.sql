DELIMITER //

CREATE PROCEDURE AddOrderItem(
    IN p_order_id INT,
    IN p_product_id INT,
    IN p_quantity INT
)
BEGIN
    DECLARE v_price DECIMAL(10,2);
    DECLARE v_stock INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Получаем цену и количество товара на складе
    SELECT price, stock_quantity INTO v_price, v_stock
    FROM products 
    WHERE product_id = p_product_id FOR UPDATE;
    
    -- Проверяем наличие товара
    IF v_stock < p_quantity THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Недостаточно товара на складе';
    END IF;
    
    -- Добавляем товар в заказ
    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
    VALUES (p_order_id, p_product_id, p_quantity, v_price);
    
    -- Уменьшаем количество товара на складе
    UPDATE products 
    SET stock_quantity = stock_quantity - p_quantity
    WHERE product_id = p_product_id;
    
    -- Обновляем общую сумму заказа
    UPDATE orders
    SET total_amount = (
        SELECT SUM(quantity * unit_price) 
        FROM order_items 
        WHERE order_id = p_order_id
    )
    WHERE order_id = p_order_id;
    
    COMMIT;
END //

DELIMITER ;