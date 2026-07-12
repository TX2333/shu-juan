INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-audio', 'generated-audio', true);

CREATE POLICY "allow_public_read_generated_audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-audio');

CREATE POLICY "allow_service_role_upload_generated_audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-audio');