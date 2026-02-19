-- Extend logo_url column to support longer MinIO paths
ALTER TABLE visit_cards MODIFY COLUMN logo_url VARCHAR(500);
