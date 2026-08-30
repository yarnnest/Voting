create table public.admin_users (
    user_id uuid primary key
        references auth.users(id)
        on delete cascade
);


create table public.voting_pages (
    id uuid primary key
        default gen_random_uuid(),

    title text not null,

    slug text unique not null,

    image1_url text not null,

    image1_name text not null,

    image2_url text not null,

    image2_name text not null,

    is_published boolean
        default true,

    created_at timestamptz
        default now()
);


create table public.votes (
    id uuid primary key
        default gen_random_uuid(),

    page_id uuid not null
        references public.voting_pages(id)
        on delete cascade,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    voter_name text not null,

    vote integer not null
        check (vote in (1, 2)),

    comment text,

    created_at timestamptz
        default now(),

    unique(page_id, user_id)
);