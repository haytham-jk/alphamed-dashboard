begin;

do $migration$
declare
  function_record record;
  current_definition text;
  updated_definition text;
  updated_count integer := 0;
begin
  for function_record in
    select
      procedure.oid,
      procedure.proname
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'add_customer_contact',
        'save_customer_with_contacts'
      )
  loop
    current_definition := pg_get_functiondef(function_record.oid);

    if current_definition like '%''Senior Lab Technician''%' then
      updated_count := updated_count + 1;
      continue;
    end if;

    updated_definition := regexp_replace(
      current_definition,
      '''Lab Technician'',([[:space:]]*)''Pathologist''',
      '''Lab Technician'',\1''Senior Lab Technician'',\1''Pathologist'''
    );

    if updated_definition = current_definition then
      raise exception
        'Unable to add Senior Lab Technician to %. The expected designation sequence was not found.',
        function_record.proname;
    end if;

    execute updated_definition;
    updated_count := updated_count + 1;
  end loop;

  if updated_count <> 2 then
    raise exception
      'Expected to update 2 customer contact functions, but found %.',
      updated_count;
  end if;
end;
$migration$;

commit;
