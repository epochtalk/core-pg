ALTER TABLE users.profiles ALTER COLUMN avatar SET DEFAULT '/static/img/avatar.png';
UPDATE users.profiles SET avatar = '/static/img/avatar.png' WHERE avatar IS NULL;
