INSERT INTO users (username, password_hash, email, full_name, role, is_active)
VALUES
  ('admin', '$2a$10$A0xpVOMa8s.S1SN.g2ppV.39hKf085x83pchpR3XegPJL.xGiHi92', 'admin@phoubon.local', 'System Administrator', 'admin', 1),
  ('manager', '$2a$10$A0xpVOMa8s.S1SN.g2ppV.39hKf085x83pchpR3XegPJL.xGiHi92', 'manager@phoubon.local', 'Inventory Manager', 'manager', 1),
  ('staff', '$2a$10$A0xpVOMa8s.S1SN.g2ppV.39hKf085x83pchpR3XegPJL.xGiHi92', 'staff@phoubon.local', 'Inventory Staff', 'staff', 1);
