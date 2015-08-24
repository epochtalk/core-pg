CREATE TABLE private_conversations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at timestamp with time zone
);

CREATE TABLE private_messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES private_conversations (id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users (id) ON DELETE CASCADE,
  receiver_id uuid REFERENCES users (id) ON DELETE CASCADE,
  copied_ids uuid[],
  body text DEFAULT '' NOT NULL,
  created_at timestamp with time zone,
  viewed boolean DEFAULT false
);
CREATE INDEX index_conversation_id_on_private_messages ON private_messages (conversation_id);
CREATE INDEX index_sender_id_on_private_messages ON private_messages (sender_id);
CREATE INDEX index_receiver_id_on_private_messages ON private_messages (receiver_id);
CREATE INDEX index_created_at_on_private_messages ON private_messages (created_at DESC);
