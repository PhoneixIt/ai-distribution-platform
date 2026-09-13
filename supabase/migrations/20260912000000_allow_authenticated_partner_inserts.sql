create policy "Authenticated users can insert partners"
on public.partners
for insert
to authenticated
with check (true);