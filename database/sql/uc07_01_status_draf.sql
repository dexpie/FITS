-- Jalankan bagian ini terlebih dahulu, terpisah dari migration kedua.
alter type public.status_pertanyaan add value if not exists 'Draf';
