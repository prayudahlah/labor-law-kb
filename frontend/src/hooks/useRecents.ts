import { useCallback, useEffect, useMemo, useState } from 'react';

import { applyFilter, groupByHari, type RecentsGroup } from '../lib/recents';
import { recentsService } from '../services/recentsService';
import type { RecentsFilter } from '../types/app';
import type { Recent } from '../types/chat';

/** State riwayat: muat data, saring (chip + search), kelompokkan per hari. */
export function useRecents() {
  const [items, setItems] = useState<Recent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RecentsFilter>('semua');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let hidup = true;
    recentsService
      .list()
      .then((list) => {
        if (!hidup) return;
        setItems(list);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('[recents] gagal memuat riwayat.', err);
        if (hidup) setLoading(false);
      });
    return () => {
      hidup = false;
    };
  }, []);

  const terlihat = useMemo(
    () => groupByHari(applyFilter(items, filter, query)),
    [items, filter, query],
  );

  const refresh = useCallback(async () => {
    setItems(await recentsService.list());
  }, []);

  /** Simpan/timpa satu entri riwayat, lalu muat ulang daftar. */
  const save = useCallback(async (recents: Recent) => {
    await recentsService.save(recents);
    setItems(await recentsService.list());
  }, []);

  return {
    items,
    terlihat,
    loading,
    filter,
    setFilter,
    query,
    setQuery,
    refresh,
    save,
  };
}

export type RecentsApi = ReturnType<typeof useRecents>;
export type { RecentsGroup };
