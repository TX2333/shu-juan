-- 创建音频资产 bucket（公开读取）
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-assets', 'audio-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 公开读取策略
CREATE POLICY "allow_public_read_audio_assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-assets');

-- Service Role 写入策略
CREATE POLICY "allow_service_role_upload_audio_assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-assets');