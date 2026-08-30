-- Run this only if your current RLS policies do not already allow
-- the authenticated admin account to update and delete rows in public.votes.
--
-- This keeps the existing Supabase Auth login. The admin page still requires
-- a logged in Supabase user before the management controls are available.

create policy "Authenticated admins can update votes"
on public.votes
for update
to authenticated
using (true)
with check (true);

create policy "Authenticated admins can delete votes"
on public.votes
for delete
to authenticated
using (true);
