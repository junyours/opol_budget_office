{{--
    resources/views/reports/lep/lep_form7.blade.php
    ─────────────────────────────────────────────────────────────────────────
    LEP Form 7: Summary of New Appropriations, by Object of Expenditures
                and by Sector

    Mirrors LBP Form 7 structure but adapted for LEP:
      - General Fund → 4 sector columns + Total
      - Special Account → single Total column (no sector breakdown)
      - No signatories block
      - Page-break between fund blocks

    Variables expected (passed via $data):
      $data['year']    int
      $data['lgu']     string
      $data['forms']   array — each: [label, is_special, sections, grand_total]
--}}

@php
$year   = $data['year'];
$lgu    = $data['lgu'];
$forms7 = $data['forms'];

$pesoSign = '<span style="font-family:\'DejaVu Sans\',sans-serif;">&#x20B1;&nbsp;</span>';

$pa = function($n) use ($pesoSign): string {
    if ((float)$n == 0) return $pesoSign . ' - ';
    return $pesoSign . number_format((float)$n, 0);
};
$nf = function($n): string {
    if ((float)$n == 0) return ' - ';
    return number_format((float)$n, 0);
};
@endphp

@foreach($forms7 as $formIdx => $form7)
@php
    $sections   = $form7['sections']    ?? [];
    $grandTotal = $form7['grand_total'] ?? null;
    $isSpecial  = (bool) ($form7['is_special'] ?? false);
    $isLast     = ($formIdx === count($forms7) - 1);
    $pageStyle  = $isLast ? '' : 'page-break-after: always;';

    // Column count: special = 3 (Particulars | Account Code | Total)
    //               general  = 7 (Particulars | Account Code | GPS | SS | ES | OS | Total)
    $colCount = $isSpecial ? 3 : 7;
@endphp

<div style="{{ $pageStyle }}">

{{-- ── Report header ── --}}
<div style="font-weight:bold; font-size:8pt; text-align:center; margin-bottom:1px; text-transform:uppercase;">
    Summary of New Appropriations, by Object of Expenditures and by Sector
</div>
<div style="font-size:7pt; text-align:center; margin-bottom:1px;">
    LGU: {{ $lgu }}
</div>
<div style="font-size:7pt; text-align:center; margin-bottom:4px; font-weight:bold;">
    @if($isSpecial)
        Special Account: {{ $form7['label'] }}, CY {{ $year }}
    @else
        General Fund, CY {{ $year }}
    @endif
</div>

{{-- ── Data table ── --}}
<table class="data-table" style="width:100%; table-layout:fixed; font-size:6.5pt;">
    <colgroup>
        @if(!$isSpecial)
        <col style="width:30%;">
        <col style="width:10%;">
        <col style="width:12%;">
        <col style="width:12%;">
        <col style="width:12%;">
        <col style="width:12%;">
        <col style="width:12%;">
        @else
        <col style="width:58%;">
        <col style="width:12%;">
        <col style="width:30%;">
        @endif
    </colgroup>
    <thead>
        {{-- ── Ghost row — forces column widths ── --}}
        @if(!$isSpecial)
        <tr style="height:0; line-height:0; font-size:0; visibility:hidden;">
            <th style="width:30%; padding:0; border:none;"></th>
            <th style="width:10%;  padding:0; border:none;"></th>
            <th style="width:12%; padding:0; border:none;"></th>
            <th style="width:12%; padding:0; border:none;"></th>
            <th style="width:12%; padding:0; border:none;"></th>
            <th style="width:12%; padding:0; border:none;"></th>
            <th style="width:12%; padding:0; border:none;"></th>
        </tr>
        @else
        <tr style="height:0; line-height:0; font-size:0; visibility:hidden;">
            <th style="width:62%; padding:0; border:none;"></th>
            <th style="width:10%; padding:0; border:none;"></th>
            <th style="width:28%; padding:0; border:none;"></th>
        </tr>
        @endif
        <tr>
            <th style="text-align:left;">Particulars</th>
            <th>Account<br>Code</th>
            @if(!$isSpecial)
            <th>General<br>Public<br>Services</th>
            <th>Social<br>Services</th>
            <th>Economic<br>Services</th>
            <th>Other<br>Services</th>
            @endif
            <th>Total</th>
        </tr>
        <tr>
            <th style="font-weight:normal; font-size:6pt;">(1)</th>
            <th style="font-weight:normal; font-size:6pt;">(2)</th>
            @if(!$isSpecial)
            <th style="font-weight:normal; font-size:6pt;">(3)</th>
            <th style="font-weight:normal; font-size:6pt;">(4)</th>
            <th style="font-weight:normal; font-size:6pt;">(5)</th>
            <th style="font-weight:normal; font-size:6pt;">(6)</th>
            <th style="font-weight:normal; font-size:6pt;">(7)</th>
            @else
            <th style="font-weight:normal; font-size:6pt;">(3)</th>
            @endif
        </tr>
    </thead>
    <tbody>

    {{-- ── Ghost row — forces column widths under table-layout:fixed ── --}}
    @if(!$isSpecial)
    <tr style="visibility:hidden; height:0; line-height:0; font-size:0;">
        <td style="width:30%; padding:0;"></td>
        <td style="width:10%; padding:0;"></td>
        <td style="width:12%; padding:0;"></td>
        <td style="width:12%; padding:0;"></td>
        <td style="width:12%; padding:0;"></td>
        <td style="width:12%; padding:0;"></td>
        <td style="width:12%; padding:0;"></td>
    </tr>
    @else
    <tr style="visibility:hidden; height:0; line-height:0; font-size:0;">
        <td style="width:58%; padding:0;"></td>
        <td style="width:12%; padding:0;"></td>
        <td style="width:30%; padding:0;"></td>
    </tr>
    @endif

    @foreach($sections as $section)
    @php
        $subtotal = $section['subtotal'] ?? [];
        $hasRows  = !empty($section['rows']) || !empty($section['obligations']);
    @endphp

    {{-- ── Section header ── --}}
    <tr style="background:#fff;">
        <td colspan="{{ $colCount }}" style="font-weight:bold; padding:2px 4px;">
            {{ $section['section_label'] }}
        </td>
    </tr>

    {{-- ════════════════════════════════════════════════════
         FE — Financial Expenses (debt obligations)
    ════════════════════════════════════════════════════ --}}
    @if($section['section_code'] === 'FE')
        @if(!$isSpecial)
            {{-- General fund: show sector columns --}}
            @foreach($section['obligations'] ?? [] as $ob)
            <tr>
                <td class="l" style="padding-left:10px; font-weight:bold;">
                    {{ $ob['creditor'] }}@if(!empty($ob['purpose'])) &mdash; {{ $ob['purpose'] }}@endif
                </td>
                <td></td>
                <td colspan="5"></td>
            </tr>
            <tr>
                <td class="l" style="padding-left:18px; font-style:italic;">Principal</td>
                <td></td>
                <td class="r">{!! $nf($ob['principal']) !!}</td>
                <td class="r"> - </td>
                <td class="r"> - </td>
                <td class="r"> - </td>
                <td class="r">{!! $nf($ob['principal']) !!}</td>
            </tr>
            <tr>
                <td class="l" style="padding-left:18px; font-style:italic;">Interest</td>
                <td></td>
                <td class="r">{!! $nf($ob['interest']) !!}</td>
                <td class="r"> - </td>
                <td class="r"> - </td>
                <td class="r"> - </td>
                <td class="r">{!! $nf($ob['interest']) !!}</td>
            </tr>
            @endforeach
        @else
            {{-- Special account: single total column --}}
            @foreach($section['obligations'] ?? [] as $ob)
            <tr>
                <td class="l" style="padding-left:10px; font-weight:bold;" colspan="2">
                    {{ $ob['creditor'] }}@if(!empty($ob['purpose'])) &mdash; {{ $ob['purpose'] }}@endif
                </td>
                <td></td>
            </tr>
            <tr>
                <td class="l" style="padding-left:18px; font-style:italic;">Principal</td>
                <td></td>
                <td class="r">{!! $nf($ob['principal']) !!}</td>
            </tr>
            <tr>
                <td class="l" style="padding-left:18px; font-style:italic;">Interest</td>
                <td></td>
                <td class="r">{!! $nf($ob['interest']) !!}</td>
            </tr>
            @endforeach
        @endif

    {{-- ════════════════════════════════════════════════════
         PS / MOOE / CO / SPA — standard item rows
    ════════════════════════════════════════════════════ --}}
    @elseif(!$isSpecial)
        @foreach($section['rows'] ?? [] as $rIdx => $row)
        <tr>
            <td class="l" style="padding-left:8px;">{{ $row['item_name'] }}</td>
            <td class="c" style="font-size:6pt;">{{ $row['account_code'] ?? '' }}</td>
            <td class="r">{!! $rIdx === 0 ? $pa($row['general_public_services']) : $nf($row['general_public_services']) !!}</td>
            <td class="r">{!! $rIdx === 0 ? $pa($row['social_services'])         : $nf($row['social_services']) !!}</td>
            <td class="r">{!! $rIdx === 0 ? $pa($row['economic_services'])       : $nf($row['economic_services']) !!}</td>
            <td class="r">{!! $rIdx === 0 ? $pa($row['other_services'])          : $nf($row['other_services']) !!}</td>
            <td class="r">{!! $rIdx === 0 ? $pa($row['total'])                   : $nf($row['total']) !!}</td>
        </tr>
        @endforeach
    @else
        @foreach($section['rows'] ?? [] as $rIdx => $row)
        <tr>
            <td class="l" style="padding-left:8px;">{{ $row['item_name'] }}</td>
            <td class="c" style="font-size:6pt;">{{ $row['account_code'] ?? '' }}</td>
            <td class="r">{!! $rIdx === 0 ? $pa($row['total']) : $nf($row['total']) !!}</td>
        </tr>
        @endforeach
    @endif

    {{-- ── Empty section notice ── --}}
    @if(!$hasRows)
    <tr>
        <td colspan="{{ $colCount }}" class="c"
            style="font-style:italic; color:#888; padding:3px 4px; font-size:6pt;">
            No data.
        </td>
    </tr>
    @endif

    {{-- ── Section subtotal ── --}}
    @if(!$isSpecial)
    <tr style="font-weight:bold;">
        <td class="l" colspan="2" style="padding:2px 4px;">Total {{ $section['section_label'] }}</td>
        <td class="r">{!! $pa($subtotal['general_public_services'] ?? 0) !!}</td>
        <td class="r">{!! $pa($subtotal['social_services']         ?? 0) !!}</td>
        <td class="r">{!! $pa($subtotal['economic_services']       ?? 0) !!}</td>
        <td class="r">{!! $pa($subtotal['other_services']          ?? 0) !!}</td>
        <td class="r">{!! $pa($subtotal['total']                   ?? 0) !!}</td>
    </tr>
    @else
    <tr style="font-weight:bold;">
        <td class="l" colspan="2" style="padding:2px 4px;">Total {{ $section['section_label'] }}</td>
        <td class="r">{!! $pa($subtotal['total'] ?? 0) !!}</td>
    </tr>
    @endif

    @endforeach {{-- sections --}}

    </tbody>

    {{-- ── Grand total ── --}}
    @if($grandTotal)
    <tfoot>
        @if(!$isSpecial)
        <tr style="font-weight:bold; background:#fff;">
            <td class="l" colspan="2" style="padding:2px 4px;">Grand Total</td>
            <td class="r">{!! $pa($grandTotal['general_public_services'] ?? 0) !!}</td>
            <td class="r">{!! $pa($grandTotal['social_services']         ?? 0) !!}</td>
            <td class="r">{!! $pa($grandTotal['economic_services']       ?? 0) !!}</td>
            <td class="r">{!! $pa($grandTotal['other_services']          ?? 0) !!}</td>
            <td class="r">{!! $pa($grandTotal['total']                   ?? 0) !!}</td>
        </tr>
        @else
        <tr style="font-weight:bold; background:#fff;">
            <td class="l" colspan="2" style="padding:2px 4px;">Grand Total</td>
            <td class="r">{!! $pa($grandTotal['total'] ?? 0) !!}</td>
        </tr>
        @endif
    </tfoot>
    @endif

</table>

</div>{{-- /page wrapper --}}

@endforeach {{-- forms7 --}}
