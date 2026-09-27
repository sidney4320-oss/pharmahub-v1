/*
# Create storage bucket for resource files

Creates a private storage bucket 'resources' for user-uploaded files (PDFs, images, text).
Adds storage policies so authenticated users can only manage their own files (path prefix = user id).
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', false)
ON CONFLICT (id) DO NOTHING;

-- Policies: users manage files under their own user-id folder
DROP POLICY IF EXISTS "users upload own resources" ON storage.objects;
CREATE POLICY "users upload own resources"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users read own resources" ON storage.objects;
CREATE POLICY "users read own resources"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users delete own resources" ON storage.objects;
CREATE POLICY "users delete own resources"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "users update own resources" ON storage.objects;
CREATE POLICY "users update own resources"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'resources' AND (storage.foldername(name))[1] = auth.uid()::text);
