import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery<PsSettings>({
        queryKey: ['ps-settings'],
        queryFn: () =>
            API.get('/ps-settings')
                .then(r => mergeWithDefaults(r.data.data ?? {}))
                .catch(() => DEFAULT_SETTINGS),
    });

    // Local optimistic override so callers can still do setSettings(s) for instant UI feedback
    const [localOverride, setLocalOverride] = useState<PsSettings | null>(null);
    const settings = localOverride ?? data ?? DEFAULT_SETTINGS;

    const setSettings = useCallback((s: PsSettings) => {
        setLocalOverride(s);
    }, []);

    const save = useCallback(async (s: PsSettings) => {
        const r = await API.put('/ps-settings', s);
        const updated = mergeWithDefaults(r.data.data ?? s);
        queryClient.setQueryData(['ps-settings'], updated);
        setLocalOverride(null); // clear override now that cache has the saved value
        return updated;
    }, [queryClient]);

    return { settings, setSettings, loading: isLoading, save };
}
