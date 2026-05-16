import { useState, useEffect, useCallback } from 'react';
import API from '@/src/services/api';
import {
    PsSettings,
    DEFAULT_SETTINGS,
} from '@/src/pages/admin/PersonnelServicesSettings';

function mergeWithDefaults(saved: Partial<PsSettings>): PsSettings {
    return {
        ...DEFAULT_SETTINGS,
        ...saved,
        ra:                 (saved.ra                 ?? DEFAULT_SETTINGS.ra).map(r => ({ ...r })),
        subsistence_depts:  (saved.subsistence_depts  ?? DEFAULT_SETTINGS.subsistence_depts).map(d => ({ ...d })),
        laundry_depts:      (saved.laundry_depts       ?? DEFAULT_SETTINGS.laundry_depts).map(d => ({ ...d })),
        magna_carta1_depts: (saved.magna_carta1_depts  ?? DEFAULT_SETTINGS.magna_carta1_depts).map(d => ({ ...d })),
        magna_carta2_depts: (saved.magna_carta2_depts  ?? DEFAULT_SETTINGS.magna_carta2_depts).map(d => ({ ...d })),
        magna_carta_rate:   saved.magna_carta_rate     ?? DEFAULT_SETTINGS.magna_carta_rate,
    };
}

export function usePsSettings() {
    const [settings, setSettings] = useState<PsSettings>(DEFAULT_SETTINGS);
    const [loading,  setLoading]  = useState(true);

    useEffect(() => {
        API.get('/ps-settings')
            .then(r => setSettings(mergeWithDefaults(r.data.data ?? {})))
            .catch(() => setSettings(DEFAULT_SETTINGS))
            .finally(() => setLoading(false));
    }, []);

    const save = useCallback(async (s: PsSettings) => {
        const r = await API.put('/ps-settings', s);
        const updated = mergeWithDefaults(r.data.data ?? s);
        setSettings(updated);
        return updated;
    }, []);

    return { settings, setSettings, loading, save };
}
