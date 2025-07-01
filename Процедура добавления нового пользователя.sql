DELIMITER //

CREATE PROCEDURE AddNewUser(
    IN p_username VARCHAR(50),
    IN p_email VARCHAR(100),
    IN p_password_hash VARCHAR(255),
    IN p_full_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    OUT p_user_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Проверяем уникальность email и username
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Пользователь с таким email уже существует';
    END IF;
    
    IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Это имя пользователя уже занято';
    END IF;
    
    -- Создаем пользователя
    INSERT INTO users (username, email, password_hash, full_name, phone)
    VALUES (p_username, p_email, p_password_hash, p_full_name, p_phone);
    
    SET p_user_id = LAST_INSERT_ID();
    
    COMMIT;
END //

DELIMITER ;