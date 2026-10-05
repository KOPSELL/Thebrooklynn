
CREATE POLICY "Anyone can update appointments" ON public.appointments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete appointments" ON public.appointments FOR DELETE USING (true);
