
ALTER PUBLICATION supabase_realtime ADD TABLE public.play_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.apple_subscriptions;
ALTER TABLE public.play_subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.apple_subscriptions REPLICA IDENTITY FULL;
