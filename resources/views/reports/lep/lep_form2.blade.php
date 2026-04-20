{{--
    resources/views/reports/lep/lep_form2.blade.php
    ─────────────────────────────────────────────────────────────────────────
    PART III: Programmed Appropriation and Obligation by Object of Expenditures
              — By Office  (LEP Form 2 equivalent)

    Section order per office:
      1. Personal Services (PS)
      2. MOOE
      3. Property, Plant & Equipment / Capital Outlay (CO)
      4. Special Purpose Appropriations / Programs (SPA)
      5. [Special-account depts only] Budgetary & Statutory Requirements
             • 5% LDRRMF
                 – 70% Pre-Disaster Preparedness Activities
                 – 30% Quick Response Fund (QRF)
      6. Grand Total

    Variables expected:
      $form2_sections   array   each: [section_label, is_special, dept_groups]
      $proposed_year    int
      $current_year     int
      $past_year        int
--}}

@php
$pesoSign = '<span style="font-family:\'DejaVu Sans\',sans-serif;">&#x20B1;&nbsp;</span>';
$pesoA    = fn($n) => $pesoSign . number_format((float)$n, 0);
$num      = fn($n) => number_format((float)$n, 0);

$sumCol = fn(array $rows, string $col): float =>
    array_reduce($rows, fn($c, $r) => $c + (float)($r[$col] ?? 0), 0.0);

$bucket = function(array $items, string $cls): array {
    return array_values(array_filter(
        $items,
        fn($i) => str_contains(strtolower(trim($i['classification'] ?? '')), strtolower($cls))
    ));
};

// Repeated table header HTML
$f2Head = function() use ($proposed_year, $current_year, $past_year): string {
    return '
    <tr>
        <th rowspan="2" style="width:30%;">Object of Expenditures</th>
        <th rowspan="2" style="width:10%;">Account Code</th>
        <th rowspan="2" style="width:12%;">Past Year<br>(Actual)<br>' . $past_year . '</th>
        <th colspan="3">Current Year (Estimate) ' . $current_year . '</th>
        <th rowspan="2" style="width:12%;">' . $proposed_year . '<br>Budget Year<br>(Proposed)</th>
    </tr>
    <tr>
        <th style="width:9%;">1st Semester<br>(Actual)</th>
        <th style="width:9%;">2nd Semester<br>(Estimate)</th>
        <th style="width:9%;">Total</th>
    </tr>
    <tr>
        <th>(1)</th><th>(2)</th><th>(3)</th><th>(4)</th><th>(5)</th><th>(6)</th><th>(7)</th>
    </tr>';
};

// Flatten all dept groups into one list so we can track first/last
$flat = [];
foreach ($form2_sections as $secIdx => $section) {
    foreach ($section['dept_groups'] as $dgIdx => $dg) {
        $flat[] = [
            'dg'           => $dg,
            'secLabel'     => $section['section_label'],
            'is_special'   => (bool) ($section['is_special'] ?? false),
            'firstInSec'   => ($dgIdx === 0),
            'firstOverall' => ($secIdx === 0 && $dgIdx === 0),
        ];
    }
}
$lastIdx = count($flat) - 1;
@endphp

@foreach($flat as $fi => $entry)
@php
    $dg        = $entry['dg'];
    $isLast    = ($fi === $lastIdx);
    $isSpecial = $entry['is_special'];

    $deptName    = $dg['dept_name'];
    $form2       = $dg['form2'];
    $items       = $form2['items']           ?? [];
    $spItems     = $form2['specialPrograms'] ?? [];
    $ldrrmfRows  = $dg['ldrrmf_rows']        ?? [];   // injected by controller

    // ── Classify items ────────────────────────────────────────────────────
    $psItems   = $bucket($items, 'personal services');
    $mooeItems = $bucket($items, 'maintenance and other operating');
    $coItems   = $bucket($items, 'capital outlay');
    $ppItems   = array_merge(
        $bucket($items, 'property, plant and equipment'),
        $bucket($items, 'prop/plant/eqpt')
    );

    $known = ['personal services','maintenance and other operating',
              'capital outlay','property, plant and equipment','prop/plant/eqpt'];
    $otherItems = array_values(array_filter($items, function($i) use ($known) {
        $cls = strtolower(trim($i['classification'] ?? ''));
        foreach ($known as $k) { if (str_contains($cls, $k)) return false; }
        return true;
    }));

    // PP&E takes priority over CO; fall back to CO
    $capItems    = count($ppItems) > 0 ? $ppItems : $coItems;
    $capLabel    = count($ppItems) > 0
        ? 'Property, Plant &amp; Equipment (PP&amp;E)'
        : 'Property, Plant &amp; Equipment (Capital Outlay)';
    $capTotLabel = count($ppItems) > 0 ? 'Total PP&E' : 'Total Capital Outlay';

    // ── Subtotals ─────────────────────────────────────────────────────────
    $psProp    = $sumCol($psItems,   'proposed');
    $mooeProp  = $sumCol($mooeItems, 'proposed');
    $capProp   = $sumCol($capItems,  'proposed');
    $spProp    = $sumCol($spItems,   'proposed');

    // LDRRMF sub-rows (5%, 70%, QRF) — provided by controller
    // Expected keys per row: name, account_code, past_total, current_sem1,
    //   current_sem2, current_total, proposed, kind
    // kind = 'ldrrmf-5pct' | 'ldrrmf-70pct' | 'ldrrmf-qrf'
    $ldrrmf5Row    = collect($ldrrmfRows)->firstWhere('kind', 'ldrrmf-5pct');
    $ldrrmf70Row   = collect($ldrrmfRows)->firstWhere('kind', 'ldrrmf-70pct');
    $ldrrmfQrfRow  = collect($ldrrmfRows)->firstWhere('kind', 'ldrrmf-qrf');
    $ldrrmfTotal   = [
        'past_total'    => $sumCol($ldrrmfRows, 'past_total'),
        'current_sem1'  => $sumCol($ldrrmfRows, 'current_sem1'),
        'current_sem2'  => $sumCol($ldrrmfRows, 'current_sem2'),
        'current_total' => $sumCol($ldrrmfRows, 'current_total'),
        'proposed'      => $sumCol($ldrrmfRows, 'proposed'),
    ];

    // ── Grand total ────────────────────────────────────────────────────────
    $grandPast    = $sumCol($items,'past_total')    + $sumCol($spItems,'past_total')    + $sumCol($ldrrmfRows,'past_total');
    $grandSem1    = $sumCol($items,'current_sem1')  + $sumCol($spItems,'current_sem1')  + $sumCol($ldrrmfRows,'current_sem1');
    $grandSem2    = $sumCol($items,'current_sem2')  + $sumCol($spItems,'current_sem2')  + $sumCol($ldrrmfRows,'current_sem2');
    $grandCurrent = $sumCol($items,'current_total') + $sumCol($spItems,'current_total') + $sumCol($ldrrmfRows,'current_total');
    $grandProp    = $psProp + $mooeProp + $capProp + $spProp
                  + $sumCol($otherItems,'proposed')
                  + $sumCol($ldrrmfRows,'proposed');

    $hasAnyData = ($grandPast > 0 || $grandCurrent > 0 || $grandProp > 0);

    $pageStyle = $isLast ? '' : 'page-break-after: always;';
@endphp

<div style="{{ $pageStyle }}">

    {{-- PART III heading — first office only --}}
    @if($entry['firstOverall'])
    <div style="font-weight:bold; font-size:8.5pt; margin-bottom:3px; text-transform:uppercase;">
        PART III: Programmed Appropriation and Obligation by Object of Expenditures &mdash; By Office
    </div>
    @endif

    {{-- Section label (A. GENERAL FUND / B.x.) — first dept of each section --}}
    @if($entry['firstInSec'])
    <div style="font-weight:bold; font-size:7.5pt; margin-bottom:3px; text-transform:uppercase;">
        {{ $entry['secLabel'] }}
    </div>
    @endif

    {{-- ── Office title bar ── --}}
    <div style="font-size:7pt; font-weight:bold;
                border:1px solid #000; border-bottom:none;
                padding:2px 4px; margin-top:4px; text-transform:uppercase;">
        {{ $deptName }}
    </div>

    {{-- ── Appropriations table ── --}}
    <table class="data-table" style="width:100%; table-layout:fixed; font-size:6.5pt; margin-bottom:0;">
        <colgroup>
            <col style="width:30%;"> <col style="width:10%;"> <col style="width:12%;">
            <col style="width:9%;">  <col style="width:9%;">  <col style="width:9%;">
            <col style="width:12%;">
        </colgroup>
        <thead>{!! $f2Head() !!}</thead>
        <tbody>

        {{-- ════════════════════════════════════════════════════════════════
             1. PERSONAL SERVICES
        ════════════════════════════════════════════════════════════════ --}}
        @if(count($psItems) > 0)
        <tr style="background:#fff;">
            <td colspan="7" style="font-weight:bold; padding:2px 4px;">Personal Services (PS)</td>
        </tr>
        @foreach($psItems as $rIdx => $item)
        @php $fmt = $rIdx === 0 ? $pesoA : $num; @endphp
        <tr>
            <td class="l" style="padding-left:10px;">{{ $item['description'] }}</td>
            <td class="c">{{ $item['account_code'] }}</td>
            <td class="r">{!! $item['past_total']    > 0 ? $fmt($item['past_total'])    : '' !!}</td>
            <td class="r">{!! $item['current_sem1']  > 0 ? $fmt($item['current_sem1'])  : '' !!}</td>
            <td class="r">{!! $item['current_sem2']  > 0 ? $fmt($item['current_sem2'])  : '' !!}</td>
            <td class="r">{!! $item['current_total'] > 0 ? $fmt($item['current_total']) : '' !!}</td>
            <td class="r">{!! $item['proposed']      > 0 ? $fmt($item['proposed'])      : '' !!}</td>
        </tr>
        @endforeach
        <tr style="font-weight:bold;">
            <td colspan="2" class="l" style="padding-left:4px;">Total Personal Services</td>
            <td class="r">{!! $pesoA($sumCol($psItems,'past_total')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($psItems,'current_sem1')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($psItems,'current_sem2')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($psItems,'current_total')) !!}</td>
            <td class="r">{!! $pesoA($psProp) !!}</td>
        </tr>
        @endif

        {{-- ════════════════════════════════════════════════════════════════
             2. MOOE
        ════════════════════════════════════════════════════════════════ --}}
        @if(count($mooeItems) > 0)
        <tr style="background:#fff;">
            <td colspan="7" style="font-weight:bold; padding:2px 4px;">Maintenance &amp; Other Operating Expenditures (MOOE)</td>
        </tr>
        @foreach($mooeItems as $rIdx => $item)
        @php $fmt = $rIdx === 0 ? $pesoA : $num; @endphp
        <tr>
            <td class="l" style="padding-left:10px;">{{ $item['description'] }}</td>
            <td class="c">{{ $item['account_code'] }}</td>
            <td class="r">{!! $item['past_total']    > 0 ? $fmt($item['past_total'])    : '' !!}</td>
            <td class="r">{!! $item['current_sem1']  > 0 ? $fmt($item['current_sem1'])  : '' !!}</td>
            <td class="r">{!! $item['current_sem2']  > 0 ? $fmt($item['current_sem2'])  : '' !!}</td>
            <td class="r">{!! $item['current_total'] > 0 ? $fmt($item['current_total']) : '' !!}</td>
            <td class="r">{!! $item['proposed']      > 0 ? $fmt($item['proposed'])      : '' !!}</td>
        </tr>
        @endforeach
        <tr style="font-weight:bold;">
            <td colspan="2" class="l" style="padding-left:4px;">Total MOOE</td>
            <td class="r">{!! $pesoA($sumCol($mooeItems,'past_total')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($mooeItems,'current_sem1')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($mooeItems,'current_sem2')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($mooeItems,'current_total')) !!}</td>
            <td class="r">{!! $pesoA($mooeProp) !!}</td>
        </tr>
        @endif

        {{-- ════════════════════════════════════════════════════════════════
             3. PROPERTY, PLANT & EQUIPMENT (Capital Outlay)
        ════════════════════════════════════════════════════════════════ --}}
        @if(count($capItems) > 0)
        <tr style="background:#fff;">
            <td colspan="7" style="font-weight:bold; padding:2px 4px;">{!! $capLabel !!}</td>
        </tr>
        @foreach($capItems as $rIdx => $item)
        @php $fmt = $rIdx === 0 ? $pesoA : $num; @endphp
        <tr>
            <td class="l" style="padding-left:10px;">{{ $item['description'] }}</td>
            <td class="c">{{ $item['account_code'] }}</td>
            <td class="r">{!! $item['past_total']    > 0 ? $fmt($item['past_total'])    : '' !!}</td>
            <td class="r">{!! $item['current_sem1']  > 0 ? $fmt($item['current_sem1'])  : '' !!}</td>
            <td class="r">{!! $item['current_sem2']  > 0 ? $fmt($item['current_sem2'])  : '' !!}</td>
            <td class="r">{!! $item['current_total'] > 0 ? $fmt($item['current_total']) : '' !!}</td>
            <td class="r">{!! $item['proposed']      > 0 ? $fmt($item['proposed'])      : '' !!}</td>
        </tr>
        @endforeach
        <tr style="font-weight:bold;">
            <td colspan="2" class="l" style="padding-left:4px;">{{ $capTotLabel }}</td>
            <td class="r">{!! $pesoA($sumCol($capItems,'past_total')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($capItems,'current_sem1')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($capItems,'current_sem2')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($capItems,'current_total')) !!}</td>
            <td class="r">{!! $pesoA($capProp) !!}</td>
        </tr>
        @endif

        {{-- ════════════════════════════════════════════════════════════════
             4. SPECIAL PURPOSE APPROPRIATIONS / PROGRAMS (SPA)
        ════════════════════════════════════════════════════════════════ --}}
        @if(count($spItems) > 0)
        <tr style="background:#fff;">
            <td colspan="7" style="font-weight:bold; padding:2px 4px;">Special Purpose Appropriations / Programs (SPA)</td>
        </tr>
        @foreach($spItems as $rIdx => $sp)
        @php $fmt = $rIdx === 0 ? $pesoA : $num; @endphp
        <tr>
            <td class="l" style="padding-left:10px;">{{ $sp['program_description'] }}</td>
            <td class="c">{{ $sp['aip_reference_code'] ?? '' }}</td>
            <td class="r">{!! $sp['past_total']    > 0 ? $fmt($sp['past_total'])    : '' !!}</td>
            <td class="r">{!! $sp['current_sem1']  > 0 ? $fmt($sp['current_sem1'])  : '' !!}</td>
            <td class="r">{!! $sp['current_sem2']  > 0 ? $fmt($sp['current_sem2'])  : '' !!}</td>
            <td class="r">{!! $sp['current_total'] > 0 ? $fmt($sp['current_total']) : '' !!}</td>
            <td class="r">{!! $sp['proposed']      > 0 ? $fmt($sp['proposed'])      : '' !!}</td>
        </tr>
        @endforeach
        <tr style="font-weight:bold;">
            <td colspan="2" class="l" style="padding-left:4px;">Sub-Total for Special Programs</td>
            <td class="r">{!! $pesoA($sumCol($spItems,'past_total')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($spItems,'current_sem1')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($spItems,'current_sem2')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($spItems,'current_total')) !!}</td>
            <td class="r">{!! $pesoA($spProp) !!}</td>
        </tr>
        @endif

        {{-- ════════════════════════════════════════════════════════════════
             OTHER CLASSIFICATIONS (fallback catch-all)
        ════════════════════════════════════════════════════════════════ --}}
        @if(count($otherItems) > 0)
        @php
            $otherGrouped = [];
            foreach ($otherItems as $oi) {
                $cls = trim($oi['classification'] ?? 'Other');
                $otherGrouped[$cls][] = $oi;
            }
        @endphp
        @foreach($otherGrouped as $otherCls => $otherGroup)
        <tr style="background:#fff;">
            <td colspan="7" style="font-weight:bold; padding:2px 4px;">{{ $otherCls }}</td>
        </tr>
        @foreach($otherGroup as $rIdx => $item)
        @php $fmt = $rIdx === 0 ? $pesoA : $num; @endphp
        <tr>
            <td class="l" style="padding-left:10px;">{{ $item['description'] }}</td>
            <td class="c">{{ $item['account_code'] }}</td>
            <td class="r">{!! $item['past_total']    > 0 ? $fmt($item['past_total'])    : '' !!}</td>
            <td class="r">{!! $item['current_sem1']  > 0 ? $fmt($item['current_sem1'])  : '' !!}</td>
            <td class="r">{!! $item['current_sem2']  > 0 ? $fmt($item['current_sem2'])  : '' !!}</td>
            <td class="r">{!! $item['current_total'] > 0 ? $fmt($item['current_total']) : '' !!}</td>
            <td class="r">{!! $item['proposed']      > 0 ? $fmt($item['proposed'])      : '' !!}</td>
        </tr>
        @endforeach
        <tr style="font-weight:bold;">
            <td colspan="2" class="l" style="padding-left:4px;">Total {{ $otherCls }}</td>
            <td class="r">{!! $pesoA($sumCol($otherGroup,'past_total')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($otherGroup,'current_sem1')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($otherGroup,'current_sem2')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($otherGroup,'current_total')) !!}</td>
            <td class="r">{!! $pesoA($sumCol($otherGroup,'proposed')) !!}</td>
        </tr>
        @endforeach
        @endif

        {{-- ════════════════════════════════════════════════════════════════
             5. BUDGETARY & STATUTORY REQUIREMENTS
                (special-account departments only)
                Shows:
                  • 5% LDRRMF Fund (parent line)
                      – 70% Pre-Disaster Preparedness Activities
                      – 30% Quick Response Fund (QRF)
                  Sub-total for Budgetary & Statutory Requirements
        ════════════════════════════════════════════════════════════════ --}}
        @if($isSpecial && count($ldrrmfRows) > 0)
        <tr style="background:#fff;">
            <td colspan="7" style="font-weight:bold; padding:2px 4px;">
                Budgetary &amp; Statutory Requirements
            </td>
        </tr>

        {{-- 5% LDRRMF parent line --}}
        @if($ldrrmf5Row)
        <tr>
            <td class="l" style="padding-left:10px; font-style:italic;">
                5% Local Disaster Risk Reduction &amp; Mgmt. Fund (LDRRMF)
            </td>
            <td class="c">{{ $ldrrmf5Row['account_code'] ?? '5-02' }}</td>
            <td class="r">{!! $ldrrmf5Row['past_total']    > 0 ? $num($ldrrmf5Row['past_total'])    : '' !!}</td>
            <td class="r">{!! $ldrrmf5Row['current_sem1']  > 0 ? $num($ldrrmf5Row['current_sem1'])  : '' !!}</td>
            <td class="r">{!! $ldrrmf5Row['current_sem2']  > 0 ? $num($ldrrmf5Row['current_sem2'])  : '' !!}</td>
            <td class="r">{!! $ldrrmf5Row['current_total'] > 0 ? $num($ldrrmf5Row['current_total']) : '' !!}</td>
            <td class="r">{!! $ldrrmf5Row['proposed']      > 0 ? $num($ldrrmf5Row['proposed'])      : '' !!}</td>
        </tr>
        @endif

        {{-- 70% Pre-Disaster (indented under LDRRMF) --}}
        @if($ldrrmf70Row)
        <tr>
            <td class="l" style="padding-left:22px;">
                70% Pre-Disaster Preparedness Activities (JMC2013-1, RA 10121)
            </td>
            <td class="c">{{ $ldrrmf70Row['account_code'] ?? '5-02' }}</td>
            <td class="r">{!! $ldrrmf70Row['past_total']    > 0 ? $num($ldrrmf70Row['past_total'])    : '' !!}</td>
            <td class="r">{!! $ldrrmf70Row['current_sem1']  > 0 ? $num($ldrrmf70Row['current_sem1'])  : '' !!}</td>
            <td class="r">{!! $ldrrmf70Row['current_sem2']  > 0 ? $num($ldrrmf70Row['current_sem2'])  : '' !!}</td>
            <td class="r">{!! $ldrrmf70Row['current_total'] > 0 ? $num($ldrrmf70Row['current_total']) : '' !!}</td>
            <td class="r">{!! $ldrrmf70Row['proposed']      > 0 ? $num($ldrrmf70Row['proposed'])      : '' !!}</td>
        </tr>
        @endif

        {{-- 30% QRF (indented under LDRRMF) --}}
        @if($ldrrmfQrfRow)
        <tr>
            <td class="l" style="padding-left:22px;">
                Quick Response Fund, (QRF) &mdash; 30%
            </td>
            <td class="c">{{ $ldrrmfQrfRow['account_code'] ?? '5-02' }}</td>
            <td class="r">{!! $ldrrmfQrfRow['past_total']    > 0 ? $num($ldrrmfQrfRow['past_total'])    : '' !!}</td>
            <td class="r">{!! $ldrrmfQrfRow['current_sem1']  > 0 ? $num($ldrrmfQrfRow['current_sem1'])  : '' !!}</td>
            <td class="r">{!! $ldrrmfQrfRow['current_sem2']  > 0 ? $num($ldrrmfQrfRow['current_sem2'])  : '' !!}</td>
            <td class="r">{!! $ldrrmfQrfRow['current_total'] > 0 ? $num($ldrrmfQrfRow['current_total']) : '' !!}</td>
            <td class="r">{!! $ldrrmfQrfRow['proposed']      > 0 ? $num($ldrrmfQrfRow['proposed'])      : '' !!}</td>
        </tr>
        @endif

        {{-- Sub-total row --}}
        <tr style="font-weight:bold;">
            <td colspan="2" class="l" style="padding-left:4px;">Total Budgetary &amp; Statutory Requirements</td>
            <td class="r">{!! $pesoA($ldrrmfTotal['past_total']) !!}</td>
            <td class="r">{!! $pesoA($ldrrmfTotal['current_sem1']) !!}</td>
            <td class="r">{!! $pesoA($ldrrmfTotal['current_sem2']) !!}</td>
            <td class="r">{!! $pesoA($ldrrmfTotal['current_total']) !!}</td>
            <td class="r">{!! $pesoA($ldrrmfTotal['proposed']) !!}</td>
        </tr>
        @endif

        {{-- ════════════════════════════════════════════════════════════════
             Empty-data notice
        ════════════════════════════════════════════════════════════════ --}}
        @if(!$hasAnyData)
        <tr>
            <td colspan="7" class="c" style="padding:4px; font-style:italic; color:#666;">
                No budget data on file for this office.
            </td>
        </tr>
        @endif

        {{-- ════════════════════════════════════════════════════════════════
             GRAND TOTAL
        ════════════════════════════════════════════════════════════════ --}}
        <tr style="font-weight:bold; background:#fff;">
            <td colspan="2" class="l" style="padding:2px 4px; font-size:7pt;">
                Total Appropriations For<br/>{{ $deptName }}
            </td>
            <td class="r">{!! $pesoA($grandPast) !!}</td>
            <td class="r">{!! $pesoA($grandSem1) !!}</td>
            <td class="r">{!! $pesoA($grandSem2) !!}</td>
            <td class="r">{!! $pesoA($grandCurrent) !!}</td>
            <td class="r">{!! $pesoA($grandProp) !!}</td>
        </tr>

        </tbody>
    </table>

    {{-- ── SPECIAL PROVISION (flush, no top border) ── --}}
    <div style="font-size:6pt; border-top:none; padding:4px 6px;">
        <div style="font-weight:bold; font-size:6.5pt; margin-bottom:2px;">Special Provision:</div>
        <div style="margin-bottom:1px; line-height:1.4;">Use and release of Municipal Government Funds:</div>
        <div style="margin-bottom:1px; line-height:1.4; text-align:justify;">1. To procure materials for infrastructure projects, goods and consulting services as well as commonly used items, not in conformity w/ the provision of RA 9184 &amp; its implementing rules &amp; regulations, as defined by the Government Procurement Policy Board (GPPB);</div>
        <div style="margin-bottom:1px; line-height:1.4; text-align:justify;">2. To pay honoraria, allowance or other forms of compensation to any government official or employee, except those specifically authorized by law, executive order, memorandum or ordinance;</div>
        <div style="margin-bottom:1px; line-height:1.4; text-align:justify;">3. To invest in non-government securities, money market placements and similar investments or deposit in any private banking institutions;</div>
        <div style="margin-bottom:1px; line-height:1.4; text-align:justify;">4. No public money shall be appropriated or applied for the benefit of any religious sector or any activity nor undertaking or purposes which are private in character; and,</div>
        <div style="line-height:1.4; text-align:justify;">5. No money shall be paid for entertainment or reception of for the visiting foreign government dignitaries or foreign mission, except for the representation allowances as authorized by law.</div>
    </div>

</div>{{-- /page wrapper --}}

@endforeach
