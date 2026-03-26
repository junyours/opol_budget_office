{{--
    resources/views/reports/budget-forms-unified.blade.php
    ═══════════════════════════════════════════════════════
    UNIFIED LBP FORMS 1–5 — single blade, uniform typography.

    Variables injected by UnifiedReportController::renderHtml():
      $mode        : 'form1' | 'dept' | 'form5'
      $data        : payload — shape depends on mode
      $forms       : array e.g. ['form2','form3','form4'] — used in 'dept' mode
      $reportData  : legacy compat — null when unused

    Orientation:
      form5  → landscape legal (14in × 8.5in)
      others → portrait  legal  (8.5in × 14in)
--}}
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>

/* ═══════════════════════════════════════════════════════
   PAGE SIZE + MARGINS
═══════════════════════════════════════════════════════ */
@if(isset($mode) && ($mode === 'form5' || $mode === 'calamity5'))
@page { size: 14in 8.5in landscape; margin: 0; }
@else
@page { size: 8.5in 14in portrait;  margin: 0; }
@endif

/* ═══════════════════════════════════════════════════════
   BASE TYPOGRAPHY
═══════════════════════════════════════════════════════ */
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
    font-family: 'DejaVu Sans', Arial, sans-serif;
    font-size: 7pt;
    color: #000;
}
@if(isset($mode) && ($mode === 'form5' || $mode === 'calamity5'))
body {
    margin-top:    76pt;
    margin-bottom: 36pt;
    margin-left:   36pt;
    margin-right:  36pt;
}
.wrap { width: 936pt; }
@else
body {
    /* Portrait — binding at LEFT */
    margin-top:    36pt;
    margin-bottom: 36pt;
    margin-left:   76pt;
    margin-right:  36pt;
}
.wrap { width: 500pt; } /* 612pt - 76pt - 36pt */
@endif

.page            { width: 100%; page-break-after: always; }
.page:last-child { page-break-after: avoid; }

.form-no      { font-weight: bold; font-size: 7pt; margin-bottom: 2px; }
.doc-title    { text-align: center; font-weight: bold; font-size: 8pt;
                text-transform: uppercase; line-height: 1.4; margin-bottom: 2px; }
.fund-label   { text-align: center; font-size: 7pt; font-weight: bold; margin-bottom: 3px; }
.office-label { text-align: center; font-size: 7pt; font-weight: bold; margin-bottom: 3px; }
.lgu-line     { text-align: center; font-size: 7pt; font-weight: bold; margin-bottom: 1px; }
.cy-line      { text-align: center; font-size: 7pt; margin-bottom: 5px; }

/* ═══════════════════════════════════════════════════════
   UNIFIED DATA TABLE  (Forms 1–4)
═══════════════════════════════════════════════════════ */
table.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7pt;
    table-layout: fixed;
}
table.data-table th,
table.data-table td {
    border: 1px solid #000;
    padding: 2px 4px;
    vertical-align: middle;
    line-height: 1.5;
    word-break: break-word;
}
table.data-table th {
    text-align: center;
    font-weight: bold;

}
table.data-table td.r  { text-align: right; }
table.data-table td.c  { text-align: center; }
table.data-table td.l  { text-align: left; }

tr.sec-hdr   td { font-weight: bold; }
tr.subtotal  td { font-weight: bold; }
tr.grand     td { font-weight: bold; }
tr.grand-total td { font-weight: bold;  }
tr.col-num   td { text-align: center; font-size: 6.5pt;  }
tr.total-row td { font-weight: bold;  }

/* ═══════════════════════════════════════════════════════
   FORM 5 TABLE  (landscape — slightly smaller)
═══════════════════════════════════════════════════════ */
table.form5-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 6.5pt;
    table-layout: fixed;
}
table.form5-table th,
table.form5-table td {
    border: 1px solid #000;
    padding: 2px 3px;
    vertical-align: middle;
    line-height: 1.4;
    word-break: break-word;
}
table.form5-table th { text-align: center; font-weight: bold; }
table.form5-table td.r { text-align: right; }
table.form5-table td.c { text-align: center; }
table.form5-table td.l { text-align: left; }

/* ═══════════════════════════════════════════════════════
   MMV TABLE  (Form 3 intro)
═══════════════════════════════════════════════════════ */
table.mmv-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7pt;
    margin-bottom: 4px;
}
table.mmv-table td {
    border: 1px solid #000;
    padding: 2px 4px;
    vertical-align: top;
    word-break: break-word;
}

/* ═══════════════════════════════════════════════════════
   SIGNATURE BLOCKS
═══════════════════════════════════════════════════════ */
table.sig-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0;
    font-size: 6.5pt;
    border: 1px solid #000;
}
table.sig-table td {
    border: 1px solid #000;
    text-align: center;
    vertical-align: top;
    padding: 8px 4px 4px 4px;
}
table.sig-plain {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
    font-size: 7pt;
}
table.sig-plain td { border: none; vertical-align: bottom; padding: 0 4px; }

.sig-name  { font-weight: bold; font-size: 7pt; margin-top: 28px; display: block; }
.sig-title { font-size: 6.5pt; display: block; }


</style>
</head>
<body>
<div class="wrap">

@php
/* ──────────────────────────────────────────────────
   SHARED FORMATTERS  — used by every partial below
────────────────────────────────────────────────── */
$reportData  = $reportData  ?? null;
$forms       = $forms       ?? [];
$mode        = $mode        ?? 'form1';

// Safety fallback — controller should always pass $signatories
// but if it doesn't (e.g. old cached controller), use empty defaults
if (!isset($signatories)) {
    $blank = ['name' => '', 'title' => ''];
    $signatories = [
        'budget_officer' => $blank, 'administrator' => $blank,
        'mpdc'           => $blank, 'treasurer'     => $blank,
        'mayor'          => $blank, 'hrmo'          => $blank,
        'accountant'     => $blank,
    ];
}

// peso()       — data row: P + number, blank when 0
$peso = function($n): string {
    if ((float)$n == 0) return '';
    return chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0) . number_format((float)$n, 0);
};
// pesoA()      — totals: always ₱
$pesoA = function($n): string {
    return chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0) . number_format((float)$n, 0);
};
// num()        — continuation: number only, blank when 0
$num = function($n): string {
    if ((float)$n == 0) return '';
    return number_format((float)$n, 0);
};
// numA()       — always show, 0 → '0'
$numA = function($n): string {
    return number_format((float)$n, 0);
};
// num2()       — 2-decimal, dash when 0  (Form 5)
$num2 = function($n): string {
    if ((float)$n == 0) return ' - ';
    return ' ' . number_format((float)$n, 2) . ' ';
};
// aliases for legacy Form 2/3/4 partials
$pesoAlways = $pesoA;
$numAlways  = function($n): string { return number_format((float)$n, 0); };
$pesoInt    = function($n): string { return chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0) . number_format((float)$n, 0); };
$signed     = function($n): string {
    $v = (float)$n;
    return ($v == 0) ? '0' : (($v > 0 ? '+' : '') . number_format($v, 0));
};
$bucket = function(array $items, string $keyword): array {
    return array_values(array_filter($items,
        fn($i) => str_contains(strtolower(trim($i['classification'] ?? '')), strtolower($keyword))
    ));
};
$sumCol = fn(array $rows, string $field): float =>
    (float) array_sum(array_column($rows, $field));
@endphp

{{-- ════════════════════════════════════════════════════════════════════════
     DISPATCH BY MODE
════════════════════════════════════════════════════════════════════════ --}}

{{-- ── FORM 1  (B.E.S.F.) ──────────────────────────────────────────────── --}}
@if($mode === 'form1')

@foreach($data['forms'] as $form)
@php
$fields5     = ['past_total','current_sem1','current_sem2','current_total','proposed'];
$income      = $form['income'];
$expenseRows = $form['expense_rows'];
$aipRows     = $form['aip_rows'];
$mdfRows     = $form['mdf_rows']      ?? [];
$mdfDebtRows = $form['mdf_debt_rows'] ?? [];
$ldrrmfRows  = $form['ldrrmf_rows']   ?? [];
$label       = $form['label'];
$propYear    = $data['proposed_year'];
$currYear    = $data['current_year'];
$pastYear    = $data['past_year'];
$lgu         = strtoupper($data['budget_plan']->lgu_name ?? 'OPOL, MISAMIS ORIENTAL');

/* Grand income total */
$grandIncome = array_fill_keys($fields5, 0.0);
$beginRow    = null;
foreach ($income as $r) { if ($r['name'] === 'Beginning Cash Balance') { $beginRow = $r; break; } }
if ($beginRow) foreach ($fields5 as $f) $grandIncome[$f] += (float)($beginRow[$f] ?? 0);
foreach ($income as $r) {
    if (!($r['is_subtotal'] ?? false)) continue;
    if (stripos($r['name'], 'Non-Income') !== false) continue;
    foreach ($fields5 as $f) $grandIncome[$f] += (float)($r[$f] ?? 0);
}

/* Expense classification grouping */
$psGroup = null; $mooeGroup = null; $coGroup = null; $otherGroups = [];
foreach ($expenseRows as $grp) {
    $n = strtolower($grp['class_name']);
    if      (str_contains($n, 'personal'))                               $psGroup     = $grp;
    else if (str_contains($n, 'maintenance') || str_contains($n,'mooe')) $mooeGroup   = $grp;
    else if (str_contains($n, 'capital') || str_contains($n, 'prop'))    $coGroup     = $grp;
    else                                                                   $otherGroups[] = $grp;
}
$subTotals = function($grp) use ($fields5, $sumCol): array {
    if (!$grp) return array_fill_keys($fields5, 0.0);
    return array_combine($fields5, array_map(fn($f) => $sumCol($grp['items'], $f), $fields5));
};
$psSub   = $subTotals($psGroup);
$mooeSub = $subTotals($mooeGroup);
$coSub   = $subTotals($coGroup);

/* Flat MDF line list */
$allMdfLines = [];
$debtGrouped = [];
foreach ($mdfDebtRows as $dr) {
    $key = $dr['obligation_name'] ?? $dr['name'];
    $debtGrouped[$key][$dr['debt_type']] = $dr;
}
foreach ($debtGrouped as $obName => $types) {
    if (isset($types['principal']))
        $allMdfLines[] = array_merge($types['principal'], ['kind'=>'debt-principal','display_name'=>$obName.' - Principal']);
    if (isset($types['interest']))
        $allMdfLines[] = array_merge($types['interest'],  ['kind'=>'debt-interest', 'display_name'=>'- Interest']);
}
foreach ($mdfRows as $mr)
    $allMdfLines[] = array_merge($mr, ['kind'=>'regular','display_name'=>$mr['name']]);

/* MDF + LDRRMF grand */
$mdfGrand = array_fill_keys($fields5, 0.0);
foreach ($allMdfLines as $ml) foreach ($fields5 as $f) $mdfGrand[$f] += (float)($ml[$f] ?? 0);
foreach ($ldrrmfRows  as $lr) foreach ($fields5 as $f) $mdfGrand[$f] += (float)($lr[$f] ?? 0);

/* AIP grand */
$aipGrand = array_fill_keys($fields5, 0.0);
foreach ($aipRows as $r) foreach ($fields5 as $f) $aipGrand[$f] += (float)($r[$f] ?? 0);

/* Total Expenditures */
$expGrand = array_fill_keys($fields5, 0.0);
foreach ($fields5 as $f) {
    $expGrand[$f] = $psSub[$f] + $mooeSub[$f] + $coSub[$f] + $mdfGrand[$f] + $aipGrand[$f];
    foreach ($otherGroups as $og) $expGrand[$f] += $sumCol($og['items'], $f);
}
$endBal = array_combine($fields5, array_map(fn($f) => $grandIncome[$f] - $expGrand[$f], $fields5));

/* Ordered classification groups */
$clsGroups = [];
if ($psGroup   && count($psGroup['items'])   > 0)
    $clsGroups[] = ['type'=>'ps',   'grp'=>$psGroup,   'label'=>'Personal Services, (PS)',                            'totalLabel'=>'Total Personal Services'];
if ($mooeGroup && count($mooeGroup['items']) > 0)
    $clsGroups[] = ['type'=>'mooe', 'grp'=>$mooeGroup, 'label'=>'Maint. &amp; Other Operating Expenditures, (MOOE)', 'totalLabel'=>'Total MOOE'];
if ($coGroup   && count($coGroup['items'])   > 0)
    $clsGroups[] = ['type'=>'co',   'grp'=>$coGroup,   'label'=>'Capital Outlay (C.O.)',                              'totalLabel'=>'Total Capital Outlay'];
foreach ($otherGroups as $og)
    if (count($og['items']) > 0)
        $clsGroups[] = ['type'=>'other','grp'=>$og,'label'=>$og['class_name'],'totalLabel'=>'Total '.$og['class_name']];
if (count($allMdfLines) > 0)
    $clsGroups[] = ['type'=>'mdf','grp'=>null,'label'=>'Budgetary &amp; Statutory Requirements',
                    'totalLabel'=>'Total Budgetary &amp; Statutory Requirements (20% MDF)'];
if (count($aipRows) > 0)
    $clsGroups[] = ['type'=>'aip','grp'=>null,'label'=>'Special Purpose Appropriations',
                    'totalLabel'=>'Total - Spcl Prpse Apprprtns, (SPA)'];

$mooeItems = $mooeGroup['items'] ?? [];
$mooeChunk = 30;

/* Repeated header macro helper */
$rptHead = function() use ($pastYear, $currYear, $propYear): string {
    return '
    <tr>
        <th rowspan="2" width="28%" style="text-align:center;font-weight:bold;font-size:7pt;">Object of Expenditures</th>
        <th rowspan="2" width="12%" style="text-align:center;font-weight:bold;font-size:7pt;">Account Code</th>
        <th rowspan="2" width="10%" style="text-align:center;font-weight:bold;font-size:7pt;">Past Year<br>(Actual)<br>'.$pastYear.'</th>
        <th colspan="3"              style="text-align:center;font-weight:bold;font-size:7pt;">Current Year Appropriation '.$currYear.'</th>
        <th rowspan="2" width="13%" style="text-align:center;font-weight:bold;font-size:7pt;">'.$propYear.'<br>Budget Year<br>(Proposed)</th>
    </tr>
    <tr>
        <th width="9%" style="text-align:center;font-weight:bold;font-size:7pt;">1st Semester<br>(Actual)</th>
        <th width="9%" style="text-align:center;font-weight:bold;font-size:7pt;">2nd Semester<br>(Estimate)</th>
        <th width="9%" style="text-align:center;font-weight:bold;font-size:7pt;">Total</th>
    </tr>
    <tr class="col-num"><td>(1)</td><td>(2)</td><td>(3)</td><td>(4)</td><td>(5)</td><td>(6)</td><td>(7)</td></tr>
    ';
};
@endphp

<div class="page">

<div class="form-no">LBP Form No. 1</div>
<div class="doc-title">BUDGET OF EXPENDITURES AND SOURCES OF FINANCING, (B.E.S.F.)</div>
<div class="doc-title">LGU : {{ $lgu }}</div>
<div class="fund-label">{{ $label }}, CY {{ $propYear }}</div>

<table class="data-table">
<thead>
<tr>
    <th rowspan="2" width="28%">Object of Expenditures</th>
    <th rowspan="2" width="12%">Account<br>Code</th>
    <th rowspan="2" width="10%">Past Year<br>(Actual)<br>{{ $pastYear }}</th>
    <th colspan="3">Current Year Appropriation {{ $currYear }}</th>
    <th rowspan="2" width="13%">{{ $propYear }}<br>Budget Year<br>(Proposed)</th>
</tr>
<tr>
    <th width="9%">1st Semester<br>(Actual)</th>
    <th width="9%">2nd Semester<br>(Estimate)</th>
    <th width="9%">Total</th>
</tr>
<tr class="col-num">
    <td>(1)</td><td>(2)</td><td>(3)</td><td>(4)</td><td>(5)</td><td>(6)</td><td>(7)</td>
</tr>
</thead>
<tbody>

{{-- INCOME ROWS --}}
@foreach($income as $row)
@php
    $isSub = (bool)($row['is_subtotal'] ?? false);
    $ind   = str_repeat('&nbsp;&nbsp;&nbsp;', max(0, (int)$row['level']));
    $fmtFn = $isSub ? $pesoA : $peso;
@endphp
<tr class="{{ $isSub ? 'subtotal' : '' }}">
    @if($isSub)
        <td class="l" colspan="2"><strong>{!! $ind !!}{{ $row['name'] }}</strong></td>
    @else
        <td class="l">{!! $ind !!}{{ $row['name'] }}</td>
        <td class="c"></td>
    @endif
    <td class="r">{!! $fmtFn($row['past_total']) !!}</td>
    <td class="r">{!! $fmtFn($row['current_sem1']) !!}</td>
    <td class="r">{!! $fmtFn($row['current_sem2']) !!}</td>
    <td class="r">{!! $fmtFn($row['current_total']) !!}</td>
    <td class="r">{!! $fmtFn($row['proposed']) !!}</td>
</tr>
@endforeach

{{-- Total Available Resources --}}
<tr class="grand">
    <td class="l" colspan="2"><strong>Total Available Resources for Appropriations</strong></td>
    <td class="r">{!! $pesoA($grandIncome['past_total']) !!}</td>
    <td class="r">{!! $pesoA($grandIncome['current_sem1']) !!}</td>
    <td class="r">{!! $pesoA($grandIncome['current_sem2']) !!}</td>
    <td class="r">{!! $pesoA($grandIncome['current_total']) !!}</td>
    <td class="r">{!! $pesoA($grandIncome['proposed']) !!}</td>
</tr>

{{-- EXPENDITURE CLASSIFICATION GROUPS --}}
@foreach($clsGroups as $cls)
@php $type = $cls['type']; $grp = $cls['grp']; @endphp

{{-- Repeated column header --}}
{!! $rptHead() !!}
<tr class="sec-hdr"><td colspan="7">{!! $cls['label'] !!}</td></tr>

@if($type === 'ps')
@foreach($grp['items'] as $item)
<tr>
    <td class="l">&nbsp;&nbsp;&nbsp;{{ $item['name'] }}</td>
    <td class="c">{{ $item['account_code'] }}</td>
    <td class="r">{!! $peso($item['past_total']) !!}</td>
    <td class="r">{!! $peso($item['current_sem1']) !!}</td>
    <td class="r">{!! $peso($item['current_sem2']) !!}</td>
    <td class="r">{!! $peso($item['current_total']) !!}</td>
    <td class="r">{!! $peso($item['proposed']) !!}</td>
</tr>
@endforeach
<tr class="subtotal">
    <td class="l" colspan="2">Total Personal Services</td>
    <td class="r">{!! $pesoA($psSub['past_total']) !!}</td>
    <td class="r">{!! $pesoA($psSub['current_sem1']) !!}</td>
    <td class="r">{!! $pesoA($psSub['current_sem2']) !!}</td>
    <td class="r">{!! $pesoA($psSub['current_total']) !!}</td>
    <td class="r">{!! $pesoA($psSub['proposed']) !!}</td>
</tr>
@endif

@if($type === 'mooe')
@php $mooeRunning = array_fill_keys($fields5, 0.0); @endphp
@foreach($mooeItems as $i => $item)
    @php $isLastMooe = ($i === count($mooeItems) - 1); @endphp
    @if($i > 0 && $i % $mooeChunk === 0)
    <tr class="subtotal">
        <td class="l" colspan="2">Total MOOE of this page</td>
        <td class="r">{!! $pesoA($mooeRunning['past_total']) !!}</td>
        <td class="r">{!! $pesoA($mooeRunning['current_sem1']) !!}</td>
        <td class="r">{!! $pesoA($mooeRunning['current_sem2']) !!}</td>
        <td class="r">{!! $pesoA($mooeRunning['current_total']) !!}</td>
        <td class="r">{!! $pesoA($mooeRunning['proposed']) !!}</td>
    </tr>
    @if(!$isLastMooe)
    {!! $rptHead() !!}
    <tr class="sec-hdr"><td colspan="7">Maint. &amp; Other Operating Expenditures, (MOOE) — continued</td></tr>
    @endif
    @endif
    <tr>
        <td class="l">&nbsp;&nbsp;&nbsp;{{ $item['name'] }}</td>
        <td class="c">{{ $item['account_code'] }}</td>
        <td class="r">{!! $peso($item['past_total']) !!}</td>
        <td class="r">{!! $peso($item['current_sem1']) !!}</td>
        <td class="r">{!! $peso($item['current_sem2']) !!}</td>
        <td class="r">{!! $peso($item['current_total']) !!}</td>
        <td class="r">{!! $peso($item['proposed']) !!}</td>
    </tr>
    @php foreach($fields5 as $f) $mooeRunning[$f] += (float)$item[$f]; @endphp
@endforeach
<tr class="subtotal">
    <td class="l" colspan="2">Total MOOE</td>
    <td class="r">{!! $pesoA($mooeSub['past_total']) !!}</td>
    <td class="r">{!! $pesoA($mooeSub['current_sem1']) !!}</td>
    <td class="r">{!! $pesoA($mooeSub['current_sem2']) !!}</td>
    <td class="r">{!! $pesoA($mooeSub['current_total']) !!}</td>
    <td class="r">{!! $pesoA($mooeSub['proposed']) !!}</td>
</tr>
@endif

@if($type === 'co')
@foreach($grp['items'] as $item)
<tr>
    <td class="l">&nbsp;&nbsp;&nbsp;{{ $item['name'] }}</td>
    <td class="c">{{ $item['account_code'] }}</td>
    <td class="r">{!! $peso($item['past_total']) !!}</td>
    <td class="r">{!! $peso($item['current_sem1']) !!}</td>
    <td class="r">{!! $peso($item['current_sem2']) !!}</td>
    <td class="r">{!! $peso($item['current_total']) !!}</td>
    <td class="r">{!! $peso($item['proposed']) !!}</td>
</tr>
@endforeach
<tr class="subtotal">
    <td class="l" colspan="2">Total Capital Outlay</td>
    <td class="r">{!! $pesoA($coSub['past_total']) !!}</td>
    <td class="r">{!! $pesoA($coSub['current_sem1']) !!}</td>
    <td class="r">{!! $pesoA($coSub['current_sem2']) !!}</td>
    <td class="r">{!! $pesoA($coSub['current_total']) !!}</td>
    <td class="r">{!! $pesoA($coSub['proposed']) !!}</td>
</tr>
@endif

@if($type === 'other')
@php $otherSub = $subTotals($grp); @endphp
@foreach($grp['items'] as $item)
<tr>
    <td class="l">&nbsp;&nbsp;&nbsp;{{ $item['name'] }}</td>
    <td class="c">{{ $item['account_code'] }}</td>
    <td class="r">{!! $peso($item['past_total']) !!}</td>
    <td class="r">{!! $peso($item['current_sem1']) !!}</td>
    <td class="r">{!! $peso($item['current_sem2']) !!}</td>
    <td class="r">{!! $peso($item['current_total']) !!}</td>
    <td class="r">{!! $peso($item['proposed']) !!}</td>
</tr>
@endforeach
<tr class="subtotal">
    <td class="l" colspan="2">Total {{ $grp['class_name'] }}</td>
    <td class="r">{!! $pesoA($otherSub['past_total']) !!}</td>
    <td class="r">{!! $pesoA($otherSub['current_sem1']) !!}</td>
    <td class="r">{!! $pesoA($otherSub['current_sem2']) !!}</td>
    <td class="r">{!! $pesoA($otherSub['current_total']) !!}</td>
    <td class="r">{!! $pesoA($otherSub['proposed']) !!}</td>
</tr>
@endif

@if($type === 'mdf')
@php $mdfRunning = array_fill_keys($fields5, 0.0); @endphp
<tr><td class="l" colspan="7" style="font-style:italic;padding-left:8pt;font-size:6.5pt;">&nbsp;&nbsp;20% MDF (Unapprop. Bal.)</td></tr>
@foreach($allMdfLines as $mi => $mline)
    @php $isLastMdf = ($mi === count($allMdfLines) - 1); @endphp
    @if($mi > 0 && $mi % 30 === 0)
    <tr class="subtotal">
        <td class="l" colspan="2">Total Budgetary &amp; Statutory Reqts. of this page</td>
        <td class="r">{!! $pesoA($mdfRunning['past_total']) !!}</td>
        <td class="r">{!! $pesoA($mdfRunning['current_sem1']) !!}</td>
        <td class="r">{!! $pesoA($mdfRunning['current_sem2']) !!}</td>
        <td class="r">{!! $pesoA($mdfRunning['current_total']) !!}</td>
        <td class="r">{!! $pesoA($mdfRunning['proposed']) !!}</td>
    </tr>
    @if(!$isLastMdf)
    {!! $rptHead() !!}
    <tr class="sec-hdr"><td colspan="7">Budgetary &amp; Statutory Requirements — continued</td></tr>
    @endif
    @endif
    @if($mline['kind'] === 'debt-interest')
    <tr>
        <td class="l" style="padding-left:20pt;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{{ $mline['display_name'] }}</td>
        <td class="c">{{ $mline['account_code'] ?? '' }}</td>
        <td class="r">{!! $num($mline['past_total']) !!}</td>
        <td class="r">{!! $num($mline['current_sem1']) !!}</td>
        <td class="r">{!! $num($mline['current_sem2']) !!}</td>
        <td class="r">{!! $num($mline['current_total']) !!}</td>
        <td class="r">{!! $num($mline['proposed']) !!}</td>
    </tr>
    @else
    <tr>
        <td class="l">&nbsp;&nbsp;&nbsp;&nbsp;{{ $mline['display_name'] }}</td>
        <td class="c">{{ $mline['account_code'] ?? '' }}</td>
        <td class="r">{!! $peso($mline['past_total']) !!}</td>
        <td class="r">{!! $peso($mline['current_sem1']) !!}</td>
        <td class="r">{!! $peso($mline['current_sem2']) !!}</td>
        <td class="r">{!! $peso($mline['current_total']) !!}</td>
        <td class="r">{!! $peso($mline['proposed']) !!}</td>
    </tr>
    @endif
    @php foreach($fields5 as $f) $mdfRunning[$f] += (float)($mline[$f] ?? 0); @endphp
@endforeach

@foreach($ldrrmfRows as $lr)
<tr>
    @if($lr['kind'] === 'ldrrmf-70')
    <td class="l" style="padding-left:28pt;">&nbsp;&nbsp;&nbsp;{{ $lr['name'] }}</td>
    @else
    <td class="l">&nbsp;&nbsp;&nbsp;&nbsp;{{ $lr['name'] }}</td>
    @endif
    <td class="c">{{ $lr['account_code'] ?? '' }}</td>
    <td class="r">{!! $peso($lr['past_total']) !!}</td>
    <td class="r">{!! $peso($lr['current_sem1']) !!}</td>
    <td class="r">{!! $peso($lr['current_sem2']) !!}</td>
    <td class="r">{!! $peso($lr['current_total']) !!}</td>
    <td class="r">{!! $peso($lr['proposed']) !!}</td>
</tr>
@endforeach

<tr class="subtotal">
    <td class="l" colspan="2">Total Budgetary &amp; Statutory Requirements (20% MDF)</td>
    <td class="r">{!! $pesoA($mdfGrand['past_total']) !!}</td>
    <td class="r">{!! $pesoA($mdfGrand['current_sem1']) !!}</td>
    <td class="r">{!! $pesoA($mdfGrand['current_sem2']) !!}</td>
    <td class="r">{!! $pesoA($mdfGrand['current_total']) !!}</td>
    <td class="r">{!! $pesoA($mdfGrand['proposed']) !!}</td>
</tr>
@endif

@if($type === 'aip')
@php $aipRunning = array_fill_keys($fields5, 0.0); @endphp
@foreach($aipRows as $ai => $aip)
    @php $isLastAip = ($ai === count($aipRows) - 1); @endphp
    @if($ai > 0 && $ai % 30 === 0)
    <tr class="subtotal">
        <td class="l" colspan="2">Total Special Purpose Appropriations of this page</td>
        <td class="r">{!! $pesoA($aipRunning['past_total']) !!}</td>
        <td class="r">{!! $pesoA($aipRunning['current_sem1']) !!}</td>
        <td class="r">{!! $pesoA($aipRunning['current_sem2']) !!}</td>
        <td class="r">{!! $pesoA($aipRunning['current_total']) !!}</td>
        <td class="r">{!! $pesoA($aipRunning['proposed']) !!}</td>
    </tr>
    @if(!$isLastAip)
    {!! $rptHead() !!}
    <tr class="sec-hdr"><td colspan="7">Special Purpose Appropriations — continued</td></tr>
    @endif
    @endif
    <tr>
        <td class="l">&nbsp;&nbsp;&nbsp;{{ $aip['program_description'] }}</td>
        <td class="c">{{ $aip['aip_reference_code'] }}</td>
        <td class="r">{!! $peso($aip['past_total']) !!}</td>
        <td class="r">{!! $peso($aip['current_sem1']) !!}</td>
        <td class="r">{!! $peso($aip['current_sem2']) !!}</td>
        <td class="r">{!! $peso($aip['current_total']) !!}</td>
        <td class="r">{!! $peso($aip['proposed']) !!}</td>
    </tr>
    @php foreach($fields5 as $f) $aipRunning[$f] += (float)$aip[$f]; @endphp
@endforeach
<tr class="subtotal">
    <td class="l" colspan="2">Total - Spcl Prpse Apprprtns, (SPA)</td>
    <td class="r">{!! $pesoA($aipGrand['past_total']) !!}</td>
    <td class="r">{!! $pesoA($aipGrand['current_sem1']) !!}</td>
    <td class="r">{!! $pesoA($aipGrand['current_sem2']) !!}</td>
    <td class="r">{!! $pesoA($aipGrand['current_total']) !!}</td>
    <td class="r">{!! $pesoA($aipGrand['proposed']) !!}</td>
</tr>
@endif

@endforeach {{-- end clsGroups --}}

{{-- TOTAL EXPENDITURES --}}
<tr class="grand">
    <td class="l" colspan="2"><strong>Total Expenditures</strong></td>
    <td class="r">{!! $pesoA($expGrand['past_total']) !!}</td>
    <td class="r">{!! $pesoA($expGrand['current_sem1']) !!}</td>
    <td class="r">{!! $pesoA($expGrand['current_sem2']) !!}</td>
    <td class="r">{!! $pesoA($expGrand['current_total']) !!}</td>
    <td class="r">{!! $pesoA($expGrand['proposed']) !!}</td>
</tr>

{{-- ENDING BALANCE --}}
<tr>
    <td class="l" colspan="2"><strong>Ending Balance</strong></td>
    @foreach($fields5 as $f)
    <td class="r">{!! $numA($endBal[$f]) !!}</td>
    @endforeach
</tr>

</tbody>
</table>

{{-- Cert + Signatures --}}
<table style="width:100%;border-collapse:collapse;font-size:6.5pt;margin-top:0;">
  <tr>
    <td style="border:1px solid #000;border-bottom:none;text-align:left;padding:6px 6px 18px;">
      We hereby certify that the information presented above are true and correct.
      We further certify that the foregoing estimated receipts are reasonably projected as collectible for the budget year.
    </td>
  </tr>
  <tr>
    <td style="border-left:1px solid #000;border-right:1px solid #000;padding:0;">
      <table style="width:100%;border-collapse:collapse;font-size:6.5pt;">
        <tr>
          <td style="border:none;text-align:center;vertical-align:top;width:25%;padding:8px 6px 6px;">
            <span class="sig-name">{{ $signatories['budget_officer']['name'] }}</span>
            <span class="sig-title">{{ $signatories['budget_officer']['title'] }}</span>
          </td>
          <td style="border:none;text-align:center;vertical-align:top;width:25%;padding:8px 6px 6px;">
            <span class="sig-name">{{ $signatories['administrator']['name'] }}</span>
            <span class="sig-title">{{ $signatories['administrator']['title'] }}</span>
          </td>
          <td style="border:none;text-align:center;vertical-align:top;width:25%;padding:8px 6px 6px;">
            <span class="sig-name">{{ $signatories['mpdc']['name'] }}</span>
            <span class="sig-title">{{ $signatories['mpdc']['title'] }}</span>
          </td>
          <td style="border:none;text-align:center;vertical-align:top;width:25%;padding:8px 6px 6px;">
            <span class="sig-name">{{ $signatories['treasurer']['name'] }}</span>
            <span class="sig-title">{{ $signatories['treasurer']['title'] }}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="border:1px solid #000;border-top:none;text-align:center;padding:6px 6px 18px;">
      <p style="font-size:6.5pt;margin-bottom:3px;font-weight:bold;">Approved :</p>
      <span class="sig-name">{{ $signatories['mayor']['name'] }}</span>
      <span class="sig-title">{{ $signatories['mayor']['title'] }}</span>
    </td>
  </tr>
</table>

</div>{{-- end .page --}}
@endforeach {{-- end $data['forms'] --}}


{{-- ── DEPT MODE  (Forms 2, 3, 4) ──────────────────────────────────────── --}}
@elseif($mode === 'dept')

@php
$budgetPlan  = $reportData['budget_plan'];
$deptReports = $reportData['departments'];
@endphp

@foreach($deptReports as $dr)
@php
$dept         = $dr['department'];
$proposedYear = $dr['proposed_year'];
$currentYear  = $dr['current_year'];
$pastYear     = $dr['past_year'];
@endphp

{{-- ── FORM 2 ── --}}
@if(in_array('form2', $forms) && isset($dr['form2']))
@php
$form2     = $dr['form2'];
$lgu       = strtoupper($budgetPlan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL');
$deptName  = strtoupper($dept->dept_name);
$items     = $form2['items'];
$spItems   = $form2['specialPrograms'];

$psItems   = $bucket($items, 'personal services');
$mooeItems = $bucket($items, 'maintenance and other operating expenses');
$coItems   = $bucket($items, 'capital outlay');
$ppItems   = array_merge(
    $bucket($items, 'property, plant and equipment'),
    $bucket($items, 'prop/plant/eqpt')
);
$known = ['personal services','maintenance and other operating expenses',
          'capital outlay','property, plant and equipment','prop/plant/eqpt'];
$otherItems = array_values(array_filter($items,
    fn($i) => !in_array(strtolower(trim($i['classification'])), $known)));

$psProp   = $sumCol($psItems,   'proposed');
$mooeProp = $sumCol($mooeItems, 'proposed');
$coProp   = $sumCol($coItems,   'proposed');
$ppProp   = $sumCol($ppItems,   'proposed');
$spProp   = $sumCol($spItems,   'proposed');

$capItems = count($ppItems) > 0 ? $ppItems : $coItems;
$capProp  = count($ppItems) > 0 ? $ppProp  : $coProp;

$grandPast    = $sumCol($items,'past_total')    + $sumCol($spItems,'past_total');
$grandSem1    = $sumCol($items,'current_sem1')  + $sumCol($spItems,'current_sem1');
$grandSem2    = $sumCol($items,'current_sem2')  + $sumCol($spItems,'current_sem2');
$grandCurrent = $sumCol($items,'current_total') + $sumCol($spItems,'current_total');
$grandProp    = $psProp + $mooeProp + $capProp + $spProp;
@endphp

<div class="page">
<div class="form-no">LBP Form No. 2</div>
<div class="doc-title">Programmed Appropriation and Obligation by Object of Expenditures<br>LGU : <u>{{ $lgu }}</u></div>
<div class="office-label">OFFICE OF THE {{ $deptName }}</div>

<table class="data-table" style="width:100%; table-layout:fixed;">
    <thead>
        <tr>
            <th rowspan="2" width="28%">Object of Expenditures</th>
            <th rowspan="2" width="10%">Account Code</th>
            <th rowspan="2" width="12%">Past Year<br>(Actual)<br>{{ $pastYear }}</th>
            <th colspan="3">Current Year (Estimate) {{ $currentYear }}</th>
            <th rowspan="2" width="12%">{{ $proposedYear }}<br>Budget Year<br>(Proposed)</th>
        </tr>
        <tr>
            <th width="9%">1st Semester<br>(Actual)</th>
            <th width="9%">2nd Semester<br>(Estimate)</th>
            <th width="9%">Total</th>
        </tr>
        <tr><th>(1)</th><th>(2)</th><th>(3)</th><th>(4)</th><th>(5)</th><th>(6)</th><th>(7)</th></tr>
    </thead>
    <tbody>

    @if(count($psItems) > 0)
    <tr class="sec-hdr"><td colspan="7">Personal Services (PS)</td></tr>
    @foreach($psItems as $item)
    <tr>
        <td class="l">{{ $item['description'] }}</td>
        <td class="c">{{ $item['account_code'] }}</td>
        <td class="r">{!! $item['past_total']    > 0 ? $pesoA($item['past_total'])    : '' !!}</td>
        <td class="r">{!! $item['current_sem1']  > 0 ? $pesoA($item['current_sem1'])  : '' !!}</td>
        <td class="r">{!! $item['current_sem2']  > 0 ? $pesoA($item['current_sem2'])  : '' !!}</td>
        <td class="r">{!! $item['current_total'] > 0 ? $pesoA($item['current_total']) : '' !!}</td>
        <td class="r">{!! $item['proposed']      > 0 ? $pesoA($item['proposed'])      : '' !!}</td>
    </tr>
    @endforeach
    <tr class="subtotal">
        <td colspan="2" class="l">Total Personal Services</td>
        <td class="r">{!! $pesoA($sumCol($psItems,'past_total')) !!}</td>
        <td class="r">{!! $pesoA($sumCol($psItems,'current_sem1')) !!}</td>
        <td class="r">{!! $pesoA($sumCol($psItems,'current_sem2')) !!}</td>
        <td class="r">{!! $pesoA($sumCol($psItems,'current_total')) !!}</td>
        <td class="r">{!! $pesoA($psProp) !!}</td>
    </tr>
    @endif

    @if(count($mooeItems) > 0)
    <tr>
        <th rowspan="2" width="28%" style="text-align:center;font-weight:bold;font-size:7pt;">Object of Expenditures</th>
        <th rowspan="2" width="10%" style="text-align:center;font-weight:bold;font-size:7pt;">Account Code</th>
        <th rowspan="2" width="12%" style="text-align:center;font-weight:bold;font-size:7pt;">Past Year<br>(Actual)</th>
        <th colspan="3" style="text-align:center;font-weight:bold;font-size:7pt;">Current Year (Estimate)</th>
        <th rowspan="2" width="12%" style="text-align:center;font-weight:bold;font-size:7pt;">Budget Year<br>(Proposed)</th>
    </tr>
    <tr>
        <th width="9%" style="text-align:center;font-weight:bold;font-size:7pt;">1st Semester<br>(Actual)</th>
        <th width="9%" style="text-align:center;font-weight:bold;font-size:7pt;">2nd Semester<br>(Estimate)</th>
        <th width="9%" style="text-align:center;font-weight:bold;font-size:7pt;">Total</th>
    </tr>
    <tr class="col-num"><th>(1)</th><th>(2)</th><th>(3)</th><th>(4)</th><th>(5)</th><th>(6)</th><th>(7)</th></tr>
    <tr class="sec-hdr"><td colspan="7">Maintenance &amp; Other Operating Expenditures (MOOE)</td></tr>
    @foreach($mooeItems as $item)
    <tr>
        <td class="l">{{ $item['description'] }}</td>
        <td class="c">{{ $item['account_code'] }}</td>
        <td class="r">{!! $item['past_total']    > 0 ? $num($item['past_total'])    : '' !!}</td>
        <td class="r">{!! $item['current_sem1']  > 0 ? $num($item['current_sem1'])  : '' !!}</td>
        <td class="r">{!! $item['current_sem2']  > 0 ? $num($item['current_sem2'])  : '' !!}</td>
        <td class="r">{!! $item['current_total'] > 0 ? $num($item['current_total']) : '' !!}</td>
        <td class="r">{!! $item['proposed']      > 0 ? $num($item['proposed'])      : '' !!}</td>
    </tr>
    @endforeach
    <tr class="subtotal">
        <td colspan="2" class="l">Total MOOE</td>
        <td class="r">{!! $pesoA($sumCol($mooeItems,'past_total')) !!}</td>
        <td class="r">{!! $pesoA($sumCol($mooeItems,'current_sem1')) !!}</td>
        <td class="r">{!! $pesoA($sumCol($mooeItems,'current_sem2')) !!}</td>
        <td class="r">{!! $pesoA($sumCol($mooeItems,'current_total')) !!}</td>
        <td class="r">{!! $pesoA($mooeProp) !!}</td>
    </tr>
    @endif

    @if(count($spItems) > 0)
    <tr>
        <th rowspan="2" width="28%" style="text-align:center;font-weight:bold;font-size:7pt;">Object of Expenditures</th>
        <th rowspan="2" width="10%" style="text-align:center;font-weight:bold;font-size:7pt;">Account Code</th>
        <th rowspan="2" width="12%" style="text-align:center;font-weight:bold;font-size:7pt;">Past Year<br>(Actual)</th>
        <th colspan="3" style="text-align:center;font-weight:bold;font-size:7pt;">Current Year (Estimate)</th>
        <th rowspan="2" width="12%" style="text-align:center;font-weight:bold;font-size:7pt;">Budget Year<br>(Proposed)</th>
    </tr>
    <tr>
        <th width="9%" style="text-align:center;font-weight:bold;font-size:7pt;">1st Semester<br>(Actual)</th>
        <th width="9%" style="text-align:center;font-weight:bold;font-size:7pt;">2nd Semester<br>(Estimate)</th>
        <th width="9%" style="text-align:center;font-weight:bold;font-size:7pt;">Total</th>
    </tr>
    <tr class="col-num"><th>(1)</th><th>(2)</th><th>(3)</th><th>(4)</th><th>(5)</th><th>(6)</th><th>(7)</th></tr>
    <tr class="sec-hdr"><td colspan="7">Special Purpose Appropriations / Programs</td></tr>
    @foreach($spItems as $sp)
    <tr>
        <td class="l">{{ $sp['program_description'] }}</td>
        <td class="c">{{ $sp['aip_reference_code'] ?? '' }}</td>
        <td class="r">{!! $sp['past_total']    > 0 ? $num($sp['past_total'])    : '' !!}</td>
        <td class="r">{!! $sp['current_sem1']  > 0 ? $num($sp['current_sem1'])  : '' !!}</td>
        <td class="r">{!! $sp['current_sem2']  > 0 ? $num($sp['current_sem2'])  : '' !!}</td>
        <td class="r">{!! $sp['current_total'] > 0 ? $num($sp['current_total']) : '' !!}</td>
        <td class="r">{!! $sp['proposed']      > 0 ? $num($sp['proposed'])      : '' !!}</td>
    </tr>
    @endforeach
    <tr class="subtotal">
        <td colspan="2" class="l">Sub-Total for Spcl Prog/Prcts</td>
        <td class="r">{!! $pesoA($sumCol($spItems,'past_total')) !!}</td>
        <td class="r">{!! $pesoA($sumCol($spItems,'current_sem1')) !!}</td>
        <td class="r">{!! $pesoA($sumCol($spItems,'current_sem2')) !!}</td>
        <td class="r">{!! $pesoA($sumCol($spItems,'current_total')) !!}</td>
        <td class="r">{!! $pesoA($spProp) !!}</td>
    </tr>
    @endif

    @if(count($capItems) > 0)
    <tr>
        <th rowspan="2" width="28%" style="text-align:center;font-weight:bold;font-size:7pt;">Object of Expenditures</th>
        <th rowspan="2" width="10%" style="text-align:center;font-weight:bold;font-size:7pt;">Account Code</th>
        <th rowspan="2" width="12%" style="text-align:center;font-weight:bold;font-size:7pt;">Past Year<br>(Actual)</th>
        <th colspan="3" style="text-align:center;font-weight:bold;font-size:7pt;">Current Year (Estimate)</th>
        <th rowspan="2" width="12%" style="text-align:center;font-weight:bold;font-size:7pt;">Budget Year<br>(Proposed)</th>
    </tr>
    <tr>
        <th width="9%" style="text-align:center;font-weight:bold;font-size:7pt;">1st Semester<br>(Actual)</th>
        <th width="9%" style="text-align:center;font-weight:bold;font-size:7pt;">2nd Semester<br>(Estimate)</th>
        <th width="9%" style="text-align:center;font-weight:bold;font-size:7pt;">Total</th>
    </tr>
    <tr class="col-num"><th>(1)</th><th>(2)</th><th>(3)</th><th>(4)</th><th>(5)</th><th>(6)</th><th>(7)</th></tr>
    <tr class="sec-hdr"><td colspan="7">Prop/Plant/Equipt</td></tr>
    @foreach($capItems as $item)
    <tr>
        <td class="l">{{ $item['description'] }}</td>
        <td class="c">{{ $item['account_code'] }}</td>
        <td class="r">{!! $item['past_total']    > 0 ? $num($item['past_total'])    : '' !!}</td>
        <td class="r">{!! $item['current_sem1']  > 0 ? $num($item['current_sem1'])  : '' !!}</td>
        <td class="r">{!! $item['current_sem2']  > 0 ? $num($item['current_sem2'])  : '' !!}</td>
        <td class="r">{!! $item['current_total'] > 0 ? $num($item['current_total']) : '' !!}</td>
        <td class="r">{!! $item['proposed']      > 0 ? $num($item['proposed'])      : '' !!}</td>
    </tr>
    @endforeach
    <tr class="subtotal">
        <td colspan="2" class="l">Total Prop/Plant/Eqpt</td>
        <td class="r">{!! $pesoA($sumCol($capItems,'past_total')) !!}</td>
        <td class="r">{!! $pesoA($sumCol($capItems,'current_sem1')) !!}</td>
        <td class="r">{!! $pesoA($sumCol($capItems,'current_sem2')) !!}</td>
        <td class="r">{!! $pesoA($sumCol($capItems,'current_total')) !!}</td>
        <td class="r">{!! $pesoA($capProp) !!}</td>
    </tr>
    @endif

    <tr class="grand-total">
        <td colspan="2" class="l">GRAND TOTAL FOR {{ $deptName }}</td>
        <td class="r">{!! $pesoA($grandPast) !!}</td>
        <td class="r">{!! $pesoA($grandSem1) !!}</td>
        <td class="r">{!! $pesoA($grandSem2) !!}</td>
        <td class="r">{!! $pesoA($grandCurrent) !!}</td>
        <td class="r">{!! $pesoA($grandProp) !!}</td>
    </tr>
    </tbody>
</table>

<table style="width:100%;border-collapse:collapse;font-size:6.5pt;margin-top:0;border:1px solid #000;">
  <tr>
    <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:8px 6px 18px;">
      Prepared by:
      <span class="sig-name">{{ $dr['dept_head']['name'] }}</span>
      <span class="sig-title">{{ $dr['dept_head']['title'] }}</span>
    </td>
    <td style="border-left:none;border-right:none;text-align:center;vertical-align:top;width:34%;padding:8px 6px 18px;">
      Reviewed by:
      <span class="sig-name">{{ $signatories['budget_officer']['name'] }}</span>
      <span class="sig-title">{{ $signatories['budget_officer']['title'] }}</span>
    </td>
    <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:8px 6px 18px;">
      Approved:
      <span class="sig-name">{{ $signatories['mayor']['name'] }}</span>
      <span class="sig-title">{{ $signatories['mayor']['title'] }}</span>
    </td>
  </tr>
</table>
</div>
@endif {{-- /form2 --}}

{{-- ── FORM 3 ── --}}
@if(in_array('form3', $forms) && isset($dr['form3']))
@php
$form3       = $dr['form3'];
$lgu         = strtoupper($budgetPlan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL');
$deptName    = strtoupper($dept->dept_name);
$rows3       = $form3['rows'];
$lbcCurrent  = !empty($form3['lbcCurrent'])      ? $form3['lbcCurrent']      : null;
$lbcProposed = !empty($form3['lbcProposed'])      ? $form3['lbcProposed']     : null;
$trancheCur  = !empty($form3['trancheCurrent'])   ? $form3['trancheCurrent']  : null;
$tranchePro  = !empty($form3['trancheProposed'])  ? $form3['trancheProposed'] : null;
$grandCurrent3  = (float) array_sum(array_column($rows3, 'current_amount'));
$grandProposed3 = (float) array_sum(array_column($rows3, 'proposed_amount'));
$grandIncrease3 = $grandProposed3 - $grandCurrent3;
@endphp

<div class="page">
<div class="form-no">LBP Form No. 3</div>
<div class="doc-title">Plantilla of Personnel FY - {{ $proposedYear }}<br>LGU : <u>{{ $lgu }}</u></div>

<table class="data-table" style="margin-top:4px; width:100% !important; table-layout:fixed; font-size:7pt;">
    <thead>
        {{-- Hidden row: DomPDF reads column widths from first row with no rowspan/colspan --}}
        <tr style="height:0;line-height:0;font-size:0;visibility:hidden;">
            <td style="width:6%;padding:0;border:none;"></td>
            <td style="width:6%;padding:0;border:none;"></td>
            <td style="width:20%;padding:0;border:none;"></td>
            <td style="width:18%;padding:0;border:none;"></td>
            <td style="width:5%;padding:0;border:none;"></td>
            <td style="width:14%;padding:0;border:none;"></td>
            <td style="width:5%;padding:0;border:none;"></td>
            <td style="width:13%;padding:0;border:none;"></td>
            <td style="width:13%;padding:0;border:none;"></td>
        </tr>
        <tr>
            <th colspan="2" rowspan="2" style="width:3%">Item No.</th>
            <th rowspan="2" width="25%">Position Title</th>
            <th rowspan="2" width="17%">Name of Incumbent</th>
            <th colspan="2">
                Current Year Authorized Rate / Annum<br>
                @if($lbcCurrent){{ $lbcCurrent }}<br>@endif
                @if($trancheCur){{ $trancheCur }}@else No Data @endif
            </th>
            <th colspan="2">
                Budget Year {{ $proposedYear }} Proposed Rate / Annum<br>
                @if($lbcProposed){{ $lbcProposed }}<br>@endif
                @if($tranchePro){{ $tranchePro }}@else No Data @endif
            </th>
            <th rowspan="2" width="11%">Increase/(Decrease)</th>
        </tr>
        <tr>
            <th width="4%">G/S</th>
            <th width="15%">Amount</th>
            <th width="4%">G/S</th>
            <th width="15%">Amount</th>
        </tr>
        <tr><th>(1)</th><th>(2)</th><th>(3)</th><th>(4)</th><th>(5)</th><th>(6)</th><th>(7)</th><th>(8)</th><th>(9)</th></tr>
        <tr><td colspan="9" style="font-weight:bold;padding:2px 4px;">{{ $deptName }}</td></tr>
    </thead>
    <tbody>
    @forelse($rows3 as $row)
    <tr>
        <td class="c" style="width:3%;font-size:6pt;">{{ $row['old_item_number'] ?? '' }}</td>
        <td class="c" style="width:3%;font-size:6pt;">{{ $row['new_item_number'] }}</td>
        <td style="word-wrap:break-word;">{{ $row['position_title'] }}</td>
        <td style="word-wrap:break-word;">{{ $row['incumbent'] }}</td>
        <td class="c" style="font-size:6.5pt;">{{ $row['salary_grade'] }}<br>{{ $row['step_current'] }}</td>
        <td class="r">@if($row['current_amount'] > 0){{ "\u{20B1}\u{00A0}" }}{{ number_format((float)$row['current_amount'], 0) }}@endif</td>
        <td class="c" style="font-size:6.5pt;">{{ $row['salary_grade'] }}<br>{{ $row['step_proposed'] }}</td>
        <td class="r">{{ "\u{20B1}\u{00A0}" }}{{ number_format((float)($row['proposed_amount'] ?? 0), 0) }}</td>
        <td class="r">@if(!empty($row['increase_decrease']) && $row['increase_decrease'] != 0){{ "\u{20B1}\u{00A0}" }}{{ number_format((float)$row['increase_decrease'], 0) }}@endif</td>
    </tr>
    @empty
    <tr><td colspan="9" class="c" style="padding:6px;">No plantilla positions found.</td></tr>
    @endforelse
    </tbody>
    <tfoot>
        <tr class="grand-total">
            <td colspan="4" class="c">Total for {{ $dept->dept_abbreviation ?? $deptName }}</td>
            <td></td>
            <td class="r">@php echo chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0).number_format($grandCurrent3,0); @endphp</td>
            <td></td>
            <td class="r">@php echo chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0).number_format($grandProposed3,0); @endphp</td>
            <td class="r">@php echo chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0).number_format($grandIncrease3,0); @endphp</td>
        </tr>
    </tfoot>
</table>

<table style="width:100%;border-collapse:collapse;font-size:6.5pt;margin-top:0;border:1px solid #000;">
  <tr>
    <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:8px 6px 18px;">
      Prepared by:
      <span class="sig-name">{{ $dr['dept_head']['name'] }}</span>
      <span class="sig-title">{{ $dr['dept_head']['title'] }}</span>
    </td>
    <td style="border-left:none solid #000;border-right:none solid #000;text-align:center;vertical-align:top;width:34%;padding:8px 6px 18px;">
      Reviewed by:
      <span class="sig-name">{{ $signatories['budget_officer']['name'] }}</span>
      <span class="sig-title">{{ $signatories['budget_officer']['title'] }}</span>
    </td>
    <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:8px 6px 18px;">
      Approved:
      <span class="sig-name">{{ $signatories['mayor']['name'] }}</span>
      <span class="sig-title">{{ $signatories['mayor']['title'] }}</span>
    </td>
  </tr>
</table>
</div>
@endif {{-- /form3 --}}

{{-- ── FORM 4 ── --}}
@if(in_array('form4', $forms) && isset($dr['form4']))
@php
$form4      = $dr['form4'];
$rows4      = $form4['rows'];
$firstChunk = array_slice($rows4, 0, 13);
$rest       = array_slice($rows4, 13);
$extraChunks= array_chunk($rest, 18);
$pages4     = count($rows4) > 0 ? array_merge([$firstChunk], $extraChunks) : [[]];
$totalPages4= count($pages4);
$grandPS    = (float) array_sum(array_column($rows4, 'ps_amount'));
$grandMOOE  = (float) array_sum(array_column($rows4, 'mooe_amount'));
$grandCO    = (float) array_sum(array_column($rows4, 'co_amount'));
$grandAmt4  = (float) array_sum(array_column($rows4, 'total_amount'));

/* Fixed texts — uniform across all departments */
$missionText = 'A vibrant and sustainable commercial, industrial and tourism economy propelled by pro active and self reliant citizenry living in a water sufficient, adaptive and balanced environment and pro poor governance.';
$visionText  = 'To make Opol economically productive, empowered and resilient community.';
$orgOutcome  = "Harmonious relationship among the constituents, citizen's participation, excellence in work performance, transparency, accountability and integrity.";
@endphp

@foreach($pages4 as $pageIdx => $pageRows4)
@php $isFirst4 = ($pageIdx === 0); $isLast4 = ($pageIdx === $totalPages4 - 1); @endphp
<div class="page">

{{-- ── Header: form number INSIDE the outer border ── --}}
<table style="width:100%;border-collapse:collapse;font-size:7pt;margin-bottom:0;">
  <tr>
    <td style="border:1px solid #000;border-bottom:none;padding:3px 6px;font-weight:bold;font-size:7pt;">
      LBP Form No. 4
    </td>
  </tr>
</table>

@if($isFirst4)
{{-- ── MMV block: no vertical border between label and text ── --}}
<table style="width:100%;border-collapse:collapse;font-size:7pt;margin-bottom:0;">
  {{-- Mandate — only this row changes per department --}}
  <tr>
    <td style="border:1px solid #000;border-top:none;border-bottom:none;border-right:none;
               padding:3px 6px 1px 6px;vertical-align:top;white-space:nowrap;width:1%;font-weight:bold;">
      Mandate :
    </td>
    <td style="border-top:none;border-bottom:none;border-left:none;border-right:1px solid #000;
               padding:3px 6px 1px 6px;vertical-align:top;word-break:break-word;">
      @php
        $mandateText = $form4['mandate'] ?: '—';
        // Insert <br> before each numbered item e.g. 1) 2) 3) but not the first
        $mandateFormatted = preg_replace('/\s+(\d+\))/', '<br>$1', $mandateText);
      @endphp
      {!! $mandateFormatted !!}
    </td>
  </tr>
  {{-- Mission — fixed text --}}
  <tr>
    <td style="border:1px solid #000;border-top:none;border-bottom:none;border-right:none;
               padding:1px 6px;vertical-align:top;white-space:nowrap;font-weight:bold;">
      Mission :
    </td>
    <td style="border-top:none;border-bottom:none;border-left:none;border-right:1px solid #000;
               padding:1px 6px;vertical-align:top;word-break:break-word;">
      {{ $missionText }}
    </td>
  </tr>
  {{-- Vision — fixed text --}}
  <tr>
    <td style="border:1px solid #000;border-top:none;border-bottom:none;border-right:none;
               padding:1px 6px;vertical-align:top;white-space:nowrap;font-weight:bold;">
      Vision :
    </td>
    <td style="border-top:none;border-bottom:none;border-left:none;border-right:1px solid #000;
               padding:1px 6px;vertical-align:top;word-break:break-word;">
      {{ $visionText }}
    </td>
  </tr>
  {{-- Organizational Outcome — fixed text, always shown --}}
  <tr>
    <td style="border:1px solid #000;border-top:none;border-bottom:none;border-right:none;
               padding:1px 6px 3px 6px;vertical-align:top;white-space:nowrap;font-weight:bold;">
      Organizational Outcome :
    </td>
    <td style="border-top:none;border-bottom:none;border-left:none;border-right:1px solid #000;
               padding:1px 6px 3px 6px;vertical-align:top;word-break:break-word;">
      {{ $orgOutcome }}
    </td>
  </tr>
</table>
@endif

<table class="data-table">
    <colgroup>
        <col style="width:9%"><col style="width:25%"><col style="width:11%">
        <col style="width:14%"><col style="width:9%">
        <col style="width:8%"><col style="width:8%"><col style="width:8%"><col style="width:8%">
    </colgroup>
    <thead>
        <tr>
            <th rowspan="2">AIP Reference Code</th>
            <th rowspan="2">Program/Project/Activity Description</th>
            <th rowspan="2">Major Final Output</th>
            <th rowspan="2">Performance Indicator</th>
            <th rowspan="2">Target for the Budget Year</th>
            <th colspan="3">Proposed Budget</th>
            <th rowspan="2">TOTAL</th>
        </tr>
        <tr><th>PS</th><th>MOOE</th><th>CO</th></tr>
    </thead>
    <tbody>
    @forelse($pageRows4 as $row4)
    <tr>
        <td class="c">{{ $row4['aip_reference_code'] ?? '' }}</td>
        <td>{{ $row4['program_description'] ?? '' }}</td>
        <td class="c">{{ $row4['major_final_output'] ?? 'Imprvd Svcs' }}</td>
        <td>{{ $row4['performance_indicator'] ?? '' }}</td>
        <td class="c">{{ $row4['target'] ?? '' }}</td>
        <td class="r">{!! $row4['ps_amount']    > 0 ? $pesoInt($row4['ps_amount'])    : '-' !!}</td>
        <td class="r">{!! $row4['mooe_amount']  > 0 ? $pesoInt($row4['mooe_amount'])  : '-' !!}</td>
        <td class="r">{!! $row4['co_amount']    > 0 ? $pesoInt($row4['co_amount'])    : '-' !!}</td>
        <td class="r">{!! $row4['total_amount'] > 0 ? $pesoInt($row4['total_amount']) : '-' !!}</td>
    </tr>
    @empty
    <tr><td colspan="9" class="c" style="padding:6px;">No AIP programs found.</td></tr>
    @endforelse
    </tbody>
    @if($isLast4)
    <tfoot>
        <tr class="subtotal">
            <td colspan="5" style="font-weight:bold;text-align:left;">Total for SPAs</td>
            <td class="r">{!! $pesoInt($grandPS) !!}</td>
            <td class="r">{!! $pesoInt($grandMOOE) !!}</td>
            <td class="r">{!! $pesoInt($grandCO) !!}</td>
            <td class="r">{!! $pesoInt($grandAmt4) !!}</td>
        </tr>
    </tfoot>
    @endif
</table>

@if($isLast4)
{{-- ── Signatures: same border style as Form 1 ── --}}
<table style="width:100%;border-collapse:collapse;font-size:6.5pt;margin-top:0;">
  <tr>
    <td style="border:1px solid #000;border-bottom:none;padding:4px 6px 2px 6px;">
      <table style="width:100%;border-collapse:collapse;font-size:6.5pt;">
        <tr>
          {{-- Left: Prepared by --}}
          <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:4px 6px 6px;">
            Prepared by :
          </td>
          {{-- Middle: Reviewed by block --}}
          <td style="border:none;text-align:center;vertical-align:top;width:34%;padding:4px 6px 6px;">
            Reviewed by :
          </td>
          {{-- Right: Budget Officer --}}
          <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:4px 0 6px 6px;">
          </td>
        </tr>
        <tr>
          <td style="border:none;text-align:center;vertical-align:top;padding:0 6px 6px;">
            <span class="sig-name">{{ $dr['dept_head']['name'] }}</span>
            <span class="sig-title">{{ $dr['dept_head']['title'] }}</span>
          </td>
          <td style="border:none;text-align:center;vertical-align:top;padding:0 6px 6px;">
            <span class="sig-name">{{ $signatories['mpdc']['name'] }}</span>
            <span class="sig-title">{{ $signatories['mpdc']['title'] }}</span>
            <br>
            <span class="sig-name" style="margin-top:14px;">{{ $signatories['treasurer']['name'] }}</span>
            <span class="sig-title">{{ $signatories['treasurer']['title'] }}</span>
          </td>
          <td style="border:none;text-align:center;vertical-align:top;padding:0 0 6px 6px;">
            <span class="sig-name">{{ $signatories['budget_officer']['name'] }}</span>
            <span class="sig-title">{{ $signatories['budget_officer']['title'] }}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="border:1px solid #000;border-top:none;text-align:center;padding:4px 6px 18px;">
      <p style="font-size:6.5pt;margin-bottom:3px;font-weight:bold;">Approved :</p>
      <span class="sig-name">{{ $signatories['mayor']['name'] }}</span>
      <span class="sig-title">{{ $signatories['mayor']['title'] }}</span>
    </td>
  </tr>
</table>
@endif

</div>
@endforeach {{-- pages4 --}}
@endif {{-- /form4 --}}

@endforeach {{-- deptReports --}}


{{-- ── FORM 5  (landscape legal) ────────────────────────────────────────── --}}
@elseif($mode === 'form5')
@php
$year   = $data['year'];
$lgu    = $data['lgu'];
$rows   = $data['rows'];
$totals = $data['totals'];
@endphp

<div class="page">
<div class="form-no">LBP Form No. 5</div>
<div class="doc-title">STATEMENT OF INDEBTEDNESS</div>
<div class="lgu-line">LGU : {{ $lgu }}</div>
<div class="cy-line">CY {{ $year }}</div>

<table class="form5-table">
  <thead>
    <tr>
      <th rowspan="2" width="16%">Creditor</th>
      <th rowspan="2" width="6%">Date<br>Contracted</th>
      <th rowspan="2" width="6%">Term</th>
      <th rowspan="2" width="8%">Principal<br>Amount</th>
      <th rowspan="2" width="10%">Purpose</th>
      <th colspan="3">Previous Payments Made</th>
      <th colspan="3">Amount Due Budget Year &mdash; {{ $year }}</th>
      <th rowspan="2" width="7%">Balance<br>of the<br>Principal</th>
    </tr>
    <tr>
      <th width="7%">Principal</th><th width="7%">Interest</th><th width="7%">Total</th>
      <th width="7%">Principal</th><th width="7%">Interest</th><th width="7%">Total</th>
    </tr>
    <tr class="col-num">
      <td>(1)</td><td>(2)</td><td>(3)</td><td>(4)</td><td>(5)</td><td>(6)</td><td>(7)</td><td>(8)</td><td>(9)</td><td>(10)</td><td>(11)</td><td>(12)</td>
    </tr>
  </thead>
  <tbody>
    @forelse($rows as $i => $row)
    <tr>
      <td class="l"><strong>{{ $i + 1 }}. {{ strtoupper($row['creditor']) }}</strong></td>
      <td class="c">{{ $row['date_contracted'] }}</td>
      <td class="c">{{ $row['term_line1'] }}</td>
      <td class="r">{!! $num2($row['principal_amount']) !!}</td>
      <td class="l">{{ $row['purpose'] }}</td>
      <td class="r">{!! $num2($row['previous_principal']) !!}</td>
      <td class="r">{!! $num2($row['previous_interest']) !!}</td>
      <td class="r">{!! $num2($row['previous_total']) !!}</td>
      <td class="r">{!! $num2($row['current_principal']) !!}</td>
      <td class="r">{!! $num2($row['current_interest']) !!}</td>
      <td class="r">{!! $num2($row['current_total']) !!}</td>
      <td class="r">{!! $num2($row['balance_principal']) !!}</td>
    </tr>
    @if($row['term_line2'])
    <tr>
      <td style="border-top:none;"></td><td style="border-top:none;"></td>
      <td class="l" style="border-top:none;font-style:italic;font-size:6.5pt;">{{ $row['term_line2'] }}</td>
      <td style="border-top:none;"></td><td style="border-top:none;"></td>
      <td style="border-top:none;"></td><td style="border-top:none;"></td>
      <td style="border-top:none;"></td><td style="border-top:none;"></td>
      <td style="border-top:none;"></td><td style="border-top:none;"></td>
      <td style="border-top:none;"></td>
    </tr>
    @endif
    @empty
    <tr><td colspan="12" class="c" style="padding:12px;">No indebtedness records found.</td></tr>
    @endforelse
    @if(count($rows) > 0)
    <tr class="total-row">
      <td colspan="3" class="r">Total</td>
      <td class="r">{!! $num2($totals['principal_amount']) !!}</td>
      <td></td>
      <td class="r">{!! $num2($totals['previous_principal']) !!}</td>
      <td class="r">{!! $num2($totals['previous_interest']) !!}</td>
      <td class="r">{!! $num2($totals['previous_total']) !!}</td>
      <td class="r">{!! $num2($totals['current_principal']) !!}</td>
      <td class="r">{!! $num2($totals['current_interest']) !!}</td>
      <td class="r">{!! $num2($totals['current_total']) !!}</td>
      <td class="r">{!! $num2($totals['balance_principal']) !!}</td>
    </tr>
    @endif
  </tbody>
</table>

<table class="sig-plain">
  <tr>
    <td style="width:35%;">
      Certified Correct :
      <span class="sig-name">{{ $signatories['accountant']['name'] }}</span>
      <span class="sig-title">{{ $signatories['accountant']['title'] }}</span>
    </td>
    <td style="width:30%;"></td>
    <td style="width:35%;">
      Noted :
      <span class="sig-name">{{ $signatories['mayor']['name'] }}</span>
      <span class="sig-title">{{ $signatories['mayor']['title'] }}</span>
    </td>
  </tr>
</table>
</div>

{{-- ── SUMMARY OF EXPENDITURES ──────────────────────────────────────── --}}
@elseif($mode === 'summary')
@php
$year          = $data['year'];
$lgu           = $data['lgu'];
$categoryBlocks= $data['category_blocks'];
$specialPlans  = $data['special_plans'];
$mdf           = $data['mdf'];
$ldrrmf        = $data['ldrrmf'];
$grandPS       = $data['grand_ps'];
$grandMOOE     = $data['grand_mooe'];
$grandCO       = $data['grand_co'];
$grandSPA      = $data['grand_spa'];
$subTotal      = $data['sub_total'];
$statutory     = $data['statutory'];
$grandTotal    = $data['grand_total'];

$pf = function($n): string {   // first row in section — ₱ prefix, dash when 0
    if ((float)$n == 0) return ' - ';
    return chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0).number_format((float)$n, 0);
};
$pa = function($n): string {   // subtotal / grand — ₱ always
    return chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0).number_format((float)$n, 0);
};
$nf = function($n): string {   // continuation rows — number, dash when 0
    if ((float)$n == 0) return ' - ';
    return number_format((float)$n, 0);
};
@endphp

<div class="page">

<div class="form-no">Summary of Expenditures</div>
<div class="doc-title">SUMMARY OF EXPENDITURES</div>
<div class="doc-title">LGU : {{ $lgu }}</div>
<div class="fund-label">General Fund, CY {{ $year }}</div>
<div class="fund-label" style="margin-bottom:4px;">In Pesos</div>

<table class="data-table">
    <thead>
        <tr>
            <th style="text-align:left;width:38%;">Office</th>
            <th width="12%">Personal<br>Services</th>
            <th width="11%">MOOE</th>
            <th width="11%">Capital<br>Outlay</th>
            <th width="15%">Special Purpose<br>Appropriation</th>
            <th width="13%">Total</th>
        </tr>
        <tr class="col-num">
            <td>(1)</td>
            <td>(2)</td>
            <td>(3)</td>
            <td>(4)</td>
            <td>(5)</td>
            <td>(6)</td>
        </tr>
    </thead>
    <tbody>

    {{-- ── Category blocks — show ALL categories and ALL depts even if zero ── --}}
    @foreach($categoryBlocks as $block)

    <tr class="sec-hdr">
        <td colspan="6">{{ strtoupper($block['category_name']) }}</td>
    </tr>

    @foreach($block['rows'] as $ri => $row)
    <tr>
        <td class="l">{{ $row['dept_name'] }}</td>
        <td class="r">{!! $ri === 0 ? $pf($row['ps'])    : $nf($row['ps'])    !!}</td>
        <td class="r">{!! $ri === 0 ? $pf($row['mooe'])  : $nf($row['mooe'])  !!}</td>
        <td class="r">{!! $ri === 0 ? $pf($row['co'])    : $nf($row['co'])    !!}</td>
        <td class="r">{!! $ri === 0 ? $pf($row['spa'])   : $nf($row['spa'])   !!}</td>
        <td class="r">{!! $ri === 0 ? $pf($row['total']) : $nf($row['total']) !!}</td>
    </tr>
    @endforeach

    <tr class="subtotal">
        <td class="l">Total {{ $block['category_name'] }}</td>
        <td class="r">{!! $pa($block['totals']['ps'])    !!}</td>
        <td class="r">{!! $pa($block['totals']['mooe'])  !!}</td>
        <td class="r">{!! $pa($block['totals']['co'])    !!}</td>
        <td class="r">{!! $pa($block['totals']['spa'])   !!}</td>
        <td class="r">{!! $pa($block['totals']['total']) !!}</td>
    </tr>

    @endforeach

    {{-- ── Special Plans ── --}}
    @foreach($specialPlans as $si => $plan)
    <tr>
        <td class="l">{{ $plan['label'] }}</td>
        <td class="r"> - </td>
        <td class="r"> - </td>
        <td class="r"> - </td>
        <td class="r">{!! $si === 0 ? $pf($plan['total']) : $nf($plan['total']) !!}</td>
        <td class="r"> - </td>
    </tr>
    @endforeach

    <tr class="subtotal">
        <td class="l">Total Plans / Programs</td>
        <td class="r"> - </td>
        <td class="r"> - </td>
        <td class="r"> - </td>
        <td class="r">{!! $pa(array_sum(array_column($specialPlans, 'total'))) !!}</td>
        <td class="r"> - </td>
    </tr>

    {{-- ── Sub-Total ── --}}
    <tr class="grand">
        <td class="l"><strong>Sub-Total</strong></td>
        <td class="r">{!! $pa($grandPS)   !!}</td>
        <td class="r">{!! $pa($grandMOOE) !!}</td>
        <td class="r">{!! $pa($grandCO)   !!}</td>
        <td class="r">{!! $pa($grandSPA)  !!}</td>
        <td class="r">{!! $pa($subTotal)  !!}</td>
    </tr>

    {{-- ── Other Services ── --}}
    <tr class="sec-hdr">
        <td colspan="6">Other Services</td>
    </tr>

    <tr>
        <td class="l"><strong>Budgetary &amp; Statutory Requirements</strong></td>
        <td></td><td></td><td></td><td></td><td class="r"> - </td>
    </tr>
    <tr>
        <td class="l" style="padding-left:20pt;">20% Municipal Development Fund</td>
        <td></td><td></td><td></td><td></td>
        <td class="r">{!! $pf($mdf) !!}</td>
    </tr>
    <tr>
        <td class="l" style="padding-left:20pt;">5% LDRRMF</td>
        <td></td><td></td><td></td><td></td>
        <td class="r">{!! $nf($ldrrmf) !!}</td>
    </tr>

    <tr class="subtotal">
        <td class="l">Sub-Total</td>
        <td></td><td></td><td></td><td></td>
        <td class="r">{!! $pa($statutory) !!}</td>
    </tr>

    {{-- ── Grand Total ── --}}
    <tr class="grand-total">
        <td class="l">Grand Total</td>
        <td></td><td></td><td></td><td></td>
        <td class="r">{!! $pa($grandTotal) !!}</td>
    </tr>

    </tbody>
</table>

{{-- Signature block --}}
<table style="width:100%;border-collapse:collapse;font-size:6.5pt;margin-top:0;border:1px solid #000;">
  <tr>
    <td style="border:none;text-align:left;vertical-align:top;width:33%;padding:8px 6px 18px;">
      Prepared by:
      <span class="sig-name">{{ $signatories['budget_officer']['name'] }}</span>
      <span class="sig-title">{{ $signatories['budget_officer']['title'] }}</span>
    </td>
  </tr>
</table>

</div>


{{-- ── FORM 6 ──────────────────────────────────────────────────────────── --}}
@elseif($mode === 'form6')
@php
$year        = $data['year'];
$lgu         = $data['lgu'];
$forms6      = $data['forms'];   // array of { label, source, is_special, rows, grand_total }

// Formatters
$pf = function($n): string {   // ₱ prefix, blank when 0
    if ((float)$n == 0) return '';
    return chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0).number_format((float)$n, 0);
};
$pa = function($n): string {   // ₱ always
    return chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0).number_format((float)$n, 0);
};
$nf = function($n): string {   // number only, blank when 0
    if ((float)$n == 0) return '0';
    return number_format((float)$n, 0);
};
@endphp

@foreach($forms6 as $form6)
@php
$rows       = $form6['rows'];
$grandTotal = $form6['grand_total'];
$isSpecial  = $form6['is_special'];
$label      = $form6['label'];

// Build maps for parent lookup and computed amounts
$rowsByCode  = collect($rows)->keyBy('code');
$childrenOf  = [];
foreach ($rows as $r) {
    if ($r['parent_code']) {
        $childrenOf[$r['parent_code']][] = $r;
    }
}

// Compute amounts for computed rows (sum of children)
$computed = [];
$computeAmount = function(array $r) use (&$computed, &$computeAmount, $rowsByCode, $childrenOf): float {
    if (isset($computed[$r['code']])) return $computed[$r['code']];
    if ($r['is_computed']) {
        $children = $childrenOf[$r['code']] ?? [];
        $sum = 0.0;
        foreach ($children as $child) {
            $childRow = $rowsByCode->get($child['code']);
            if ($childRow) {
                $sum += $computeAmount($childRow);
            }
        }
        $computed[$r['code']] = $sum > 0 ? $sum : (float) $r['amount'];
        return $computed[$r['code']];
    }
    $computed[$r['code']] = (float) $r['amount'];
    return $computed[$r['code']];
};
foreach ($rows as $r) { $computeAmount($r); }
@endphp

<div class="page">

<div class="form-no">LBP Form No. 6</div>
<div class="doc-title">STATEMENT OF STATUTORY AND CONTRACTUAL OBLIGATIONS AND BUDGETARY REQUIREMENTS</div>
<div class="doc-title">LGU : {{ $lgu }}</div>
<div class="fund-label">
  @if($form6['is_special'])
    Special Account: {{ $form6['label'] }}, CY {{ $year }}
  @else
    General Fund, CY {{ $year }}
  @endif
</div>

{{--
    Table borders:
    - Outer shell: left + right + top only (bottom closed by tfoot)
    - Col 1 td: right border = center divider
    - Col 2 td: no extra borders
    - No top/bottom borders on data rows
--}}
<table class="data-table" style="font-size:6.5pt;border-left:1px solid #000;border-right:1px solid #000;border-top:1px solid #000;border-bottom:none;">
    <thead>
        <tr>
            <th style="text-align:center;width:55%;border-left:none;border-top:none;border-right:1px solid #000;border-bottom:1px solid #000;">Object of Expenditures</th>
            <th style="text-align:center;width:45%;border-left:none;border-top:none;border-right:none;border-bottom:1px solid #000;">Amount</th>
        </tr>
        <tr class="col-num">
            <td style="text-align:center;border-left:none;border-top:none;border-right:1px solid #000;border-bottom:1px solid #000;">(1)</td>
            <td style="text-align:center;border-left:none;border-top:none;border-right:none;border-bottom:1px solid #000;">(2)</td>
        </tr>
    </thead>
    <tbody>

    @foreach($rows as $row)
    @php
        $amount     = $computed[$row['code']] ?? (float)$row['amount'];
        $isSection  = (bool) $row['is_section'];
        $isComputed = (bool) $row['is_computed'];
        $showPeso   = (bool) $row['show_peso_sign'];
        $level      = (int)  $row['level'];
        $code       = $row['code'];
        $label      = $row['label'];

        $indent = str_repeat('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;', max(0, $level + 1));

        if ($isSection) {
            $displayAmt = '';
        } elseif ($showPeso) {
            $displayAmt = $pf($amount);
            if ($displayAmt === '') $displayAmt = chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0).' - ';
        } else {
            $displayAmt = $nf($amount);
        }

        // col1 gets center divider (right border); col2 gets none
        $tdL = 'border-top:none;border-bottom:none;border-left:none;border-right:1px solid #000;';
        $tdR = 'border-top:none;border-bottom:none;border-left:none;border-right:none;';
    @endphp

    @if($isSection)
    <tr class="sec-hdr">
        <td style="border-top:none;border-bottom:none;border-left:none;border-right:1px solid #000;">{!! $indent !!}{{ $label }}</td>
        <td style="border-top:none;border-bottom:none;border-left:none;border-right:none;"></td>
    </tr>
    @elseif($level === 0)
    <tr class="subtotal">
        <td class="l" style="{{ $tdL }}">{!! $indent !!}{{ $label }}</td>
        <td class="r" style="{{ $tdR }}">{!! $displayAmt !!}</td>
    </tr>
    @elseif($level === 1 && !isset($childrenOf[$code]))
    <tr>
        <td class="l" style="{{ $tdL }}">
            {!! $indent !!}<span style="display:inline-block;width:20pt;line-height:1;vertical-align:baseline;">{{ $code }}</span><span style="vertical-align:baseline;">{{ $label }}</span>
        </td>
        <td class="r" style="{{ $tdR }}">{!! $displayAmt !!}</td>
    </tr>
    @elseif($level === 1 && isset($childrenOf[$code]))
    <tr class="subtotal">
        <td class="l" style="{{ $tdL }}">
            {!! $indent !!}<strong>{{ $label }}</strong>
        </td>
        <td class="r" style="{{ $tdR }}">{!! $displayAmt !!}</td>
    </tr>
    @elseif($level === 2)
    <tr>
        <td class="l" style="{{ $tdL }}">
            {!! $indent !!}<span style="display:inline-block;width:24pt;line-height:1;vertical-align:baseline;">{{ $code }}</span><span style="vertical-align:baseline;">{{ $label }}</span>
        </td>
        <td class="r" style="{{ $tdR }}">{!! $displayAmt !!}</td>
    </tr>
    @else
    <tr>
        <td class="l" style="{{ $tdL }}">{!! $indent !!}{{ $label }}</td>
        <td class="r" style="{{ $tdR }}">{!! $displayAmt !!}</td>
    </tr>
    @endif

    @endforeach

    </tbody>
    <tfoot>
        <tr class="grand-total">
            <td class="r" style="font-weight:bold;border-top:2px solid #000;border-bottom:1px solid #000;border-left:none;border-right:1px solid #000;">Total</td>
            <td class="r" style="border-top:2px solid #000;border-bottom:1px solid #000;border-left:none;border-right:none;">{!! $pa($grandTotal) !!}</td>
        </tr>
    </tfoot>
</table>

{{-- Certified Correct block — identical structure to Form 1 cert block --}}
<table style="width:100%;border-collapse:collapse;font-size:6.5pt;margin-top:0;">
  {{-- Label row: full border on top/left/right, no bottom --}}
  <tr>
    <td style="border:1px solid #000;border-bottom:none;text-align:left;padding:4px 6px 18px;">
      Certified Correct : Local Finance Committee
    </td>
  </tr>
  {{-- Signatories row: left+right border only, no top, no bottom --}}
  <tr>
    <td style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;padding:0;">
      <table style="width:100%;border-collapse:collapse;font-size:6.5pt;">
        <tr>
          <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:8px 6px 6px;">
            <span class="sig-name">{{ $signatories['budget_officer']['name'] }}</span>
            <span class="sig-title">{{ $signatories['budget_officer']['title'] }}</span>
          </td>
          <td style="border:none;text-align:center;vertical-align:top;width:34%;padding:8px 6px 6px;">
            <span class="sig-name">{{ $signatories['mpdc']['name'] }}</span>
            <span class="sig-title">{{ $signatories['mpdc']['title'] }}</span>
          </td>
          <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:8px 6px 6px;">
            <span class="sig-name">{{ $signatories['treasurer']['name'] }}</span>
            <span class="sig-title">{{ $signatories['treasurer']['title'] }}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  {{-- Approved row: full border except no top --}}
  <tr>
    <td style="border:1px solid #000;border-top:none;text-align:center;padding:6px 6px 18px;">
      <p style="font-size:6.5pt;margin-bottom:3px;font-weight:bold;">Approved :</p>
      <span class="sig-name">{{ $signatories['mayor']['name'] }}</span>
      <span class="sig-title">{{ $signatories['mayor']['title'] }}</span>
    </td>
  </tr>
</table>

</div>{{-- end .page --}}
@endforeach

{{-- ── FORM 7  (Statement of Fund Allocation by Sector) ────────────────────── --}}
@elseif($mode === 'form7')
@php
$year    = $data['year'];
$lgu     = $data['lgu'];
$forms7  = $data['forms'];

$pa = function($n): string {
    if ((float)$n == 0) return ' - ';
    return chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0).number_format((float)$n, 0);
};
$nf = function($n): string {
    if ((float)$n == 0) return ' - ';
    return number_format((float)$n, 0);
};
@endphp

@foreach($forms7 as $form7)
@php
$sections   = $form7['sections']    ?? [];
$grandTotal = $form7['grand_total'] ?? null;
$isSpecial  = $form7['is_special'];
$colCount   = $isSpecial ? 3 : 7;
@endphp

<div class="page">

<div class="form-no">LBP Form No. 7</div>
<div class="doc-title">STATEMENT OF FUND ALLOCATION BY SECTOR</div>
<div class="doc-title">LGU : {{ $lgu }}</div>
<div class="fund-label">
    @if($isSpecial)
        Special Account: {{ $form7['label'] }}, CY {{ $year }}
    @else
        General Fund, CY {{ $year }}
    @endif
</div>

<table class="data-table" style="font-size:6.5pt;">
    @if(!$isSpecial)
    <colgroup>
        <col style="width:33%;">
        <col style="width:9%;">
        <col style="width:14%;">
        <col style="width:14%;">
        <col style="width:13%;">
        <col style="width:13%;">
        <col style="width:14%;">
    </colgroup>
    @else
    <colgroup>
        <col style="width:73%;">
        <col style="width:9%;">
        <col style="width:18%;">
    </colgroup>
    @endif
    <thead>
        <tr>
            <th style="text-align:left;">Particulars</th>
            <th>Account<br>Code</th>
            @if(!$isSpecial)
            <th>General<br>Public<br>Service</th>
            <th>Social<br>Services</th>
            <th>Economic<br>Services</th>
            <th>Other<br>Services</th>
            @endif
            <th>{{ $isSpecial ? $form7['label'].' Total' : 'Total' }}</th>
        </tr>
        <tr class="col-num">
            <td>(1)</td>
            <td>(2)</td>
            @if(!$isSpecial)
            <td>(3)</td>
            <td>(4)</td>
            <td>(5)</td>
            <td>(6)</td>
            @endif
            <td>{{ $isSpecial ? '(3)' : '(7)' }}</td>
        </tr>
    </thead>
    <tbody>

    @foreach($sections as $section)

    {{-- ── Section header ── --}}
    <tr class="sec-hdr">
        <td colspan="{{ $colCount }}">{{ $section['section_label'] }}</td>
    </tr>

    {{-- ── FE section — general fund (has sector columns) ── --}}
    @if($section['section_code'] === 'FE' && !$isSpecial)
        @foreach($section['obligations'] ?? [] as $obIdx => $ob)
        <tr>
            <td class="l" colspan="6" style="padding-left:12pt;font-weight:bold;">{{ $ob['creditor'] }}@if(!empty($ob['purpose'])) ({{ $ob['purpose'] }})@endif</td>
            <td></td>
        </tr>
        <tr>
            <td class="l" style="padding-left:18pt;font-style:italic;">Principal</td>
            <td></td>
            <td class="r">{!! $nf($ob['principal']) !!}</td>
            <td class="r"> - </td>
            <td class="r"> - </td>
            <td class="r"> - </td>
            <td class="r">{!! $nf($ob['principal']) !!}</td>
        </tr>
        <tr>
            <td class="l" style="padding-left:18pt;font-style:italic;">Interest</td>
            <td></td>
            <td class="r">{!! $nf($ob['interest']) !!}</td>
            <td class="r"> - </td>
            <td class="r"> - </td>
            <td class="r"> - </td>
            <td class="r">{!! $nf($ob['interest']) !!}</td>
        </tr>
        @endforeach

    {{-- ── FE section — special account (no sector columns) ── --}}
    @elseif($section['section_code'] === 'FE' && $isSpecial)
        @foreach($section['obligations'] ?? [] as $obIdx => $ob)
        <tr>
            <td class="l" colspan="2" style="padding-left:12pt;font-weight:bold;">{{ $ob['creditor'] }}@if(!empty($ob['purpose'])) ({{ $ob['purpose'] }})@endif</td>
            <td></td>
        </tr>
        <tr>
            <td class="l" style="padding-left:18pt;font-style:italic;">Principal</td>
            <td class="r">{!! $nf($ob['principal']) !!}</td>
            <td></td>
        </tr>
        <tr>
            <td class="l" style="padding-left:18pt;font-style:italic;">Interest</td>
            <td class="r">{!! $nf($ob['interest']) !!}</td>
            <td></td>
        </tr>
        @endforeach

    {{-- ── Standard rows (PS / MOOE / CO / SPA) — general fund ── --}}
    @elseif(!$isSpecial)
        @foreach($section['rows'] ?? [] as $rIdx => $row)
        <tr>
            <td class="l" style="padding-left:6pt;">{{ $row['item_name'] }}</td>
            <td class="c" style="font-size:6pt;">{{ $row['account_code'] ?? '' }}</td>
            <td class="r">{!! $rIdx === 0 ? $pa($row['general_public_services']) : $nf($row['general_public_services']) !!}</td>
            <td class="r">{!! $rIdx === 0 ? $pa($row['social_services'])         : $nf($row['social_services']) !!}</td>
            <td class="r">{!! $rIdx === 0 ? $pa($row['economic_services'])       : $nf($row['economic_services']) !!}</td>
            <td class="r">{!! $rIdx === 0 ? $pa($row['other_services'])          : $nf($row['other_services']) !!}</td>
            <td class="r">{!! $rIdx === 0 ? $pa($row['total']) : $nf($row['total']) !!}</td>
        </tr>
        @endforeach

    {{-- ── Standard rows — special account ── --}}
    @else
        @foreach($section['rows'] ?? [] as $rIdx => $row)
        <tr>
            <td class="l" style="padding-left:6pt;">{{ $row['item_name'] }}</td>
            <td class="c" style="font-size:6pt;">{{ $row['account_code'] ?? '' }}</td>
            <td class="r">{!! $rIdx === 0 ? $pa($row['total']) : $nf($row['total']) !!}</td>
        </tr>
        @endforeach
    @endif

    {{-- ── Section subtotal — general fund ── --}}
    @if(!$isSpecial)
    <tr class="subtotal">
        <td class="l">Total {{ $section['section_code'] }}</td>
        <td></td>
        <td class="r">{!! $pa($section['subtotal']['general_public_services']) !!}</td>
        <td class="r">{!! $pa($section['subtotal']['social_services']) !!}</td>
        <td class="r">{!! $pa($section['subtotal']['economic_services']) !!}</td>
        <td class="r">{!! $pa($section['subtotal']['other_services']) !!}</td>
        <td class="r">{!! $pa($section['subtotal']['total']) !!}</td>
    </tr>
    @else
    {{-- ── Section subtotal — special account ── --}}
    <tr class="subtotal">
        <td class="l">Total {{ $section['section_code'] }}</td>
        <td></td>
        <td class="r">{!! $pa($section['subtotal']['total']) !!}</td>
    </tr>
    @endif

    @endforeach {{-- sections --}}

    </tbody>

    @if($grandTotal)
    @if(!$isSpecial)
    <tfoot>
        <tr class="grand-total">
            <td class="l" colspan="2">Grand Total</td>
            <td class="r">{!! $pa($grandTotal['general_public_services']) !!}</td>
            <td class="r">{!! $pa($grandTotal['social_services']) !!}</td>
            <td class="r">{!! $pa($grandTotal['economic_services']) !!}</td>
            <td class="r">{!! $pa($grandTotal['other_services']) !!}</td>
            <td class="r">{!! $pa($grandTotal['total']) !!}</td>
        </tr>
    </tfoot>
    @else
    <tfoot>
        <tr class="grand-total">
            <td class="l">Grand Total</td>
            <td></td>
            <td class="r">{!! $pa($grandTotal['total']) !!}</td>
        </tr>
    </tfoot>
    @endif
    @endif
</table>

{{-- Signature block --}}
<table style="width:100%;border-collapse:collapse;font-size:6.5pt;margin-top:0;">
  <tr>
    <td style="border:1px solid #000;border-bottom:none;text-align:left;padding:4px 6px 18px;">
      We hereby certify that the information presented above are true and correct.
    </td>
  </tr>
  <tr>
    <td style="border-left:1px solid #000;border-right:1px solid #000;border-top:none;border-bottom:none;padding:0;">
      <table style="width:100%;border-collapse:collapse;font-size:6.5pt;">
        <tr>
          <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:8px 6px 6px;">
            <span class="sig-name">{{ $signatories['budget_officer']['name'] }}</span>
            <span class="sig-title">{{ $signatories['budget_officer']['title'] }}</span>
          </td>
          <td style="border:none;text-align:center;vertical-align:top;width:34%;padding:8px 6px 6px;">
            <span class="sig-name">{{ $signatories['mpdc']['name'] }}</span>
            <span class="sig-title">{{ $signatories['mpdc']['title'] }}</span>
          </td>
          <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:8px 6px 6px;">
            <span class="sig-name">{{ $signatories['treasurer']['name'] }}</span>
            <span class="sig-title">{{ $signatories['treasurer']['title'] }}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="border:1px solid #000;border-top:none;text-align:center;padding:6px 6px 18px;">
      <p style="font-size:6.5pt;margin-bottom:3px;font-weight:bold;">Approved :</p>
      <span class="sig-name">{{ $signatories['mayor']['name'] }}</span>
      <span class="sig-title">{{ $signatories['mayor']['title'] }}</span>
    </td>
  </tr>
</table>

</div>{{-- end .page --}}
@endforeach {{-- forms7 --}}
{{-- end form7 --}}

{{-- ── 20% MDF REPORT ────────────────────────────────────────────────────── --}}
@elseif($mode === 'mdf20')
@php
$year         = $data['year'];
$currentYear  = $data['current_year'];
$pastYear     = $data['past_year'];
$lgu          = $data['lgu'];
$categoryRows = $data['category_rows'];
$grandTotals  = $data['grand_totals'];

$fields5 = ['past_total','cur_sem1','cur_sem2','cur_total','proposed'];

// Same formatters as the rest of the blade
$pf = function($n): string {
    if ((float)$n == 0) return '';
    return chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0).number_format((float)$n, 0);
};
$pa = function($n): string {
    return chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0).number_format((float)$n, 0);
};
$nf = function($n): string {
    if ((float)$n == 0) return ' - ';
    return number_format((float)$n, 0);
};
@endphp

<div class="page">

<div class="form-no" style="text-align:center;">20% Municipal Development Fund CY {{ $year }}</div>
<div class="doc-title">{{ $lgu }}</div>
<div style="text-align:center;font-size:6.5pt;margin-bottom:4px;">In Pesos</div>

<table class="data-table">
    <thead>
        <tr>
            <th rowspan="2" width="30%">Object of Expenditure</th>
            <th rowspan="2" width="10%">Account<br>Code</th>
            <th rowspan="2" width="12%">{{ $pastYear }}<br>Past Year<br>Actual</th>
            <th colspan="3">Current Year {{ $currentYear }} (Estimate)</th>
            <th rowspan="2" width="12%">{{ $year }}<br>Budget Year<br>(Proposed)</th>
        </tr>
        <tr>
            <th width="9%">1st Semester<br>(Actual)</th>
            <th width="9%">2nd Semester<br>(Estimate)</th>
            <th width="10%">Total</th>
        </tr>
        <tr class="col-num">
            <td>(1)</td><td>(2)</td><td>(3)</td><td>(4)</td><td>(5)</td><td>(6)</td><td>(7)</td>
        </tr>
    </thead>
    <tbody>

    @foreach($categoryRows as $catIdx => $cat)

    {{-- Category section header --}}
    <tr class="sec-hdr">
        <td colspan="7">{{ strtoupper($cat['name']) }}</td>
    </tr>

    @php
        // Group debt items by obligation so principal+interest render together
        $regularItems = array_values(array_filter($cat['items'], fn($i) => !$i['is_debt_row']));
        $debtItems    = array_values(array_filter($cat['items'], fn($i) =>  $i['is_debt_row']));

        // Group debts: obligation_id → [principal => row, interest => row]
        $debtGrouped = [];
        foreach ($debtItems as $di) {
            $key = $di['obligation_id'];
            $debtGrouped[$key][$di['debt_type']] = $di;
        }
    @endphp

    {{-- Regular items first --}}
    @foreach($regularItems as $rIdx => $item)
    <tr>
        <td class="l" style="padding-left:12pt;">{{ $item['name'] }}</td>
        <td class="c">{{ $item['account_code'] }}</td>
        <td class="r">{!! $rIdx === 0 ? $pf($item['past_total']) : $nf($item['past_total']) !!}</td>
        <td class="r">{!! $rIdx === 0 ? $pf($item['cur_sem1'])   : $nf($item['cur_sem1'])   !!}</td>
        <td class="r">{!! $rIdx === 0 ? $pf($item['cur_sem2'])   : $nf($item['cur_sem2'])   !!}</td>
        <td class="r">{!! $rIdx === 0 ? $pf($item['cur_total'])  : $nf($item['cur_total'])  !!}</td>
        <td class="r">{!! $rIdx === 0 ? $pf($item['proposed'])   : $nf($item['proposed'])   !!}</td>
    </tr>
    @endforeach

    {{-- Debt items: principal row then indented interest row --}}
    @foreach($debtGrouped as $obId => $types)
    @php
        $principal = $types['principal'] ?? null;
        $interest  = $types['interest']  ?? null;
        // Derive obligation display name from principal row (strip " - Principal" suffix if present)
        $obName = $principal
            ? preg_replace('/ - Principal$/i', '', $principal['name'])
            : preg_replace('/ - Interest$/i',  '', $interest['name']);
    @endphp

    @if($principal)
    <tr>
        <td class="l" style="padding-left:12pt;">{{ $obName }} - Principal</td>
        <td class="c">{{ $principal['account_code'] }}</td>
        <td class="r">{!! $nf($principal['past_total']) !!}</td>
        <td class="r">{!! $nf($principal['cur_sem1'])   !!}</td>
        <td class="r">{!! $nf($principal['cur_sem2'])   !!}</td>
        <td class="r">{!! $nf($principal['cur_total'])  !!}</td>
        <td class="r">{!! $nf($principal['proposed'])   !!}</td>
    </tr>
    @endif

    @if($interest)
    <tr>
        <td class="l" style="padding-left:40pt;">- Interest</td>
        <td class="c">{{ $interest['account_code'] }}</td>
        <td class="r">{!! $nf($interest['past_total']) !!}</td>
        <td class="r">{!! $nf($interest['cur_sem1'])   !!}</td>
        <td class="r">{!! $nf($interest['cur_sem2'])   !!}</td>
        <td class="r">{!! $nf($interest['cur_total'])  !!}</td>
        <td class="r">{!! $nf($interest['proposed'])   !!}</td>
    </tr>
    @endif

    @endforeach {{-- debtGrouped --}}

    @endforeach {{-- categoryRows --}}

    {{-- Grand Total --}}
    <tr class="grand-total">
        <td class="l" colspan="2"><strong>GRAND TOTAL - MUNICIPAL DEVELOPMENT FUND</strong></td>
        <td class="r">{!! $pa($grandTotals['past_total']) !!}</td>
        <td class="r">{!! $pa($grandTotals['cur_sem1'])   !!}</td>
        <td class="r">{!! $pa($grandTotals['cur_sem2'])   !!}</td>
        <td class="r">{!! $pa($grandTotals['cur_total'])  !!}</td>
        <td class="r">{!! $pa($grandTotals['proposed'])   !!}</td>
    </tr>

    </tbody>
</table>

{{-- Signature block — same structure as Form 1 --}}
<table style="width:100%;border-collapse:collapse;font-size:6.5pt;margin-top:0;border:1px solid #000;">
  <tr>
    <td style="border-left:1px solid #000;border-right:1px solid #000;border-top:1px solid #000;border-bottom:none;padding:0;">
      <table style="width:100%;border-collapse:collapse;font-size:6.5pt;">
        <tr>
          <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:8px 6px 6px;">
            Prepared by :
            <span class="sig-name">{{ $signatories['budget_officer']['name'] }}</span>
            <span class="sig-title">{{ $signatories['budget_officer']['title'] }}</span>
          </td>
          <td style="border:none;text-align:center;vertical-align:top;width:34%;padding:8px 6px 6px;">
            Reviewed by :
            <span class="sig-name">{{ $signatories['mpdc']['name'] }}</span>
            <span class="sig-title">{{ $signatories['mpdc']['title'] }}</span>
          </td>
          <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:8px 6px 6px;">
            <span class="sig-name">{{ $signatories['administrator']['name'] }}</span>
            <span class="sig-title">{{ $signatories['administrator']['title'] }}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="border:1px solid #000;border-top:none;text-align:center;padding:6px 6px 18px;">
      <p style="font-size:6.5pt;margin-bottom:3px;font-weight:bold;">Approved :</p>
      <span class="sig-name">{{ $signatories['mayor']['name'] }}</span>
      <span class="sig-title">{{ $signatories['mayor']['title'] }}</span>
    </td>
  </tr>
</table>

</div>{{-- end .page --}}
{{-- end mdf20 --}}

{{-- ── PS COMPUTATION ──────────────────────────────────────────────────────── --}}
@elseif($mode === 'pscomputation')
@php
$year        = $data['year'];
$incomeYear  = $data['income_year'];
$lgu         = $data['lgu'];

$pf = function($n): string {
    if ((float)$n == 0) return '';
    return chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0).number_format((float)$n, 0);
};
$pa = function($n): string {
    return chr(0xE2).chr(0x82).chr(0xB1).chr(0xC2).chr(0xA0).number_format((float)$n, 0);
};
$nf = function($n): string {
    if ((float)$n == 0) return ' - ';
    return number_format((float)$n, 0);
};
$nfA = function($n): string {
    return number_format((float)$n, 0);
};
@endphp

<div class="page">

<div style="text-align:center;font-size:7pt;font-weight:bold;margin-bottom:1px;border-top:1px solid">Municipality of Opol</div>
<div style="text-align:center;font-size:7pt;font-weight:bold;margin-bottom:1px;">Misamis Oriental</div>
<div style="text-align:center;font-size:8pt;font-weight:bold;text-transform:uppercase;margin-bottom:5px;margin-top:3px;">
    PS COMPUTATION CY-{{ $year }}
</div>

{{--
    BORDER STRATEGY:
    - Outer table border:  border:1px solid #000  on the <table> itself
    - All td/tr:           border:none  (no individual cell borders except where noted)
    - Amount column cells: border-left:1px solid #000  (creates center divider)
    - Highlight rows (Amount Allowable, Sub Total B, Sub Total C, Total PS):
      full cell borders on both label and amount cells
    - Spacer rows:         border:none on all cells
--}}

<table class="data-table" style="font-size:7pt; border:1px solid #000;">
    {{-- Ghost row for column widths --}}
    <tr style="height:0;line-height:0;font-size:0;visibility:hidden;">
        <td style="width:5%;padding:0;border:none;"></td>
        <td style="width:5%;padding:0;border:none;"></td>
        <td style="width:5%;padding:0;border:none;"></td>
        <td style="width:40%;padding:0;border:none;"></td>
        <td style="width:25%;padding:0;border:none;"></td>
        <td style="width:20%;padding:0;border:none;"></td>
    </tr>
    <tbody>

    {{-- ── TOP SECTION ── --}}

    {{-- Total Income --}}
    <tr>
        <td colspan="5" class="l" style="border-top:1px solid #000;border-right:none;border-bottom:none;padding:2px 4px;">
            Total Income from sources realized from next preceding year <strong>{{ $incomeYear }}</strong>
        </td>
        <td class="r" style="border-top:1px solid #000;border-left:none;border-bottom:none;padding:2px 4px;">
            {!! $pa($data['total_income']) !!}
        </td>
    </tr>

    {{-- Spacer --}}
    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    {{-- Less Non-Recurring --}}
    <tr>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;">
            Less : Non-Recurring Income
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nfA($data['non_recurring']) !!}
        </td>
    </tr>

    {{-- Total Realized --}}
    <tr>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;font-weight:bold;">
            Total Realized Regular Income from next preceding year ({{ $incomeYear }})
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['total_realized']) !!}
        </td>
    </tr>

    {{-- Spacer --}}
    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    {{-- PS Limitation --}}
    <tr>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;">
            Less : Personnel Services Limitation (45%)
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['ps_limitation']) !!}
        </td>
    </tr>

    {{-- Spacer --}}
    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    {{-- Total PS GF --}}
    <tr>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;">
            Total Personnel Services for {{ $year }} - GF
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['total_ps_gf']) !!}
        </td>
    </tr>

    {{-- Spacer --}}
    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    {{-- Excess Amount --}}
    <tr>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;">
            Excess Amount
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nfA($data['excess_amount']) !!}
        </td>
    </tr>

    {{-- Spacer --}}
    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    {{-- Waived Items --}}
    <tr>
        <td colspan="6" class="l" style="border:none;padding:2px 4px;">
            Add: Waived Items
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td colspan="4" class="l" style="border:none;padding:2px 4px;">
            Terminal Leave - GF
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['terminal_leave_gf']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td colspan="4" class="l" style="border:none;padding:2px 4px;">
            Monetization - GF
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['monetization_gf']) !!}
        </td>
    </tr>
    <tr>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;font-weight:bold;">
            Total Waived Items
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;font-weight:bold;">
            {!! $nf($data['total_waived']) !!}
        </td>
    </tr>

    {{-- Spacer --}}
    <tr><td colspan="6" style="border:none;padding:1px;height:6px;"></td></tr>

    {{-- ── Amount Allowable — full border on both cells ── --}}
    <tr>
        <td colspan="5" class="l" style="border:1px solid #000;padding:3px 4px;font-weight:bold;">
            Amount Allowable
        </td>
        <td class="r" style="border:1px solid #000;padding:3px 4px;font-weight:bold;">
            {!! $pa($data['amount_allowable']) !!}
        </td>
    </tr>

    {{-- Spacer --}}
    <tr><td colspan="6" style="border:none;padding:1px;height:10px;"></td></tr>

    {{-- ══ DETAIL SECTION HEADER ══ --}}
    <tr>
        <td colspan="6" class="l" style="border:none;padding:3px 4px;font-weight:bold;font-size:7pt;">
            Personnel Services for Existing Plantilla Position
        </td>
    </tr>

    {{-- ── Section A ── --}}
    <tr>
        <td style="border:none;"></td>
        <td colspan="4" class="l" style="border:none;padding:2px 4px;font-weight:bold;">
            A. Salaries/Wages of Current Personnel
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;font-weight:bold;">
            {!! $pa($data['salaries_wages']) !!}
        </td>
    </tr>

    {{-- Spacer --}}
    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    {{-- ── Section B ── --}}
    <tr>
        <td style="border:none;"></td>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;font-weight:bold;">
            B. Statutory &amp; Contractual Obligation
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Retirement &amp; Life Insurance Premiums
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['retirement_insurance']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Pag-IBIG Contributions
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['pag_ibig']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            PhilHealth Contributions
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['philhealth']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Employees Compensation Insurance Premiums
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['ec_insurance']) !!}
        </td>
    </tr>

    {{-- Sub Total B — full border on both cells --}}
    <tr>
        
        <td colspan="5" class="l" style="border:1px solid #000;padding:2px 4px;font-weight:bold;">
            Sub Total
        </td>
        <td class="r" style="border:1px solid #000;padding:2px 4px;font-weight:bold;">
            {!! $nf($data['subtotal_b']) !!}
        </td>
    </tr>

    {{-- Spacer --}}
    <tr><td colspan="6" style="border:none;padding:1px;height:4px;"></td></tr>

    {{-- ── Section C ── --}}
    <tr>
        <td style="border:none;"></td>
        <td colspan="5" class="l" style="border:none;padding:2px 4px;font-weight:bold;">
            C. Existing Allowances &amp; Benefits of Regular Employees
        </td>
    </tr>
    @php
    $cItems = [
        ['label' => 'PERA',                                          'key' => 'pera',               'peso' => true],
        ['label' => 'Representation Allowance',                      'key' => 'representation',     'peso' => false],
        ['label' => 'Transportation Allowance',                      'key' => 'transportation',     'peso' => false],
        ['label' => 'Clothing Allowance',                            'key' => 'clothing',           'peso' => false],
        ['label' => 'Magna Carta Benefits of Public Health Workers', 'key' => 'magna_carta',        'peso' => false],
        ['label' => 'Hazard Pay',                                    'key' => 'hazard_pay',         'peso' => false],
        ['label' => 'Honoraria',                                     'key' => 'honoraria',          'peso' => false],
        ['label' => 'Overtime Pay',                                  'key' => 'overtime_pay',       'peso' => false],
        ['label' => 'Cash Gift',                                     'key' => 'cash_gift',          'peso' => false],
    ];
    @endphp
    @foreach($cItems as $ci)
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            {{ $ci['label'] }}
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $ci['peso'] ? $pf($data[$ci['key']]) : $nf($data[$ci['key']]) !!}
        </td>
    </tr>
    @endforeach

    {{-- Bonus sub-group --}}
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Bonus
        </td>
        <td style="border:none;border-left:none;"></td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td class="l" style="border:none;padding:2px 4px;">
            Mid-Year
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['mid_year_bonus']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td class="l" style="border:none;padding:2px 4px;">
            Year-End
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['year_end_bonus']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Terminal Leave
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['terminal_leave']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Productivity Enhancement Incentive
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['productivity_incentive']) !!}
        </td>
    </tr>
    <tr>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td style="border:none;"></td>
        <td colspan="2" class="l" style="border:none;padding:2px 4px;">
            Other Benefits (Monetization)
        </td>
        <td class="r" style="border:none;border-left:none;padding:2px 4px;">
            {!! $nf($data['monetization']) !!}
        </td>
    </tr>

    {{-- Sub Total C — full border on both cells --}}
    <tr>
        <td colspan="5" class="l" style="border:1px solid #000;padding:2px 4px;font-weight:bold;">
            Sub Total
        </td>
        <td class="r" style="border:1px solid #000;padding:2px 4px;font-weight:bold;">
            {!! $nf($data['subtotal_c']) !!}
        </td>
    </tr>

    {{-- Total PS — full border on both cells --}}
    <tr>
        <td colspan="5" class="l" style="border:1px solid #000;padding:3px 4px;font-weight:bold;">
            Total Personnel Services for {{ $year }}
        </td>
        <td class="r" style="border:1px solid #000;padding:3px 4px;font-weight:bold;">
            {!! $pa($data['total_ps']) !!}
        </td>
    </tr>

    </tbody>
</table>

{{-- Signature block — same bordered style as Form 1 / Form 2 --}}
<table style="width:100%;border-collapse:collapse;font-size:6.5pt;margin-top:0;border:1px solid #000;">
  <tr>
    <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:8px 6px 18px;">
      Prepared By :
      <span class="sig-name">{{ $signatories['budget_officer']['name'] }}</span>
      <span class="sig-title">{{ $signatories['budget_officer']['title'] }}</span>
    </td>
    <td style="border-left:none;border-right:none;text-align:center;vertical-align:top;width:34%;padding:8px 6px 18px;">
      Reviewed :
      <span class="sig-name">{{ $signatories['hrmo']['name'] }}</span>
      <span class="sig-title">{{ $signatories['hrmo']['title'] }}</span>
    </td>
    <td style="border:none;text-align:center;vertical-align:top;width:33%;padding:8px 6px 18px;">
      Noted :
      <span class="sig-name">{{ $signatories['accountant']['name'] }}</span>
      <span class="sig-title">{{ $signatories['accountant']['title'] }}</span>
    </td>
  </tr>
</table>

</div>{{-- end .page --}}
{{-- end pscomputation --}}


{{-- ── 5% CALAMITY FUND REPORT ──────────────────────────────────────────────── --}}
@elseif($mode === 'calamity5')
@php
$year      = $data['year'];
$lgu       = $data['lgu'];
$allForms5 = $data['all_forms'] ?? [['label' => $data['label'], 'is_special' => $data['is_special'], 'categories' => $data['categories'], 'summary' => $data['summary']]];

$pa = function($n): string {
    if ((float)$n == 0) return '';
    return number_format((float)$n, 0);
};
$paA = function($n): string {
    return ' ' . number_format((float)$n, 0) . ' ';
};
@endphp

@foreach($allForms5 as $cal5)
@php
$label      = $cal5['label'];
$isSpecial  = $cal5['is_special'];
$categories = $cal5['categories'];
$summary    = $cal5['summary'];
@endphp

<div class="page">

<div class="doc-title" style="margin-bottom:1px;">LOCAL DISASTER RISK REDUCTION &amp; MANAGEMENT FUND INVESTMENT PLAN ( LDRRMFIP )</div>
<div class="doc-title" style="margin-bottom:1px;">5% Calamity Fund ({{ $label }}) JANUARY TO DECEMBER {{ $year }}</div>
<div class="doc-title" style="margin-bottom:4px;">{{ $lgu }}</div>

<table class="form5-table" style="font-size:6.5pt;">
  <thead>
    <tr style="height:0;line-height:0;font-size:0;visibility:hidden;">
      <td style="width:18%;padding:0;border:none;"></td>
      <td style="width:26%;padding:0;border:none;"></td>
      <td style="width:5%;padding:0;border:none;"></td>
      <td style="width:5%;padding:0;border:none;"></td>
      <td style="width:5%;padding:0;border:none;"></td>
      <td style="width:16%;padding:0;border:none;"></td>
      <td style="width:5%;padding:0;border:none;"></td>
      <td style="width:7%;padding:0;border:none;"></td>
      <td style="width:7%;padding:0;border:none;"></td>
      <td style="width:6%;padding:0;border:none;"></td>
    </tr>
    <tr>
      <th rowspan="2">Functional Classification</th>
      <th rowspan="2">Program/Project/Activity Code and Description</th>
      <th rowspan="2">Implementing Office</th>
      <th colspan="2">Schedule of Implementation</th>
      <th rowspan="2">Expected Output</th>
      <th rowspan="2">Funding Source</th>
      <th colspan="3">Amount of Appropriation</th>
    </tr>
    <tr>
      <th>Starting Date</th>
      <th>Completion Date</th>
      <th>MOOE</th>
      <th>CO</th>
      <th>TOTAL</th>
    </tr>
  </thead>
  <tbody>

  @foreach($categories as $cat)
  @php
    $items = $cat['items'];
    $subMOOE  = $cat['subtotal_mooe'];
    $subCO    = $cat['subtotal_co'];
    $subTotal = $cat['subtotal_total'];
  @endphp

  @foreach($items as $idx => $item)
  <tr>
    @if($idx === 0)
    <td class="l" rowspan="{{ count($items) }}" style="font-weight:bold;vertical-align:top;">{{ strtoupper($cat['name']) }}</td>
    @endif
    <td class="l">{{ $item['description'] }}</td>
    <td class="c">{{ $item['implementing_office'] }}</td>
    <td class="c">{{ $item['starting_date'] ?? '' }}</td>
    <td class="c">{{ $item['completion_date'] ?? '' }}</td>
    <td class="c">{{ $item['expected_output'] ?? '' }}</td>
    <td class="c">{{ $item['funding_source'] }}</td>
    <td class="r">@if($item['mooe']  > 0){{ "\u{20B1}\u{00A0}" }}{{ number_format($item['mooe'],0)  }}@endif</td>
    <td class="r">@if($item['co']    > 0){{ "\u{20B1}\u{00A0}" }}{{ number_format($item['co'],0)    }}@endif</td>
    <td class="r">@if($item['total'] > 0){{ "\u{20B1}\u{00A0}" }}{{ number_format($item['total'],0) }}@endif</td>
  </tr>
  @endforeach

  {{-- Sub Total row --}}
  <tr style="font-weight:bold;">
    <td class="r" colspan="7" style="font-weight:bold;">Sub Total</td>
    <td class="r">@if($subMOOE  > 0){{ "\u{20B1}\u{00A0}" }}{{ number_format($subMOOE,0)  }}@endif</td>
    <td class="r">@if($subCO    > 0){{ "\u{20B1}\u{00A0}" }}{{ number_format($subCO,0)    }}@endif</td>
    <td class="r">@if($subTotal > 0){{ "\u{20B1}\u{00A0}" }}{{ number_format($subTotal,0) }}@endif</td>
  </tr>

  @endforeach {{-- categories --}}

  </tbody>
</table>

{{-- A / B / C summary lines --}}
<table style="width:100%;border-collapse:collapse;font-size:6.5pt;margin-top:2px;">
  <tr>
    <td style="border:none;padding:2px 4px;">
      <strong>A. Total ( 70% of the 5%CF, Preparedness Fund for CY{{ $year }} )</strong>
    </td>
    <td style="border:none;padding:2px 4px;text-align:right;width:120pt;">
      {{ "\u{20B1}\u{00A0}" }}{{ number_format((float)$summary['total_70pct'], 0) }}
    </td>
  </tr>
  <tr>
    <td style="border:none;padding:2px 4px;">
      <strong>B. Total Reserved for Actual Calamity ( 30% ) for Calendar Year {{ $year }}</strong>
    </td>
    <td style="border:none;padding:2px 4px;text-align:right;">
      {{ "\u{20B1}\u{00A0}" }}{{ number_format((float)$summary['reserved_30'], 0) }}
    </td>
  </tr>
  <tr>
    <td style="border:none;padding:2px 4px;">
      <strong>C. Total 5% Calamity Fund Reserved for CY{{ $year }}</strong>
    </td>
    <td style="border:none;padding:2px 4px;text-align:right;">
      {{ "\u{20B1}\u{00A0}" }}{{ number_format((float)$summary['calamity_fund'], 0) }}
    </td>
  </tr>
</table>

{{-- Signature block — Prepared by (left) / Approved by (right) --}}
<table style="width:100%;border-collapse:collapse;font-size:6.5pt;margin-top:6px;">
  <tr>
    <td style="border:none;text-align:center;vertical-align:top;width:50%;padding:4px 6px 6px;">
      Prepared by:
      <span class="sig-name">{{ $signatories['drrm_officer']['name'] }}</span>
      <span class="sig-title">{{ $signatories['drrm_officer']['title'] }}</span>
    </td>
    <td style="border:none;text-align:center;vertical-align:top;width:50%;padding:4px 6px 6px;">
      Approved by:
      <span class="sig-name">{{ $signatories['mayor']['name'] }}</span>
      <span class="sig-title">{{ $signatories['mayor']['title'] }}</span>
    </td>
  </tr>
</table>

</div>{{-- end .page --}}
@endforeach {{-- allForms5 --}}
{{-- end calamity5 --}}

@endif {{-- end mode dispatch --}}

</div>{{-- end .wrap --}}
</body>
</html>