{{--
    resources/views/reports/lep/lep_mdf20.blade.php
    ─────────────────────────────────────────────────────────────────────────
    PART V: 20% MUNICIPAL DEVELOPMENT FUND — Local Expenditure Program version

    Mirrors UnifiedReportController's mdf20 block but:
      • No signatories / "Prepared by" block
      • Rendered via lepreport.blade.php using report_type = 'lep_mdf20'

    Variables expected:
      $data  array  (see UnifiedReportController::buildMdf20Data /
                          LEPReportController::buildLepMdf20Data)
--}}

@php
$year         = $data['year'];
$currentYear  = $data['current_year'];
$pastYear     = $data['past_year'];
$lgu          = $data['lgu'];
$categoryRows = $data['category_rows'];
$grandTotals  = $data['grand_totals'];

$pesoSign = '<span style="font-family:\'DejaVu Sans\',sans-serif;">&#x20B1;&nbsp;</span>';

$pf = function($n) use ($pesoSign): string {
    if ((float)$n == 0) return '';
    return $pesoSign . number_format((float)$n, 2);
};
$pa = function($n) use ($pesoSign): string {
    return $pesoSign . number_format((float)$n, 2);
};
$nf = function($n): string {
    if ((float)$n == 0) return ' - ';
    return number_format((float)$n, 2);
};
@endphp

<div style="page-break-after: always;">

<div style="text-align:center; font-weight:bold; font-size:8.5pt; margin-bottom:6px; text-transform:uppercase;">
    PART V: 20% Municipal Development Fund
</div>

<div class="form-no" style="text-align:center;">20% Municipal Development Fund CY {{ $year }}</div>
<div class="doc-title" style="text-align:center;">{{ $lgu }}</div>
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

    <tr class="sec-hdr">
        <td colspan="7">{{ strtoupper($cat['name']) }}</td>
    </tr>

    @php
        $regularItems = array_values(array_filter($cat['items'], fn($i) => !$i['is_debt_row']));
        $debtItems    = array_values(array_filter($cat['items'], fn($i) =>  $i['is_debt_row']));

        $debtGrouped = [];
        foreach ($debtItems as $di) {
            $key = $di['obligation_id'];
            $debtGrouped[$key][$di['debt_type']] = $di;
        }
    @endphp

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

    @foreach($debtGrouped as $obId => $types)
    @php
        $principal = $types['principal'] ?? null;
        $interest  = $types['interest']  ?? null;
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

{{-- ── No signatories block in LEP version ── --}}

</div>{{-- /page wrapper --}}
