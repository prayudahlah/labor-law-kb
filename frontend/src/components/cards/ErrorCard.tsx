type Props = { pesan: string; status?: number };

/** Galat kirim: backend mati, CORS, atau respons 4xx/5xx. */
export default function ErrorCard({ pesan, status }: Props) {
  const bantuan =
    status && status >= 400 && status < 500
      ? 'Periksa kembali data yang dikirim, lalu coba lagi.'
      : 'Pastikan terminal backend masih berjalan, lalu ulangi pengiriman.';

  return (
    <section className="rounded-xl border border-danger bg-danger-soft px-3.5 py-3">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-danger">
        Gagal mengirim
      </p>
      <p className="mt-1 whitespace-pre-line text-[13.5px] leading-6 text-ink">{pesan}</p>
      <p className="mt-2 text-[12px] text-ink-muted">{bantuan}</p>
    </section>
  );
}
