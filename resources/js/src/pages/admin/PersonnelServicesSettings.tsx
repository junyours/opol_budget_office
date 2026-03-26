import React, { useEffect, useState } from 'react';
import { PS_CONFIG } from '@/src/config/PSConfig';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Settings } from 'lucide-react';
import { Badge } from '@/src/components/ui/badge';
import { XMarkIcon } from '@heroicons/react/24/outline';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RaRow {
  from: number;
  to: number;
  monthly: number;
}

export interface DeptEligibility {
  dept_id: number;
  label: string;
}

export interface PsSettings {
  pera_monthly: number;
  retirement_rate: number;
  pagibig_rate: number;
  philhealth_rate: number;
  philhealth_cap: number;
  ecip_rate: number;
  ecip_cap: number;
  annual_threshold: number;
  // Subsistence
  subsistence_threshold: number;
  subsistence_monthly: number;
  subsistence_depts: DeptEligibility[];
  // Laundry
  laundry_threshold: number;
  laundry_monthly: number;
  laundry_depts: DeptEligibility[];
  // Magna Carta
  magna_carta_rate: number;           // shared rate (% expressed as decimal × 100 for display)
  magna_carta1_depts: DeptEligibility[];   // Health Benefits
  magna_carta2_depts: DeptEligibility[];   // PSW RA 9433
  // Other
  clothing_annual: number;
  productivity_annual: number;
  cash_gift_annual: number;
  other_benefits_days: number;
  ra: RaRow[];
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: PsSettings = {
  pera_monthly:          PS_CONFIG.pera.monthly,
  retirement_rate:       PS_CONFIG.retirement.rate * 100,
  pagibig_rate:          PS_CONFIG.pagibig.rate * 100,
  philhealth_rate:       PS_CONFIG.philHealth.rate * 100,
  philhealth_cap:        PS_CONFIG.philHealth.monthlyCap,
  ecip_rate:             PS_CONFIG.ecip.rate * 100,
  ecip_cap:              PS_CONFIG.ecip.annualCap,
  annual_threshold:      PS_CONFIG.annualThreshold,
  subsistence_threshold: PS_CONFIG.subsistenceThreshold,
  subsistence_monthly:   PS_CONFIG.subsistence.monthly,
  subsistence_depts:     PS_CONFIG.subsistenceDepts.map(d => ({ ...d })),
  laundry_threshold:     PS_CONFIG.laundryThreshold,
  laundry_monthly:       PS_CONFIG.laundry.monthly,
  laundry_depts:         PS_CONFIG.laundryDepts.map(d => ({ ...d })),
  magna_carta_rate:      PS_CONFIG.magnaCarta.rate * 100,
  magna_carta1_depts:    PS_CONFIG.magnaCarta1Depts.map(d => ({ ...d })),
  magna_carta2_depts:    PS_CONFIG.magnaCarta2Depts.map(d => ({ ...d })),
  clothing_annual:       PS_CONFIG.clothing.annual,
  productivity_annual:   PS_CONFIG.productivity.annual,
  cash_gift_annual:      PS_CONFIG.cashGift.annual,
  other_benefits_days:   PS_CONFIG.otherBenefits.days,
  ra:                    PS_CONFIG.ra.map(r => ({ ...r })),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function computeRa(salaryGrade: number, ra: RaRow[]): number {
  const rule = [...ra]
    .sort((a, b) => b.from - a.from)
    .find(r => salaryGrade >= r.from && salaryGrade <= r.to);
  return rule ? rule.monthly * 12 : 0;
}

export function isDeptEligible(deptId: number, list: DeptEligibility[]): boolean {
  return list.some(d => d.dept_id === deptId);
}

// ── Sub-components ────────────────────────────────────────────────────────────

const NumField: React.FC<{
  label: string;
  hint?: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}> = ({ label, hint, value, step = 1, onChange }) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    <Input
      type="number"
      step={step}
      value={value}
      onChange={e => onChange(parseFloat(e.target.value) || 0)}
      className="h-8 text-sm"
    />
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const DeptEligibilityEditor: React.FC<{
  label: string;
  hint?: string;
  depts: DeptEligibility[];
  onChange: (depts: DeptEligibility[]) => void;
}> = ({ label, hint, depts, onChange }) => {
  const [newId,    setNewId]    = useState<string>('');
  const [newLabel, setNewLabel] = useState<string>('');

  const handleAdd = () => {
    const id = parseInt(newId);
    if (!id || isNaN(id)) return;
    if (depts.some(d => d.dept_id === id)) return;
    onChange([...depts, { dept_id: id, label: newLabel.trim() || `Dept ${id}` }]);
    setNewId('');
    setNewLabel('');
  };

  const handleRemove = (dept_id: number) =>
    onChange(depts.filter(d => d.dept_id !== dept_id));

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {depts.length === 0 && (
          <span className="text-xs text-muted-foreground italic">No departments — allowance disabled for all</span>
        )}
        {depts.map(d => (
          <Badge key={d.dept_id} variant="secondary" className="flex items-center gap-1 pr-1 text-xs font-mono">
            <span className="text-[10px] text-muted-foreground mr-0.5">#{d.dept_id}</span>
            {d.label}
            <button
              type="button"
              onClick={() => handleRemove(d.dept_id)}
              className="ml-0.5 rounded-sm hover:bg-destructive/20 p-0.5 transition-colors"
              title={`Remove dept ${d.dept_id}`}
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2 items-end">
        <div className="space-y-1 w-24">
          <Label className="text-[10px] text-muted-foreground">Dept ID</Label>
          <Input
            type="number"
            min={1}
            placeholder="e.g. 21"
            value={newId}
            onChange={e => setNewId(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1 flex-1">
          <Label className="text-[10px] text-muted-foreground">Label (optional)</Label>
          <Input
            placeholder="e.g. (MHO)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            className="h-7 text-xs"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!newId}>
          + Add
        </Button>
      </div>
    </div>
  );
};

// ── Settings Dialog ───────────────────────────────────────────────────────────

interface Props {
  settings: PsSettings;
  onChange: (s: PsSettings) => void;
}

export const PersonnelServicesSettings: React.FC<Props> = ({ settings, onChange }) => {
  const [open,  setOpen]  = useState(false);
  const [local, setLocal] = useState<PsSettings>(() => deepClone(settings));

  useEffect(() => { setLocal(deepClone(settings)); }, [settings]);

  function deepClone(s: PsSettings): PsSettings {
    return {
      ...s,
      ra:                  s.ra.map(r => ({ ...r })),
      subsistence_depts:   (s.subsistence_depts  ?? DEFAULT_SETTINGS.subsistence_depts).map(d => ({ ...d })),
      laundry_depts:       (s.laundry_depts       ?? DEFAULT_SETTINGS.laundry_depts).map(d => ({ ...d })),
      magna_carta1_depts:  (s.magna_carta1_depts  ?? DEFAULT_SETTINGS.magna_carta1_depts).map(d => ({ ...d })),
      magna_carta2_depts:  (s.magna_carta2_depts  ?? DEFAULT_SETTINGS.magna_carta2_depts).map(d => ({ ...d })),
      magna_carta_rate:    s.magna_carta_rate ?? DEFAULT_SETTINGS.magna_carta_rate,
    };
  }

  const set = (key: keyof PsSettings, value: number) =>
    setLocal(prev => ({ ...prev, [key]: value }));

  const setRa = (i: number, field: keyof RaRow, value: number) =>
    setLocal(prev => {
      const ra = prev.ra.map((r, idx) => idx === i ? { ...r, [field]: value } : r);
      return { ...prev, ra };
    });

  const addRaRow    = () => setLocal(prev => ({ ...prev, ra: [...prev.ra, { from: 1, to: 1, monthly: 0 }] }));
  const removeRaRow = (i: number) => setLocal(prev => ({ ...prev, ra: prev.ra.filter((_, idx) => idx !== i) }));

  const handleApply = () => { onChange(local); setOpen(false); };

  const handleReset = () => {
    const fresh = deepClone(DEFAULT_SETTINGS);
    setLocal(fresh);
    onChange(fresh);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Calculation settings
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personnel services — calculation settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="contributions">
          <TabsList className="w-full">
            <TabsTrigger value="contributions" className="flex-1">Contributions</TabsTrigger>
            <TabsTrigger value="allowances"    className="flex-1">Allowances</TabsTrigger>
            <TabsTrigger value="magna_carta"   className="flex-1">Magna Carta</TabsTrigger>
            <TabsTrigger value="ra"            className="flex-1">RA / TA</TabsTrigger>
          </TabsList>

          {/* ── Contributions ────────────────────────────────────────────── */}
          <TabsContent value="contributions" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <NumField label="PERA monthly (₱)"           hint="Annual = monthly × 12"   value={local.pera_monthly}       step={100}  onChange={v => set('pera_monthly', v)} />
              <NumField label="Retirement insurance (%)"   hint="% of annual salary"       value={local.retirement_rate}    step={0.5}  onChange={v => set('retirement_rate', v)} />
              <NumField label="Pag-IBIG rate (%)"          hint="% of monthly × 12"        value={local.pagibig_rate}       step={0.5}  onChange={v => set('pagibig_rate', v)} />
              <NumField label="PhilHealth rate (%)"        hint="% of monthly salary"      value={local.philhealth_rate}    step={0.5}  onChange={v => set('philhealth_rate', v)} />
              <NumField label="PhilHealth monthly cap (₱)" hint="Max monthly contribution" value={local.philhealth_cap}     step={50}   onChange={v => set('philhealth_cap', v)} />
              <NumField label="ECIP rate (%)"              hint="% of annual salary"       value={local.ecip_rate}          step={0.1}  onChange={v => set('ecip_rate', v)} />
              <NumField label="ECIP annual cap (₱)"        hint="Max annual ECIP"          value={local.ecip_cap}           step={100}  onChange={v => set('ecip_cap', v)} />
            </div>
          </TabsContent>

          {/* ── Allowances ───────────────────────────────────────────────── */}
          <TabsContent value="allowances" className="space-y-5 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <NumField label="Min annual for Clothing / Productivity / Cash Gift (₱)" value={local.annual_threshold}    step={1000} onChange={v => set('annual_threshold', v)} />
              <NumField label="Clothing allowance annual (₱)"                          value={local.clothing_annual}     step={500}  onChange={v => set('clothing_annual', v)} />
              <NumField label="Productivity incentive annual (₱)"                      value={local.productivity_annual} step={500}  onChange={v => set('productivity_annual', v)} />
              <NumField label="Cash gift annual (₱)"                                   value={local.cash_gift_annual}    step={500}  onChange={v => set('cash_gift_annual', v)} />
              <NumField label="Other benefits (days)" hint="(monthly / 22) × days"    value={local.other_benefits_days} step={1}    onChange={v => set('other_benefits_days', v)} />
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Subsistence Allowance</p>
              <div className="grid grid-cols-2 gap-4">
                <NumField label="Min annual salary to qualify (₱)" value={local.subsistence_threshold} step={1000} onChange={v => set('subsistence_threshold', v)} />
                <NumField label="Monthly amount (₱)" hint="Annual = monthly × 12"                     value={local.subsistence_monthly}  step={50}   onChange={v => set('subsistence_monthly', v)} />
              </div>
              <DeptEligibilityEditor
                label="Eligible departments"
                hint="Only positions in these departments receive Subsistence Allowance."
                depts={local.subsistence_depts}
                onChange={depts => setLocal(prev => ({ ...prev, subsistence_depts: depts }))}
              />
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Laundry Allowance</p>
              <div className="grid grid-cols-2 gap-4">
                <NumField label="Min annual salary to qualify (₱)" value={local.laundry_threshold} step={1000} onChange={v => set('laundry_threshold', v)} />
                <NumField label="Monthly amount (₱)" hint="Annual = monthly × 12"                  value={local.laundry_monthly}  step={50}   onChange={v => set('laundry_monthly', v)} />
              </div>
              <DeptEligibilityEditor
                label="Eligible departments"
                hint="Only positions in these departments receive Laundry Allowance."
                depts={local.laundry_depts}
                onChange={depts => setLocal(prev => ({ ...prev, laundry_depts: depts }))}
              />
            </div>
          </TabsContent>

          {/* ── Magna Carta ───────────────────────────────────────────────── */}
          <TabsContent value="magna_carta" className="space-y-5 pt-4">
            <p className="text-xs text-muted-foreground">
              Both Magna Carta benefits use the same rate applied to the annual salary.
              Their combined total is saved to the <span className="font-medium">Hazard Pay</span> expense item.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <NumField
                label="Magna Carta rate (%)"
                hint="% of annual salary — applied to both columns"
                value={local.magna_carta_rate}
                step={0.5}
                onChange={v => set('magna_carta_rate', v)}
              />
            </div>

            {/* Magna Carta Health Benefits */}
            <div className="border rounded-lg p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Magna Carta Health Benefits
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Republic Act 7305 — for health workers
                </p>
              </div>
              <DeptEligibilityEditor
                label="Eligible departments"
                hint="Only positions in these departments receive Magna Carta Health Benefits."
                depts={local.magna_carta1_depts}
                onChange={depts => setLocal(prev => ({ ...prev, magna_carta1_depts: depts }))}
              />
            </div>

            {/* Magna Carta PSW RA 9433 */}
            <div className="border rounded-lg p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Magna Carta PSW RA 9433
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Republic Act 9433 — for social welfare workers
                </p>
              </div>
              <DeptEligibilityEditor
                label="Eligible departments"
                hint="Only positions in these departments receive Magna Carta PSW RA 9433."
                depts={local.magna_carta2_depts}
                onChange={depts => setLocal(prev => ({ ...prev, magna_carta2_depts: depts }))}
              />
            </div>
          </TabsContent>

          {/* ── RA / TA ──────────────────────────────────────────────────── */}
          <TabsContent value="ra" className="space-y-3 pt-4">
            <p className="text-xs text-muted-foreground">
              TA always equals RA. Rows are matched highest grade first.
            </p>
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Grade from</span><span>Grade to</span><span>RA monthly (₱)</span><span />
              </div>
              {local.ra.map((row, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-center">
                  <Input type="number" min={1} max={40} value={row.from}    onChange={e => setRa(i, 'from',    parseInt(e.target.value)  || 1)} className="h-8 text-sm" />
                  <Input type="number" min={1} max={40} value={row.to}      onChange={e => setRa(i, 'to',      parseInt(e.target.value)  || 1)} className="h-8 text-sm" />
                  <Input type="number" step={500}        value={row.monthly} onChange={e => setRa(i, 'monthly', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                  <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-destructive" onClick={() => removeRaRow(i)}>✕</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addRaRow} className="mt-1">+ Add row</Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="ghost" size="sm" onClick={handleReset}>Reset to defaults</Button>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonnelServicesSettings;