{{--
    resources/views/reports/lep/lep_form6.blade.php
    ─────────────────────────────────────────────────────────────────────────
    STATEMENT OF STATUTORY AND CONTRACTUAL OBLIGATIONS AND BUDGETARY
    REQUIREMENTS  —  Local Expenditure Program version

    Differences from ABP Form 6 (budget_forms_unified.blade.php):
      • No signatories / "Certified Correct" block
      • Rendered via lepreport.blade.php using report_type = 'lep_form6'

    Variables expected (passed from lepreport.blade.php):
      $data  array  {
          year   int
          lgu    string
          forms  array of {
              label        string
              source       string
              is_special   bool
              rows         array   (Form6Template rows, same shape as ABP)
              grand_total  float
          }
      }
--}}

@php
$year   = $data['year'];
$lgu    = $data['lgu'];
$forms6 = $data['forms'];

$pesoSign = '<span style="font-family:\'DejaVu Sans\',sans-serif;">&#x20B1;&nbsp;</span>';

// Always show peso sign
$pa = fn($n) => $pesoSign . number_format((float)$n, 0);

// Show peso sign only when non-zero; blank otherwise
$pf = function($n) use ($pesoSign): string {
    if ((float)$n == 0) return '';
    return $pesoSign . number_format((float)$n, 0);
};

// Number only — blank when zero, '0' when explicitly zero-valued non-section row
$nf = fn($n): string => (float)$n == 0 ? '0' : number_format((float)$n, 0);
@endphp

@foreach($forms6 as $form6)
@php
$rows       = $form6['rows'];
$grandTotal = $form6['grand_total'];
$isSpecial  = $form6['is_special'];
$label      = $form6['label'];

// Build children map and keyBy-code map (same logic as ABP Form 6)
$rowsByCode = collect($rows)->keyBy('code');
$childrenOf = [];
foreach ($rows as $r) {
    if ($r['parent_code']) {
        $childrenOf[$r['parent_code']][] = $r;
    }
}

// Recursive amount resolver: computed rows = sum of children, else raw amount
$computed = [];
$computeAmount = function(array $r) use (&$computed, &$computeAmount, $rowsByCode, $childrenOf): float {
    if (isset($computed[$r['code']])) return $computed[$r['code']];
    if ($r['is_computed']) {
        $children = $childrenOf[$r['code']] ?? [];
        $sum = 0.0;
        foreach ($children as $child) {
            $childRow = $rowsByCode->get($child['code']);
            if ($childRow) $sum += $computeAmount($childRow);
        }
        $computed[$r['code']] = $sum > 0 ? $sum : (float) $r['amount'];
        return $computed[$r['code']];
    }
    $computed[$r['code']] = (float) $r['amount'];
    return $computed[$r['code']];
};
foreach ($rows as $r) { $computeAmount($r); }
@endphp

{{-- Each fund source gets its own page --}}
<div class="page" style="page-break-after: always; break-after: page;">

    <div style="font-size:7.5pt; font-weight:bold; text-align:center; margin-bottom:1px;">
        STATEMENT OF STATUTORY AND CONTRACTUAL OBLIGATIONS AND BUDGETARY REQUIREMENTS
    </div>
    <div style="font-size:7pt; text-align:center; margin-bottom:1px;">LGU : {{ $lgu }}</div>
    <div style="font-size:7pt; text-align:center; margin-bottom:6px; font-weight:bold;">
        @if($isSpecial)
            Special Account: {{ $label }}, CY {{ $year }}
        @else
            General Fund, CY {{ $year }}
        @endif
    </div>

    {{--
        Table:
          outer shell  → left + right + top border (bottom closed by tfoot)
          col 1 td     → right border = center divider
          col 2 td     → no extra border
    --}}
    <table style="width:100%; border-collapse:collapse; font-size:6.5pt;
                  border-left:1px solid #000; border-right:1px solid #000;
                  border-top:1px solid #000; border-bottom:none;">
        <thead>
            <tr>
                <th style="text-align:center; width:55%;
                           border-left:none; border-top:none;
                           border-right:1px solid #000; border-bottom:1px solid #000;
                           padding:2px 4px;">
                    Object of Expenditures
                </th>
                <th style="text-align:center; width:45%;
                           border-left:none; border-top:none;
                           border-right:none; border-bottom:1px solid #000;
                           padding:2px 4px;">
                    Amount
                </th>
            </tr>
            <tr>
                <td style="text-align:center; font-size:6pt;
                           border-left:none; border-top:none;
                           border-right:1px solid #000; border-bottom:1px solid #000;
                           padding:1px 4px;">(1)</td>
                <td style="text-align:center; font-size:6pt;
                           border-left:none; border-top:none;
                           border-right:none; border-bottom:1px solid #000;
                           padding:1px 4px;">(2)</td>
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
            $rowLabel   = $row['label'];

            // Indent: level 0 = no indent, level 1 = 1 unit, level 2 = 2 units, etc.
            $indent = str_repeat('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;', max(0, $level + 1));

            if ($isSection) {
                $displayAmt = '';
            } elseif ($showPeso) {
                $displayAmt = $pf($amount);
                if ($displayAmt === '') $displayAmt = $pesoSign . ' - ';
            } else {
                $displayAmt = $nf($amount);
            }

            // Shared cell border styles
            $tdL = 'border-top:none; border-bottom:none; border-left:none; border-right:1px solid #000;';
            $tdR = 'border-top:none; border-bottom:none; border-left:none; border-right:none;';
        @endphp

        @if($isSection)
        {{-- Section header row: bold label, no amount --}}
        <tr>
            <td style="{{ $tdL }} font-weight:bold; padding:1.5px 3px; line-height:1.2;">
                {!! $indent !!}{{ $rowLabel }}
            </td>
            <td style="{{ $tdR }} padding:1.5px 3px;"></td>
        </tr>

        @elseif($level === 0)
        {{-- Level-0 computed/subtotal row: bold --}}
        <tr>
            <td style="{{ $tdL }} font-weight:bold; padding:1.5px 3px; line-height:1.2;">
                {!! $indent !!}{{ $rowLabel }}
            </td>
            <td style="{{ $tdR }} text-align:right; font-weight:bold; padding:1.5px 3px;">
                {!! $displayAmt !!}
            </td>
        </tr>

        @elseif($level === 1 && !isset($childrenOf[$code]))
        {{-- Level-1 leaf row: code prefix + label --}}
        <tr>
            <td style="{{ $tdL }} padding:1.5px 3px; line-height:1.2;">
                {!! $indent !!}<span style="display:inline-block; width:20pt; line-height:1; vertical-align:baseline;">{{ $code }}</span><span style="vertical-align:baseline;">{{ $rowLabel }}</span>
            </td>
            <td style="{{ $tdR }} text-align:right; padding:1.5px 3px;">{!! $displayAmt !!}</td>
        </tr>

        @elseif($level === 1 && isset($childrenOf[$code]))
        {{-- Level-1 parent (has children): bold label --}}
        <tr>
            <td style="{{ $tdL }} font-weight:bold; padding:1.5px 3px; line-height:1.2;">
                {!! $indent !!}{{ $rowLabel }}
            </td>
            <td style="{{ $tdR }} text-align:right; font-weight:bold; padding:1.5px 3px;">
                {!! $displayAmt !!}
            </td>
        </tr>

        @elseif($level === 2)
        {{-- Level-2 leaf: wider code prefix --}}
        <tr>
            <td style="{{ $tdL }} padding:1.5px 3px; line-height:1.2;">
                {!! $indent !!}<span style="display:inline-block; width:24pt; line-height:1; vertical-align:baseline;">{{ $code }}</span><span style="vertical-align:baseline;">{{ $rowLabel }}</span>
            </td>
            <td style="{{ $tdR }} text-align:right; padding:1.5px 3px;">{!! $displayAmt !!}</td>
        </tr>

        @else
        {{-- Deeper / fallback --}}
        <tr>
            <td style="{{ $tdL }} padding:1.5px 3px; line-height:1.2;">{!! $indent !!}{{ $rowLabel }}</td>
            <td style="{{ $tdR }} text-align:right; padding:1.5px 3px;">{!! $displayAmt !!}</td>
        </tr>
        @endif

        @endforeach

        </tbody>
        <tfoot>
            <tr>
                <td style="font-weight:bold; border-top:2px solid #000; border-bottom:1px solid #000;
                           border-left:none; border-right:1px solid #000;
                           padding:2px 4px; text-align:right;">
                    Total
                </td>
                <td style="border-top:2px solid #000; border-bottom:1px solid #000;
                           border-left:none; border-right:none;
                           text-align:right; padding:2px 4px;">
                    {!! $pa($grandTotal) !!}
                </td>
            </tr>
        </tfoot>
    </table>

    {{-- ── No signatories block in LEP version ── --}}

</div>{{-- .page --}}
@endforeach
