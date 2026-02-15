INSERT INTO users (email, password, name, company_name, role, created_at, updated_at) 
SELECT 
    'admin@visit-platform.com',
    '$2a$10$PViAQCiP5k3VXoIrB94AT.kjesmXV.Z7uUUG1psmewUhUBFdjRwZi', -- password: admin123
    'Admin',
    'Platform Administrator',
    1, -- Admin role
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@visit-platform.com'
);
