-- Preserve current wholesale behavior until a product is explicitly configured.
alter table public.products
  add column if not exists wholesale_price_mode text not null default 'retail',
  add column if not exists wholesale_price numeric(14, 2),
  add column if not exists wholesale_cost_percentage numeric(7, 2);

alter table public.products
  drop constraint if exists products_wholesale_pricing_values_check;

with normalized as (
  select
    id,
    case
      when wholesale_price_mode = 'manual'
        and wholesale_price is not null
        and wholesale_price >= 0
        then 'manual'
      when wholesale_price_mode = 'cost_percentage'
        and wholesale_cost_percentage is not null
        and wholesale_cost_percentage >= 0
        and cost is not null
        then 'cost_percentage'
      when wholesale_price is not null
        and wholesale_price >= 0
        then 'manual'
      when wholesale_price is null
        and wholesale_cost_percentage is not null
        and wholesale_cost_percentage >= 0
        and cost is not null
        then 'cost_percentage'
      else 'retail'
    end as pricing_mode
  from public.products
)
update public.products as product
set
  wholesale_price_mode = normalized.pricing_mode,
  wholesale_price = case
    when normalized.pricing_mode = 'manual' then product.wholesale_price
    else null
  end,
  wholesale_cost_percentage = case
    when normalized.pricing_mode = 'cost_percentage' then product.wholesale_cost_percentage
    else null
  end
from normalized
where product.id = normalized.id
  and (
    product.wholesale_price_mode is distinct from normalized.pricing_mode
    or product.wholesale_price is distinct from case
      when normalized.pricing_mode = 'manual' then product.wholesale_price
      else null
    end
    or product.wholesale_cost_percentage is distinct from case
      when normalized.pricing_mode = 'cost_percentage' then product.wholesale_cost_percentage
      else null
    end
  );

alter table public.products
  add column if not exists wholesale_calculated_price numeric(14, 2)
  generated always as (
    case wholesale_price_mode
      when 'manual' then wholesale_price
      when 'cost_percentage' then round(cost * (1 + wholesale_cost_percentage / 100), 2)
      else price
    end
  ) stored;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_wholesale_price_mode_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_wholesale_price_mode_check
      check (wholesale_price_mode in ('retail', 'manual', 'cost_percentage'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_wholesale_pricing_values_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_wholesale_pricing_values_check
      check (
        (wholesale_price is null or wholesale_price >= 0)
        and (wholesale_cost_percentage is null or wholesale_cost_percentage >= 0)
        and (
          (wholesale_price_mode = 'retail' and wholesale_price is null and wholesale_cost_percentage is null)
          or (wholesale_price_mode = 'manual' and wholesale_price is not null and wholesale_cost_percentage is null)
          or (
            wholesale_price_mode = 'cost_percentage'
            and wholesale_price is null
            and wholesale_cost_percentage is not null
            and cost is not null
          )
        )
      );
  end if;
end
$$;
