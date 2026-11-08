type Props = { pesan: string };

/** Galat kirim: backend mati, CORS, atau respons 4xx/5xx. */
export default function ErrorCard({ pesan }: Props) {
  return (
    <section className="rounded-xl border border-danger bg-danger-soft px-3.5 py-3">
      <p className="text-[11.5px] font-semibold uppercase tracking-wide text-danger">
        Gagal mengirim
      </p>
      <p className="mt-1 text-[13.5px] leading-6 text-ink">{pesan}</p>
      <p className="mt-2 text-[12px] text-ink-muted">
        Pastikan terminal backend masih berjalan, lalu ulangi pengiriman.
      </p>
    </section>
  );
}
