-- SECURITY DEFINER function: bypasses RLS so admins can update emergencies
CREATE OR REPLACE FUNCTION public.admin_update_emergency_status(
  p_emergency_id UUID,
  p_new_status TEXT
)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin') THEN
    RAISE EXCEPTION 'Only admins can perform this action';
  END IF;

  UPDATE public.emergency_requests
  SET status = p_new_status,
      responder_id = CASE WHEN p_new_status = 'cancelled' THEN NULL ELSE responder_id END,
      updated_at = now()
  WHERE id = p_emergency_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional RLS policy (works if the function above is not used)
DROP POLICY IF EXISTS "Admins can update emergency requests" ON public.emergency_requests;
CREATE POLICY "Admins can update emergency requests"
  ON public.emergency_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin());
