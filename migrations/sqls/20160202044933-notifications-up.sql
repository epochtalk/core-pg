CREATE TABLE notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id uuid REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  data JSON,
  created_at timestamp with time zone,
  viewed boolean DEFAULT false
);
