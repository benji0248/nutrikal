-- PR3: título opcional para listar conversaciones en el panel de historial.

ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS title TEXT;
