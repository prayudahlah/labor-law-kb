import { IconDoc } from '../common/icons';

/** Placeholder mode "Asistensi Dokumen" — menunggu endpoint backend. */
export default function ComingSoonCard() {
  return (
    <div className="flex flex-col items-center px-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold-soft text-gold-text">
        <IconDoc className="h-7 w-7" />
      </span>

      <h2 className="mt-5 text-xl font-semibold text-ink">Fitur akan datang</h2>

      <p className="mt-2 max-w-md text-[14px] leading-6 text-ink-muted">
        Menu <span className="font-medium text-ink">Asistensi Dokumen</span> sedang disiapkan.
        Nantinya daftar ketentuan dan pasal yang perlu masuk ke dokumen Anda akan muncul di sini.
      </p>

      <span className="mt-5 rounded-full border border-line bg-surface px-3 py-1 text-[11.5px] font-medium text-ink-muted">
        Menunggu endpoint backend
      </span>
    </div>
  );
}
