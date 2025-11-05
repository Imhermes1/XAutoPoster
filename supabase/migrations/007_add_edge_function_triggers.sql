-- Create function to trigger analysis on candidate insert
create or replace function trigger_analyze_content()
returns trigger as $$
begin
  perform
    net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/analyze-content',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('candidateId', new.id)
    );
  return new;
end;
$$ language plpgsql;

-- Create function to trigger generation when analysis completes
create or replace function trigger_generate_tweet()
returns trigger as $$
begin
  if new.analysis_score is not null and old.analysis_score is null then
    update bulk_post_queue set status = 'analyzed' where id = new.id;
    perform
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/generate-tweet',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object('candidateId', new.id)
      );
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_candidate_created on bulk_post_queue;
drop trigger if exists on_analysis_complete on bulk_post_queue;

create trigger on_candidate_created
  after insert on bulk_post_queue
  for each row
  execute function trigger_analyze_content();

create trigger on_analysis_complete
  after update on bulk_post_queue
  for each row
  execute function trigger_generate_tweet();
