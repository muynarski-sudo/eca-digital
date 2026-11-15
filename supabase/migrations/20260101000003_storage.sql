-- Buckets: 'audio' (referência, leitura para autenticados) e 'recordings' (gravações dos alunos, privado).
-- Só roda no Supabase (schema storage). Em outros ambientes é ignorado.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('audio', 'audio', false) on conflict (id) do nothing;
    insert into storage.buckets (id, name, public) values ('recordings', 'recordings', false) on conflict (id) do nothing;

    execute $p$create policy "audio_read" on storage.objects for select to authenticated using (bucket_id = 'audio')$p$;
    execute $p$create policy "recordings_own_insert" on storage.objects for insert to authenticated
      with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "recordings_own_select" on storage.objects for select to authenticated
      using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "recordings_own_delete" on storage.objects for delete to authenticated
      using (bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
end $$;
