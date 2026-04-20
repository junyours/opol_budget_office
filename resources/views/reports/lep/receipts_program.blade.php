{{--
    resources/views/reports/lep/receipts_program.blade.php
    ──────────────────────────────────────────────────────
    PART II: Receipts Program
    One page per source (General Fund = A, Special Accounts = B.1, B.2, ...)
    Signatories: Budget Officer, Asst. Municipal Treasurer, Municipal Accountant, MPDC
--}}

@php
$pesoSign = '<span style="font-family:\'DejaVu Sans\',sans-serif;">&#x20B1;&nbsp;</span>';
$peso  = fn($n) => (float)$n == 0 ? '' : ($pesoSign . number_format((float)$n, 0));
$pesoA = fn($n) => $pesoSign . number_format((float)$n, 0);
$num   = fn($n) => (float)$n == 0 ? '' : number_format((float)$n, 0);
$numA  = fn($n) => number_format((float)$n, 0);
@endphp

@foreach($receipt_forms as $form)
@php
$income      = $form['income'];       // same structure as BESF income rows
$label       = $form['label'];        // e.g. "A. GENERAL FUND" or "B.1. SPECIAL ACCOUNT: OCC"
$propYear    = $proposed_year;
$currYear    = $current_year;
$pastYear    = $past_year;

/* Grand income total (mirrors BESF logic) */
$fields5  = ['past_total','current_sem1','current_sem2','current_total','proposed'];
$grandIncome = array_fill_keys($fields5, 0.0);
$beginRow = null;
foreach ($income as $r) {
    if ($r['name'] === 'Beginning Cash Balance') { $beginRow = $r; break; }
}
if ($beginRow) foreach ($fields5 as $f) $grandIncome[$f] += (float)($beginRow[$f] ?? 0);
foreach ($income as $r) {
    if (!($r['is_subtotal'] ?? false)) continue;
    if (stripos($r['name'], 'Non-Income') !== false) continue;
    foreach ($fields5 as $f) $grandIncome[$f] += (float)($r[$f] ?? 0);
}
@endphp

<div style="page-break-after: always;">

{{-- ── Part II header ── --}}
<div style="font-weight:bold; font-size:6.5pt; margin-bottom:2px;">
    PART II: Receipts Program. These Receipts Program detailed below are declared as realistic and probable to be collected, viz :
</div>
<div style="font-weight:bold; font-size:6.5pt; margin-bottom:4px;">
    {{ $label }}
</div>

<table class="data-table" style="width:100%; table-layout:fixed; font-size:6pt;">
<thead>
<tr style="height:0;line-height:0;font-size:0;visibility:hidden;">
    <td style="width:36%;padding:0;border:none;"></td>
    <td style="width:10%;padding:0;border:none;"></td>
    <td style="width:11%;padding:0;border:none;"></td>
    <td style="width:10%;padding:0;border:none;"></td>
    <td style="width:10%;padding:0;border:none;"></td>
    <td style="width:10%;padding:0;border:none;"></td>
    <td style="width:13%;padding:0;border:none;"></td>
</tr>
<tr>
    <th rowspan="2">Object of Expenditures</th>
    <th rowspan="2">Account<br>Code</th>
    <th rowspan="2">Past Year<br>(Actual)<br>{{ $pastYear }}</th>
    <th colspan="3">Current Year Appropriation {{ $currYear }}</th>
    <th rowspan="2">{{ $propYear }} Budget Year<br>(Proposed)</th>
</tr>
<tr>
    <th>1st Semester<br>(Actual)</th>
    <th>2nd Semester<br>(Estimate)</th>
    <th>Total</th>
</tr>
<tr class="col-num">
    <td>(1)</td><td>(2)</td><td>(3)</td><td>(4)</td><td>(5)</td><td>(6)</td><td>(7)</td>
</tr>
</thead>
<tbody>

@foreach($income as $rIdx => $row)
@php
    $isSub       = (bool)($row['is_subtotal'] ?? false);
    $isNonIncome = $isSub && stripos($row['name'], 'Non-Income') !== false;
    $ind         = str_repeat('&nbsp;&nbsp;&nbsp;', max(0, (int)$row['level']));
    $isFirst     = ($rIdx === 0);
    $fmtFn       = $isSub ? $pesoA : ($isFirst ? $pesoA : $num);
@endphp
<tr class="{{ $isSub ? 'subtotal' : '' }}">
    @if($isSub)
        <td class="l" colspan="2">
            <strong>{!! $ind !!}{{ $row['name'] }}</strong>
        </td>
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
<tr class="grand-total">
    <td class="l" colspan="2"><strong>Total Available Resources for Appropriations</strong></td>
    <td class="r">{!! $pesoA($grandIncome['past_total']) !!}</td>
    <td class="r">{!! $pesoA($grandIncome['current_sem1']) !!}</td>
    <td class="r">{!! $pesoA($grandIncome['current_sem2']) !!}</td>
    <td class="r">{!! $pesoA($grandIncome['current_total']) !!}</td>
    <td class="r">{!! $pesoA($grandIncome['proposed']) !!}</td>
</tr>

</tbody>
</table>

{{-- Certification + Signatories ── matches the photo exactly --}}
<table style="width:100%;border-collapse:collapse;font-size:6pt;margin-top:0;">
  <tr>
    <td colspan="2" style="border:1px solid #000;border-bottom:none;text-align:left;padding:6px 6px 10px;">
      We hereby certify that the information presented above are true and correct.
      We further certify that the foregoing estimated receipts are reasonably projected as collectible for the budget year.
    </td>
  </tr>
  <tr>
    <td style="border-left:1px solid #000;border-right:1px solid #000;border-bottom:1px solid #000;padding:0;" colspan="2">
      <table style="width:100%;border-collapse:collapse;font-size:6pt;">
        <tr>
          {{-- Left column: Budget Officer + Accountant --}}
          <td style="border:none;text-align:center;vertical-align:top;width:25%;padding:8px 4px 6px;">
            <span style="font-weight:bold;font-size:6pt;margin-top:28px;display:block;text-align:center;">
              {{ $signatories['budget_officer']['name'] }}
            </span>
            <span style="font-size:6.5pt;display:block;text-align:center;">
              {{ $signatories['budget_officer']['title'] }}
            </span>
          </td>
          {{-- Assistant Municipal Treasurer --}}
          <td style="border:none;text-align:center;vertical-align:top;width:25%;padding:8px 4px 6px;">
            <span style="font-weight:bold;font-size:6pt;margin-top:28px;display:block;text-align:center;">
              {{ $signatories['treasurer']['name'] }}
            </span>
            <span style="font-size:6pt;display:block;text-align:center;">
              {{ $signatories['treasurer']['title'] }}
            </span>
          </td>
          {{-- Municipal Accountant --}}
          <td style="border:none;text-align:center;vertical-align:top;width:25%;padding:8px 4px 6px;">
            <span style="font-weight:bold;font-size:6pt;margin-top:28px;display:block;text-align:center;">
              {{ $signatories['accountant']['name'] }}
            </span>
            <span style="font-size:6pt;display:block;text-align:center;">
              {{ $signatories['accountant']['title'] }}
            </span>
          </td>
          {{-- MPDC --}}
          <td style="border:none;text-align:center;vertical-align:top;width:25%;padding:8px 4px 6px;">
            <span style="font-weight:bold;font-size:6pt;margin-top:28px;display:block;text-align:center;">
              {{ $signatories['mpdc']['name'] }}
            </span>
            <span style="font-size:6pt;display:block;text-align:center;">
              {{ $signatories['mpdc']['title'] }}
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

</div>{{-- /page --}}

@endforeach
