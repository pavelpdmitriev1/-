DELIMITER //

CREATE PROCEDURE CreateNewOrder(
    IN p_user_id INT,
    IN p_address_id INT,
    IN p_payment_method VARCHAR(50),
    OUT p_order_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Создаем запись о заказе
    INSERT INTO orders (user_id, address_id, payment_method, status, order_date)
    VALUES (p_user_id, p_address_id, p_payment_method, 'pending', NOW());
    
    SET p_order_id = LAST_INSERT_ID();
    
    COMMIT;
END //

DELIMITER ;