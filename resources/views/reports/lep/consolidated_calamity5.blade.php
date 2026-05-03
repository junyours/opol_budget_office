{{--
    resources/views/reports/lep/consolidated_calamity5.blade.php
    ─────────────────────────────────────────────────────────────────────────
    5% SA Consolidated Calamity Fund — LEP version
    Column widths defined via hidden zero-height <tr> in <thead>
    (same pattern as consolidated_plantilla_of_personnel.blade.php)
    NO colgroup used.

    7 Columns:
      (1) Object of Expenditures  28%
      (2) Account Code             8%
      (3) Past Year               12%
      (4) 1st Semester            12%
      (5) 2nd Semester            12%
      (6) Total                   12%
      (7) Budget Year             16%
--}}

@php
$d          = $data;
$year       = $d['year'];
$pastYear   = $d['past_year'];
$currYear   = $d['current_year'];
$lgu        = $d['lgu'];
$sources    = $d['sources'];
$grandTotal = $d['grand_total'];

$pesoSign = '<span style="font-family:\'DejaVu Sans\',sans-serif;">&#x20B1;&nbsp;</span>';
$pesoA    = fn(float $n) => $n == 0 ? '&nbsp;' : ($pesoSign . number_format(round(abs($n)), 0));
$num      = fn(float $n) => $n == 0 ? '&nbsp;' : number_format(round(abs($n)), 0);
@endphp

{{-- Report title --}}
<div style="text-align:center; font-weight:bold; font-size:7.5pt; margin-bottom:2px;">
    CY-{{ $year }} 5% Local Disaster Risk Reduction Management Fund Plan, (LDRRMF Plan) - JMC 2013-1, RA-10121
</div>
<div style="text-align:center; font-size:7pt; margin-bottom:2px;">
    Special Account:
    @foreach($sources as $_src)
        <span style="text-decoration:underline;">{{ $_src['label'] }}</span>{{ !$loop->last ? '/ ' : '' }}
    @endforeach
</div>
<div style="text-align:center; font-size:7pt; margin-bottom:6px;">
    Municipality : {{ $lgu }}
</div>

<table class="data-table" style="font-size:6pt; margin-bottom:6px; width:100%; table-layout:fixed;">
    <thead>
        {{-- Zero-height hidden row defines column widths (dompdf-safe, no colgroup) --}}
        <tr style="height:0; line-height:0; font-size:0; visibility:hidden;">
            <td style="width:30%; padding:0; border:none;"></td>
            <td style="width:10%;  padding:0; border:none;"></td>
            <td style="width:12%; padding:0; border:none;"></td>
            <td style="width:12%; padding:0; border:none;"></td>
            <td style="width:12%; padding:0; border:none;"></td>
            <td style="width:12%; padding:0; border:none;"></td>
            <td style="width:12%; padding:0; border:none;"></td>
        </tr>
        <tr>
            <th rowspan="2" style="vertical-align:middle;">Object of Expenditures</th>
            <th rowspan="2" style="vertical-align:middle;">Account<br>Code</th>
            <th rowspan="2" style="vertical-align:middle;">Past Year<br>(Actual)<br>{{ $pastYear }}</th>
            <th colspan="3" style="vertical-align:middle;">Current Year (Estimate) {{ $currYear }}</th>
            <th rowspan="2" style="vertical-align:middle;">{{ $year }}<br>Budget Year</th>
        </tr>
        <tr>
            <th style="vertical-align:middle;">1st Semester<br>(Actual)</th>
            <th style="vertical-align:middle;">2nd Semester<br>(Estimate)</th>
            <th style="vertical-align:middle;">Total</th>
        </tr>
        <tr>
            <th>(1)</th>
            <th>(2)</th>
            <th>(3)</th>
            <th>(4)</th>
            <th>(5)</th>
            <th>(6)</th>
            <th>(7)</th>
        </tr>
    </thead>
    <tbody>

    {{-- ══ PER-SOURCE ROWS ══ --}}
    @foreach($sources as $_src)
    @php
        $_itemsTotalBudget = array_sum(array_column($_src['items'], 'total'));
        $_prep70Matched    = abs($_src['budget_year']['preparedness_70'] - $_itemsTotalBudget) <= 1;
        $_recovAmt         = $_src['budget_year']['preparedness_70'] - $_itemsTotalBudget;
    @endphp

    {{-- Dept header row --}}
    <tr>
        <td colspan="7" class="l" style="font-weight:bold; padding:2px 4px;">
            Mun. Eco. Entrpse., {{ $_src['label'] }}
        </td>
    </tr>

    {{-- 30% QRF row --}}
    <tr>
        <td class="l" style="padding-left:8px; font-weight:bold;">30% Quick Response Fund (QRF)</td>
        <td class="c">&nbsp;</td>
        <td class="r">{!! $pesoA($_src['past']['qrf_30']) !!}</td>
        <td class="r">{!! $pesoA($_src['current']['qrf_30_sem1']) !!}</td>
        <td class="r">{!! $pesoA($_src['current']['qrf_30_sem2']) !!}</td>
        <td class="r">{!! $pesoA($_src['current']['qrf_30_total']) !!}</td>
        <td class="r">{!! $pesoA($_src['budget_year']['qrf_30']) !!}</td>
    </tr>

    {{-- 70% Disaster Preparedness header --}}
    <tr>
        <td colspan="7" class="l" style="font-weight:bold; padding-left:8px;">
            70% Disaster Preparedness
            @if(!$_prep70Matched)
                <span style="font-size:5pt; font-style:italic; font-weight:normal;">⚠ items sum ≠ derived</span>
            @endif
        </td>
    </tr>

    {{-- 70% Item rows --}}
    @forelse($_src['items'] as $_item)
    <tr>
        <td class="l" style="padding-left:16px; font-size:5.8pt;">: {{ $_item['description'] }}</td>
        <td class="c">&nbsp;</td>
        <td class="r" style="font-size:5.8pt;">{!! $num($_item['obligation_amount']) !!}</td>
        <td class="r" style="font-size:5.8pt;">{!! $num($_item['sem1_amount']) !!}</td>
        <td class="r" style="font-size:5.8pt;">{!! $num($_item['sem2_amount']) !!}</td>
        <td class="r" style="font-size:5.8pt;">{!! $num($_item['total_amount']) !!}</td>
        <td class="r" style="font-size:5.8pt;">{!! $num($_item['total']) !!}</td>
    </tr>
    @empty
    <tr>
        <td colspan="7" class="c" style="font-style:italic; color:#666; padding:4px;">
            No items on file. Add items in the LDRRMFIP page.
        </td>
    </tr>
    @endforelse

    {{-- Assistance to Recovery & Rehabilitation (only if remainder exists) --}}
    @if(abs($_recovAmt) > 1)
    <tr>
        <td class="l" style="padding-left:16px; font-size:5.8pt;">: Assistance to Recovery &amp; Rehabilitation</td>
        <td class="c">&nbsp;</td>
        <td class="r">&nbsp;</td>
        <td class="r">&nbsp;</td>
        <td class="r">&nbsp;</td>
        <td class="r" style="font-size:5.8pt;">{!! $num($_recovAmt) !!}</td>
        <td class="r" style="font-size:5.8pt;">{!! $num($_recovAmt) !!}</td>
    </tr>
    @endif

    {{-- Per-source subtotal --}}
    <tr style="font-weight:bold;">
        <td colspan="2" class="l" style="padding-left:4px;">
            Total 5% Calamity Fund - {{ $_src['dept_total_label'] }}
        </td>
        <td class="r">{!! $pesoA($_src['past']['total_5pct']) !!}</td>
        <td class="r">{!! $pesoA($_src['current']['total_sem1']) !!}</td>
        <td class="r">{!! $pesoA($_src['current']['total_sem2']) !!}</td>
        <td class="r">{!! $pesoA($_src['current']['total_5pct']) !!}</td>
        <td class="r">{!! $pesoA($_src['budget_year']['total_5pct']) !!}</td>
    </tr>

    {{-- Spacer between sources --}}
    @if(!$loop->last)
    <tr>
        <td colspan="7" style="border-left:1px solid #000; border-right:1px solid #000;
                               border-top:none; border-bottom:none; padding:2px;">&nbsp;</td>
    </tr>
    @endif

    @endforeach

    {{-- ══ GRAND TOTAL ══ --}}
    <tr style="font-weight:bold;">
        <td colspan="2" class="l" style="padding:2px 4px;">Grand Total 5% Calamity Fund - S.A.</td>
        <td class="r">{!! $pesoA($grandTotal['past']) !!}</td>
        <td class="r">{!! $pesoA($grandTotal['current_sem1']) !!}</td>
        <td class="r">{!! $pesoA($grandTotal['current_sem2']) !!}</td>
        <td class="r">{!! $pesoA($grandTotal['current_total']) !!}</td>
        <td class="r">{!! $pesoA($grandTotal['budget_year']) !!}</td>
    </tr>

    </tbody>
</table>
